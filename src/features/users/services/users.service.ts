import crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { AppError } from "@/lib/errors/AppError";
import { logger } from "@/lib/logger";
import { checkPermission, requireAuth } from "@/features/auth/services/authorization.service";
import { UsersRepository } from "../repositories/users.repository";
import type {
  CreateUserInput,
  UpdateUserInput,
  ResetUserPasswordInput,
  UpdateUserStatusInput,
  UserQueryInput,
} from "../schemas/user.schema";

export class UsersService {
  /**
   * Lists team members with permissions and visibility checks
   */
  static async listTeamMembers(params: UserQueryInput) {
    const actor = await checkPermission("team:view");
    return await UsersRepository.findUsers({
      ...params,
      actorRoleCode: actor.role.code,
      actorTeamId: actor.teamId,
      actorUserId: actor.id,
    });
  }

  /**
   * Retrieves a single team member by ID
   */
  static async getTeamMember(id: string) {
    const actor = await checkPermission("team:view");
    const targetUser = await UsersRepository.findUserById(id);
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
  }

  /**
   * Creates a new team member
   */
  static async createTeamMember(input: CreateUserInput) {
    const actor = await checkPermission("team:edit");
    if (actor.role.code !== "super_admin") {
      throw new AppError("Access denied. Only SuperAdmin can create team members.", 403, "FORBIDDEN");
    }

    // 1. Verify email uniqueness
    const existing = await UsersRepository.findUserByEmail(input.email);
    if (existing) {
      throw new AppError("A user with this email address already exists.", 409, "CONFLICT");
    }

    // 2. Validate Manager vs Non-Manager vs SuperAdmin rules
    const rolesList = await UsersRepository.getRoles();
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
        const availableManagers = await UsersRepository.getAvailableManagers(input.departmentId ?? undefined);
        if (availableManagers.length > 0) {
          effectiveManagerId = availableManagers[0].id;
        } else {
          throw new AppError("Selecting an assigned Manager is required when creating a team member.", 400, "BAD_REQUEST");
        }
      }
    }

    // 3. Hash initial password
    const passwordHash = await bcrypt.hash(input.password, 10);
    const newUserId = `user-${crypto.randomUUID()}`;

    // 4. Create user
    const newUser = await UsersRepository.createUser({
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
      await UsersRepository.setUserPermissions(newUserId, input.permissions);
    }

    // 6. Audit Log Entry
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: "USER_CREATED",
      entityType: "user",
      entityId: newUserId,
      newData: JSON.stringify({
        name: input.name,
        email: input.email,
        roleId: input.roleId,
        departmentId: input.departmentId,
        teamId: input.teamId,
        managerId: effectiveManagerId,
        dataVisibility: input.dataVisibility,
      }),
    });

    logger.info(
      { actorId: actor.id, newUserId, email: input.email },
      `Team member created: ${input.name} (${input.email})`
    );

    return await UsersRepository.findUserById(newUserId);
  }

  /**
   * Updates an existing team member profile, role, department, visibility, or status
   */
  static async updateTeamMember(id: string, input: UpdateUserInput) {
    const actor = await checkPermission("team:edit");

    const user = await UsersRepository.findUserById(id);
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
      await UsersRepository.updateUser(id, {
        dataVisibility: input.dataVisibility || user.dataVisibility,
        status: (input as any).status || user.status,
      });
    } else {
      // SuperAdmin full update logic
      if (input.email && input.email.toLowerCase() !== user.email.toLowerCase()) {
        const existing = await UsersRepository.findUserByEmail(input.email);
        if (existing && existing.id !== id) {
          throw new AppError("A user with this email address already exists.", 409, "CONFLICT");
        }
      }

      const rolesList = await UsersRepository.getRoles();
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

      await UsersRepository.updateUser(id, {
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
        await UsersRepository.setUserPermissions(id, input.permissions);
      }
    }

    // Audit Log Entry
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: "USER_UPDATED",
      entityType: "user",
      entityId: id,
      oldData: JSON.stringify({
        name: user.name,
        email: user.email,
        dataVisibility: user.dataVisibility,
        status: user.status,
      }),
      newData: JSON.stringify(input),
    });

    logger.info({ actorId: actor.id, targetUserId: id }, `Team member updated by manager/admin: ${id}`);

    return await UsersRepository.findUserById(id);
  }

  /**
   * Direct password reset executed by SuperAdmin
   */
  static async resetMemberPassword(id: string, input: ResetUserPasswordInput) {
    const actor = await checkPermission("team:edit");
    if (actor.role.code !== "super_admin") {
      throw new AppError("Access denied. Only SuperAdmin can reset passwords.", 403, "FORBIDDEN");
    }

    const user = await UsersRepository.findUserById(id);
    if (!user) {
      throw new AppError("Team member not found.", 404, "NOT_FOUND");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    await UsersRepository.updatePassword(id, passwordHash);

    // Audit Log Entry
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: "USER_PASSWORD_RESET",
      entityType: "user",
      entityId: id,
    });

    logger.info(
      { actorId: actor.id, targetUserId: id },
      `Password reset performed by SuperAdmin for user ${id}`
    );

    return { success: true, message: "Password updated successfully." };
  }

  /**
   * Changes member status ('active', 'inactive', 'suspended')
   */
  static async changeMemberStatus(id: string, input: UpdateUserStatusInput) {
    const actor = await checkPermission("team:edit");

    const user = await UsersRepository.findUserById(id);
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
        const activeSuperAdminCount = await UsersRepository.countSuperAdmins();
        if (activeSuperAdminCount <= 1) {
          throw new AppError(
            "Cannot deactivate or suspend the last active SuperAdmin account.",
            400,
            "BAD_REQUEST"
          );
        }
      }
    }

    await UsersRepository.updateUserStatus(id, input.status);

    // Audit Log Entry
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: `USER_STATUS_${input.status.toUpperCase()}`,
      entityType: "user",
      entityId: id,
      oldData: JSON.stringify({ status: user.status }),
      newData: JSON.stringify({ status: input.status }),
    });

    logger.info(
      { actorId: actor.id, targetUserId: id, newStatus: input.status },
      `User ${id} status changed from ${user.status} to ${input.status}`
    );

    return await UsersRepository.findUserById(id);
  }

  /**
   * Fetches metadata for dropdowns (departments, roles, permissions, managers)
   */
  static async listDepartmentsAndRoles() {
    const actor = await checkPermission("team:view");

    const [departmentsList, rolesList, permissionsList, managersList] = await Promise.all([
      UsersRepository.getDepartments(),
      UsersRepository.getRoles(),
      UsersRepository.getPermissions(),
      UsersRepository.getAvailableManagers(),
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
  }
}
