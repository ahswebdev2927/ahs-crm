import { eq, and, or, like, sql, count } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  roles,
  departments,
  permissions,
  userPermissions,
  sessions,
} from "@/db/schema";
import type { UserQueryInput } from "../schemas/user.schema";

export interface UserFilterParams extends UserQueryInput {}

export class UsersRepository {
  /**
   * Finds users matching optional filters with pagination
   */
  static async findUsers(params: UserFilterParams) {
    const { search, roleId, departmentId, status, page = 1, limit = 10 } = params;
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
          departmentId: users.departmentId,
          departmentName: departments.name,
          departmentCode: departments.code,
          dataVisibility: users.dataVisibility,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(sql`${users.createdAt} DESC`),

      db
        .select({ total: count() })
        .from(users)
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
   * Finds a user by ID with role, department, and custom user permissions
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
        departmentId: users.departmentId,
        departmentName: departments.name,
        departmentCode: departments.code,
        dataVisibility: users.dataVisibility,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
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
   * Creates a new user record
   */
  static async createUser(data: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    roleId: number;
    departmentId?: number | null;
    dataVisibility?: "own" | "shared" | "partnered" | "team" | "all";
    status?: "active" | "inactive" | "suspended";
  }) {
    const [inserted] = await db
      .insert(users)
      .values({
        id: data.id,
        name: data.name,
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        roleId: data.roleId,
        departmentId: data.departmentId ?? null,
        dataVisibility: data.dataVisibility ?? "own",
        status: data.status ?? "active",
      })
      .returning();

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
      dataVisibility?: "own" | "shared" | "partnered" | "team" | "all";
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
