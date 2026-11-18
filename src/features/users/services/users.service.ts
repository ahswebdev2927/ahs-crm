import crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { AppError } from "@/lib/errors/AppError";
import { logger } from "@/lib/logger";
import { recordAuditLog } from "@/features/audit/services/audit.service";
import { checkPermission, requireAuth } from "@/features/auth/services/authorization.service";
import { BCRYPT_SALT_ROUNDS } from "@/features/auth/services/auth.service";
import {
  findUsers,
  findUserById,
  findUserByEmail,
  getRoles,
  getAvailableManagers,
  createUser,
  setUserPermissions,
  updateUser,
  updatePassword,
  countSuperAdmins,
  updateUserStatus,
  getDepartments,
  getPermissions,
} from "../repositories/users.repository";
import type {
  CreateUserInput,
  UpdateUserInput,
  ResetUserPasswordInput,
  UpdateUserStatusInput,
  UserQueryInput,
} from "../schemas/user.schema";

/**
 * Lists team members with permissions and visibility checks
 */
export const listTeamMembers = async (params: UserQueryInput) => {
  const actor = await checkPermission("team:view");
  return await findUsers({
    ...params,
    actorRoleCode: actor.role.code,
    actorTeamId: actor.teamId,
    actorUserId: actor.id,
  });
};

/**
 * Retrieves a single team member by ID
 */
export const getTeamMember = async (id: string) => {
  const actor = await checkPermission("team:view");
  const targetUser = await findUserById(id);
  if (!targetUser) {
    throw new AppError("Team member not found.", 404, "NOT_FOUND");
  }

  // Role-based visibility enforcement for non-SuperAdmins
  if (actor.role.code !== "super_admin") {
    if (targetUser.roleCode === "super_admin") {
      throw new AppError("Access denied. SuperAdmin profiles are restricted.", 403, "FORBIDDEN");
    }
    const isSelf = targetUser.id === actor.id;
    const isSameTeam = actor.teamId && targetUser.teamId === actor.teamId;
    const isDirectReport = targetUser.managerId === actor.id;

    if (!isSelf && !isSameTeam && !isDirectReport) {
      throw new AppError("Access denied. You can only view members of your assigned team.", 403, "FORBIDDEN");
    }
  }

  return targetUser;
};

/**
 * Creates a new team member
 */
export const createTeamMember = async (input: CreateUserInput) => {
  const actor = await checkPermission("team:edit");
  if (actor.role.code !== "super_admin") {
    throw new AppError("Access denied. Only SuperAdmin can create team members.", 403, "FORBIDDEN");
  }

  // 1. Verify email uniqueness
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AppError("A user with this email address already exists.", 409, "CONFLICT");
  }

  // 2. Validate Manager vs Non-Manager vs SuperAdmin rules
  const rolesList = await getRoles();
  const targetRole = rolesList.find((r) => r.id === input.roleId);
  const isSuperAdminRole = targetRole?.code === "super_admin";
  const isManagerRole = Boolean(targetRole?.isManager || targetRole?.code === "sales_manager");

  let effectiveTeamName = input.teamName;
  let effectiveManagerId = input.managerId;
  let effectiveDataVisibility = input.dataVisibility;

  if (isSuperAdminRole) {
    // SuperAdmin is MD at top of org: never reports to anyone and has all data access
    effectiveTeamName = undefined;
    effectiveManagerId = null;
    effectiveDataVisibility = "all";
  } else if (isManagerRole) {
    effectiveTeamName = input.teamName && input.teamName.trim() ? input.teamName.trim() : `${input.name}'s Team`;
    effectiveManagerId = null;
  } else {
    if (!effectiveManagerId || effectiveManagerId.trim() === "") {
      const availableManagers = await getAvailableManagers(input.departmentId ?? undefined);
      if (availableManagers.length > 0) {
        effectiveManagerId = availableManagers[0].id;
      } else {
        throw new AppError("Selecting an assigned Manager is required when creating a team member.", 400, "BAD_REQUEST");
      }
    }
  }

  // 3. Hash initial password
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  const newUserId = `user-${crypto.randomUUID()}`;

  // 4. Create user
  const newUser = await createUser({
    id: newUserId,
    name: input.name,
    email: input.email,
    passwordHash,
    roleId: input.roleId,
    departmentId: input.departmentId,
    teamId: isSuperAdminRole ? null : input.teamId,
    managerId: effectiveManagerId,
    teamName: effectiveTeamName,
    dataVisibility: effectiveDataVisibility,
    status: "active",
  });

  // 5. Set custom permissions if provided
  if (input.permissions && input.permissions.length > 0) {
    await setUserPermissions(newUserId, input.permissions);
  }

  // 6. Record immutable audit log
  recordAuditLog({
    userId: actor.id,
    action: "user:created",
    entityType: "user",
    entityId: newUserId,
    newData: {
      name: input.name,
      email: input.email,
      roleId: input.roleId,
      departmentId: input.departmentId,
      teamId: input.teamId,
      managerId: effectiveManagerId,
      dataVisibility: input.dataVisibility,
    },
  }).catch(() => {});

  logger.info(
    { actorId: actor.id, newUserId, email: input.email },
    `Team member created: ${input.name} (${input.email})`
  );

  return await findUserById(newUserId);
};

/**
 * Updates an existing team member profile, role, department, visibility, or status
 */
export const updateTeamMember = async (id: string, input: UpdateUserInput) => {
  const actor = await checkPermission("team:edit");

  const user = await findUserById(id);
  if (!user) {
    throw new AppError("Team member not found.", 404, "NOT_FOUND");
  }

  if (actor.role.code !== "super_admin") {
    // 1. Cannot modify self
    if (user.id === actor.id) {
      throw new AppError("Access denied. You cannot modify your own account status or visibility.", 403, "FORBIDDEN");
    }

    // 2. Must belong to actor's team
    const isSameTeam = actor.teamId && user.teamId === actor.teamId;
    const isManagedByUser = user.managerId === actor.id;
    if (!isSameTeam && !isManagedByUser) {
      throw new AppError("Access denied. You can only manage members of your assigned team.", 403, "FORBIDDEN");
    }

    // 3. Cannot modify SuperAdmin
    if (user.roleCode === "super_admin") {
      throw new AppError("Access denied. SuperAdmin accounts are restricted.", 403, "FORBIDDEN");
    }

    // 4. Data visibility restriction: team, shared, own (NOT 'all')
    if (input.dataVisibility === "all") {
      throw new AppError("Access denied. Managers cannot assign 'All' organization-wide data access.", 400, "BAD_REQUEST");
    }

    // 5. Status restriction: active, inactive (NOT 'suspended')
    if ((input as any).status === "suspended") {
      throw new AppError("Access denied. Managers cannot suspend accounts. Allowed status: Active or Inactive.", 400, "BAD_REQUEST");
    }

    // Update allowed fields only
    await updateUser(id, {
      dataVisibility: input.dataVisibility || user.dataVisibility,
      status: (input as any).status || user.status,
    });
  } else {
    // SuperAdmin full update logic
    if (input.email && input.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await findUserByEmail(input.email);
      if (existing && existing.id !== id) {
        throw new AppError("A user with this email address already exists.", 409, "CONFLICT");
      }
    }

    const rolesList = await getRoles();
    const targetRoleId = input.roleId ?? user.roleId;
    const targetRole = rolesList.find((r) => r.id === targetRoleId);
    const isSuperAdminRole = targetRole?.code === "super_admin";
    const isManagerRole = Boolean(targetRole?.isManager || targetRole?.code === "sales_manager");

    let effectiveManagerId = input.managerId;
    let effectiveTeamName = input.teamName;
    let effectiveDataVisibility = input.dataVisibility;

    if (isSuperAdminRole) {
      // SuperAdmin is MD: no manager, no team group, all data visibility
      effectiveManagerId = null;
      effectiveTeamName = undefined;
      effectiveDataVisibility = "all";
    } else if (isManagerRole) {
      effectiveManagerId = null;
    }

    await updateUser(id, {
      name: input.name,
      email: input.email,
      roleId: input.roleId,
      departmentId: input.departmentId,
      teamId: isSuperAdminRole ? null : input.teamId,
      managerId: effectiveManagerId,
      teamName: effectiveTeamName,
      dataVisibility: effectiveDataVisibility,
      status: (input as any).status,
    });

    if (input.permissions !== undefined) {
      await setUserPermissions(id, input.permissions);

      recordAuditLog({
        userId: actor.id,
        action: "user:permissions_changed",
        entityType: "user",
        entityId: id,
        newData: { permissions: input.permissions },
      }).catch(() => {});
    }
  }

  // Record immutable audit log
  recordAuditLog({
    userId: actor.id,
    action: "user:updated",
    entityType: "user",
    entityId: id,
    oldData: {
      name: user.name,
      email: user.email,
      dataVisibility: user.dataVisibility,
      status: user.status,
    },
    newData: input,
  }).catch(() => {});

  logger.info({ actorId: actor.id, targetUserId: id }, `Team member updated by manager/admin: ${id}`);

  return await findUserById(id);
};

/**
 * Direct password reset executed by SuperAdmin
 */
export const resetMemberPassword = async (id: string, input: ResetUserPasswordInput) => {
  const actor = await checkPermission("team:edit");
  if (actor.role.code !== "super_admin") {
    throw new AppError("Access denied. Only SuperAdmin can reset passwords.", 403, "FORBIDDEN");
  }

  const user = await findUserById(id);
  if (!user) {
    throw new AppError("Team member not found.", 404, "NOT_FOUND");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  await updatePassword(id, passwordHash);

  // Record immutable audit log
  recordAuditLog({
    userId: actor.id,
    action: "user:password_reset",
    entityType: "user",
    entityId: id,
  }).catch(() => {});

  logger.info(
    { actorId: actor.id, targetUserId: id },
    `Password reset performed by SuperAdmin for user ${id}`
  );

  return { success: true, message: "Password updated successfully." };
};

/**
 * Changes member status ('active', 'inactive', 'suspended')
 */
export const changeMemberStatus = async (id: string, input: UpdateUserStatusInput) => {
  const actor = await checkPermission("team:edit");

  const user = await findUserById(id);
  if (!user) {
    throw new AppError("Team member not found.", 404, "NOT_FOUND");
  }

  if (actor.role.code !== "super_admin") {
    // 1. Cannot modify self
    if (actor.id === id) {
      throw new AppError("Access denied. You cannot modify your own account status.", 403, "FORBIDDEN");
    }

    // 2. Must belong to actor's team
    const isSameTeam = actor.teamId && user.teamId === actor.teamId;
    const isManagedByUser = user.managerId === actor.id;
    if (!isSameTeam && !isManagedByUser) {
      throw new AppError("Access denied. You can only manage members of your assigned team.", 403, "FORBIDDEN");
    }

    // 3. Status restriction: ONLY active or inactive
    if (input.status === "suspended") {
      throw new AppError("Access denied. Managers cannot suspend accounts. Allowed status: Active or Inactive.", 400, "BAD_REQUEST");
    }
  } else {
    // Prevent deactivating / suspending self
    if (actor.id === id && input.status !== "active") {
      throw new AppError(
        "You cannot deactivate or suspend your own active session account.",
        400,
        "BAD_REQUEST"
      );
    }

    // Prevent deactivating / suspending the last SuperAdmin
    if (user.roleCode === "super_admin" && input.status !== "active") {
      const activeSuperAdminCount = await countSuperAdmins();
      if (activeSuperAdminCount <= 1) {
        throw new AppError(
          "Cannot deactivate or suspend the last active SuperAdmin account.",
          400,
          "BAD_REQUEST"
        );
      }
    }
  }

  await updateUserStatus(id, input.status);

  // Record immutable audit log
  recordAuditLog({
    userId: actor.id,
    action: "user:status_changed",
    entityType: "user",
    entityId: id,
    oldData: { status: user.status },
    newData: { status: input.status },
  }).catch(() => {});

  logger.info(
    { actorId: actor.id, targetUserId: id, newStatus: input.status },
    `User ${id} status changed from ${user.status} to ${input.status}`
  );

  return await findUserById(id);
};

/**
 * Fetches metadata for dropdowns (departments, roles, permissions, managers)
 */
export const listDepartmentsAndRoles = async () => {
  const actor = await checkPermission("team:view");

  const [departmentsList, rolesList, permissionsList, managersList] = await Promise.all([
    getDepartments(),
    getRoles(),
    getPermissions(),
    getAvailableManagers(),
  ]);

  let filteredRoles = rolesList;
  if (actor.role.code !== "super_admin") {
    filteredRoles = rolesList.filter((r) => {
      // Exclude SuperAdmin and Admin roles from non-SuperAdmin views
      if (r.code === "super_admin" || r.code?.includes("admin")) return false;

      // Restrict to actor's department if defined
      if (actor.departmentId && r.departmentId) {
        return r.departmentId === actor.departmentId;
      }
      return true;
    });
  }

  return {
    departments: departmentsList,
    roles: filteredRoles,
    permissions: permissionsList,
    managers: managersList,
  };
};

/**
 * Functional object for convenient namespaced usage and full backwards compatibility.
 */
export const usersService = {
  listTeamMembers,
  getTeamMember,
  createTeamMember,
  updateTeamMember,
  resetMemberPassword,
  changeMemberStatus,
  listDepartmentsAndRoles,
};

// Backwards-compatible alias for existing imports
export const UsersService = usersService;
