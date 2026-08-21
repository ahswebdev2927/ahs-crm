import { eq, and, or, like, sql, count, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import {
  users,
  roles,
  departments,
  teams,
  permissions,
  userPermissions,
  sessions,
} from "@/db/schema";
import type { UserQueryInput } from "../schemas/user.schema";

export interface UserFilterParams extends UserQueryInput {
  actorRoleCode?: string;
  actorTeamId?: number | null;
  actorUserId?: string;
}

const managerUsers: any = alias(users, "manager_users");

export class UsersRepository {
  /**
   * Finds users matching optional filters with pagination
   */
  static async findUsers(params: UserFilterParams) {
    const {
      search,
      roleId,
      departmentId,
      status,
      page = 1,
      limit = 10,
      actorRoleCode,
      actorTeamId,
      actorUserId,
    } = params;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search && search.trim() !== "") {
      const pattern = `%${search.trim()}%`;
      conditions.push(
        or(
          like(users.name, pattern),
          like(users.email, pattern)
        )
      );
    }

    if (roleId) {
      conditions.push(eq(users.roleId, roleId));
    }

    if (departmentId) {
      conditions.push(eq(users.departmentId, departmentId));
    }

    if (status) {
      conditions.push(eq(users.status, status));
    }

    // Role-based data visibility & team restriction rules
    if (actorRoleCode && actorRoleCode !== "super_admin") {
      // Exclude SuperAdmins from non-SuperAdmin views
      conditions.push(ne(roles.code, "super_admin"));

      // Restrict to actor's team / assigned team members
      if (actorTeamId) {
        conditions.push(
          or(
            eq(users.teamId, actorTeamId),
            eq(users.managerId, actorUserId || ""),
            eq(users.id, actorUserId || "")
          )
        );
      } else if (actorUserId) {
        conditions.push(
          or(
            eq(users.managerId, actorUserId),
            eq(users.id, actorUserId)
          )
        );
      }

      // Exclude other team managers (Sales Manager sees self & their reps, but not other managers)
      if (actorUserId) {
        conditions.push(
          or(
            eq(users.id, actorUserId),
            eq(roles.isManager, false)
          )
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          roleId: users.roleId,
          roleName: roles.name,
          roleCode: roles.code,
          isManager: roles.isManager,
          departmentId: users.departmentId,
          departmentName: departments.name,
          departmentCode: departments.code,
          teamId: users.teamId,
          teamName: teams.name,
          managerId: users.managerId,
          managerName: managerUsers.name,
          dataVisibility: users.dataVisibility,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .leftJoin(teams, eq(users.teamId, teams.id))
        .leftJoin(managerUsers, eq(users.managerId, managerUsers.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(sql`${users.createdAt} DESC`),

      db
        .select({ total: count() })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(whereClause)
        .get(),
    ]);

    const total = totalResult?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Finds a user by ID with role, department, team, manager, and custom user permissions
   */
  static async findUserById(id: string) {
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
        roleName: roles.name,
        roleCode: roles.code,
        isManager: roles.isManager,
        departmentId: users.departmentId,
        departmentName: departments.name,
        departmentCode: departments.code,
        teamId: users.teamId,
        teamName: teams.name,
        managerId: users.managerId,
        managerName: managerUsers.name,
        dataVisibility: users.dataVisibility,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .leftJoin(managerUsers, eq(users.managerId, managerUsers.id))
      .where(eq(users.id, id))
      .get();

    if (!user) return null;

    // Fetch user specific custom permission overrides
    const overrides = await db
      .select({
        permissionId: userPermissions.permissionId,
        permissionCode: permissions.code,
        permissionName: permissions.name,
        type: userPermissions.type,
      })
      .from(userPermissions)
      .leftJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(eq(userPermissions.userId, id));

    return {
      ...user,
      permissionOverrides: overrides,
    };
  }

  /**
   * Finds a user record by email
   */
  static async findUserByEmail(email: string) {
    return await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .get();
  }

  /**
   * Fetches available Managers (users whose role has isManager = true)
   */
  static async getAvailableManagers(departmentId?: number) {
    const conditions = [eq(roles.isManager, true), eq(users.status, "active")];
    if (departmentId) {
      conditions.push(eq(users.departmentId, departmentId));
    }

    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        teamId: users.teamId,
        teamName: teams.name,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(and(...conditions))
      .orderBy(users.name);
  }

  /**
   * Creates a new user record.
   * - If user's role has isManager === true, automatically provisions a team entity for them.
   * - If user's role has isManager === false and managerId is provided, attaches member to manager's team.
   */
  static async createUser(data: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    roleId: number;
    departmentId?: number | null;
    teamId?: number | null;
    managerId?: string | null;
    teamName?: string;
    dataVisibility?: "own" | "shared" | "partnered" | "team" | "all";
    status?: "active" | "inactive" | "suspended";
  }) {
    // 1. Fetch role info to check isManager flag
    const targetRole = await db.select().from(roles).where(eq(roles.id, data.roleId)).get();
    const isManagerRole = Boolean(targetRole?.isManager);

    let assignedTeamId = data.teamId ?? null;
    let assignedManagerId = data.managerId ?? null;

    // If creating a non-manager and managerId was passed, resolve manager's teamId
    if (!isManagerRole && assignedManagerId) {
      const managerUserRecord = await db.select({ teamId: users.teamId }).from(users).where(eq(users.id, assignedManagerId)).get();
      if (managerUserRecord?.teamId) {
        assignedTeamId = managerUserRecord.teamId;
      }
    }

    // 2. Insert user record
    const insertedArray = await db
      .insert(users)
      .values({
        id: data.id,
        name: data.name,
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        roleId: data.roleId,
        departmentId: data.departmentId ?? null,
        teamId: assignedTeamId,
        managerId: assignedManagerId,
        dataVisibility: data.dataVisibility ?? (isManagerRole ? "team" : "own"),
        status: data.status ?? "active",
      })
      .returning();

    const inserted = insertedArray[0];

    // 3. If new member is a Manager, provision an owned team group automatically
    if (isManagerRole) {
      const teamCodeStr = `team_${data.id.substring(0, 8)}`;
      const teamNameStr = data.teamName && data.teamName.trim() ? data.teamName.trim() : `${data.name}'s Team`;

      const newTeamArray = await db
        .insert(teams)
        .values({
          name: teamNameStr,
          code: teamCodeStr,
          departmentId: data.departmentId ?? 1,
          managerId: inserted.id,
        })
        .returning();

      const newTeam = newTeamArray[0];

      // Update manager user with newly created teamId
      await db.update(users).set({ teamId: newTeam.id }).where(eq(users.id, inserted.id));
      inserted.teamId = newTeam.id;
    }

    return inserted;
  }

  /**
   * Updates user record attributes
   */
  static async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      roleId?: number;
      departmentId?: number | null;
      teamId?: number | null;
      managerId?: string | null;
      dataVisibility?: "own" | "shared" | "partnered" | "team" | "all";
      status?: "active" | "inactive" | "suspended";
      updatedAt?: Date;
    }
  ) {
    const updatePayload: Record<string, any> = {
      updatedAt: data.updatedAt ?? new Date(),
    };

    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.email !== undefined) updatePayload.email = data.email.toLowerCase().trim();
    if (data.roleId !== undefined) updatePayload.roleId = data.roleId;
    if (data.departmentId !== undefined) updatePayload.departmentId = data.departmentId;
    if (data.dataVisibility !== undefined) updatePayload.dataVisibility = data.dataVisibility;
    if (data.status !== undefined) updatePayload.status = data.status;

    if (data.managerId !== undefined) {
      updatePayload.managerId = data.managerId;
      if (data.managerId) {
        const mgr = await db.select({ teamId: users.teamId }).from(users).where(eq(users.id, data.managerId)).get();
        if (mgr?.teamId) {
          updatePayload.teamId = mgr.teamId;
        }
      }
    }
    if (data.teamId !== undefined) updatePayload.teamId = data.teamId;

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, id))
      .returning();

    return updated;
  }

  /**
   * Updates a user's password hash
   */
  static async updatePassword(id: string, passwordHash: string) {
    const [updated] = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return updated;
  }

  /**
   * Updates user account status ('active', 'inactive', 'suspended')
   */
  static async updateUserStatus(id: string, status: "active" | "inactive" | "suspended") {
    const [updated] = await db
      .update(users)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    // If account is suspended or deactivated, invalidate active user sessions
    if (status !== "active") {
      await db.delete(sessions).where(eq(sessions.userId, id));
    }

    return updated;
  }

  /**
   * Replaces user custom permission overrides
   */
  static async setUserPermissions(
    userId: string,
    overrides: { permissionId: number; type: "allow" | "deny" }[]
  ) {
    // Delete existing custom permissions for user
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));

    if (overrides.length > 0) {
      await db.insert(userPermissions).values(
        overrides.map((o) => ({
          userId,
          permissionId: o.permissionId,
          type: o.type,
        }))
      );
    }
  }

  /**
   * Fetches all departments
   */
  static async getDepartments() {
    return await db.select().from(departments).orderBy(departments.name);
  }

  /**
   * Fetches all roles
   */
  static async getRoles() {
    return await db.select().from(roles).orderBy(roles.id);
  }

  /**
   * Fetches all system permissions
   */
  static async getPermissions() {
    return await db.select().from(permissions).orderBy(permissions.id);
  }

  /**
   * Counts active SuperAdmins to prevent accidental lockouts
   */
  static async countSuperAdmins() {
    const superAdminRole = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, "super_admin"))
      .get();

    if (!superAdminRole) return 0;

    const result = await db
      .select({ total: count() })
      .from(users)
      .where(
        and(
          eq(users.roleId, superAdminRole.id),
          eq(users.status, "active")
        )
      )
      .get();

    return result?.total ?? 0;
  }
}
