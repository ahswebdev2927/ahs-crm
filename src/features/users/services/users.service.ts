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
    await checkPermission("team:view");
    return await UsersRepository.findUsers(params);
  }

  /**
   * Retrieves a single team member by ID
   */
  static async getTeamMember(id: string) {
    await checkPermission("team:view");
    const user = await UsersRepository.findUserById(id);
    if (!user) {
      throw new AppError("Team member not found.", 404, "NOT_FOUND");
    }
    return user;
  }

  /**
   * Creates a new team member
   */
  static async createTeamMember(input: CreateUserInput) {
    const actor = await checkPermission("team:edit");

    // 1. Verify email uniqueness
    const existing = await UsersRepository.findUserByEmail(input.email);
    if (existing) {
      throw new AppError("A user with this email address already exists.", 409, "CONFLICT");
    }

    // 2. Validate Manager vs Non-Manager rules
    const rolesList = await UsersRepository.getRoles();
    const targetRole = rolesList.find((r) => r.id === input.roleId);
    const isManagerRole = Boolean(targetRole?.isManager || targetRole?.code === "sales_manager");

    if (isManagerRole && (!input.teamName || input.teamName.trim() === "")) {
      throw new AppError("Team Name is required when creating a Manager account.", 400, "BAD_REQUEST");
    }

    if (!isManagerRole && (!input.managerId || input.managerId.trim() === "")) {
      throw new AppError("Selecting an assigned Manager is required when creating a non-manager team member.", 400, "BAD_REQUEST");
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
      teamId: input.teamId,
      managerId: input.managerId,
      teamName: input.teamName,
      dataVisibility: input.dataVisibility,
      status: "active",
    });

    // 4. Set custom permissions if provided
    if (input.permissions && input.permissions.length > 0) {
      await UsersRepository.setUserPermissions(newUserId, input.permissions);
    }

    // 5. Audit Log Entry
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
        managerId: input.managerId,
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
   * Updates an existing team member profile, role, department, or visibility
   */
  static async updateTeamMember(id: string, input: UpdateUserInput) {
    const actor = await checkPermission("team:edit");

    const user = await UsersRepository.findUserById(id);
    if (!user) {
      throw new AppError("Team member not found.", 404, "NOT_FOUND");
    }

    // If email is changing, verify uniqueness
    if (input.email && input.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await UsersRepository.findUserByEmail(input.email);
      if (existing) {
        throw new AppError("A user with this email address already exists.", 409, "CONFLICT");
      }
    }

    // Update main user record
    await UsersRepository.updateUser(id, {
      name: input.name,
      email: input.email,
      roleId: input.roleId,
      departmentId: input.departmentId,
      teamId: input.teamId,
      managerId: input.managerId,
      dataVisibility: input.dataVisibility,
    });

    // Update custom permission overrides if provided
    if (input.permissions !== undefined) {
      await UsersRepository.setUserPermissions(id, input.permissions);
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
        roleId: user.roleId,
        departmentId: user.departmentId,
        teamId: user.teamId,
        managerId: user.managerId,
        dataVisibility: user.dataVisibility,
      }),
      newData: JSON.stringify(input),
    });

    logger.info({ actorId: actor.id, targetUserId: id }, `Team member profile updated: ${id}`);

    return await UsersRepository.findUserById(id);
  }

  /**
   * Direct password reset executed by SuperAdmin
   */
  static async resetMemberPassword(id: string, input: ResetUserPasswordInput) {
    const actor = await checkPermission("team:edit");

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
    await checkPermission("team:view");

    const [departmentsList, rolesList, permissionsList, managersList] = await Promise.all([
      UsersRepository.getDepartments(),
      UsersRepository.getRoles(),
      UsersRepository.getPermissions(),
      UsersRepository.getAvailableManagers(),
    ]);

    return {
      departments: departmentsList,
      roles: rolesList,
      permissions: permissionsList,
      managers: managersList,
    };
  }
}
