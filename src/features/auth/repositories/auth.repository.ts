import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions, roles, rolePermissions, permissions, userPermissions } from "@/db/schema";

/**
 * Find a user by their email address, including their role details
 */
export const findUserByEmail = async (email: string) => {
  return await db
    .select({
      user: users,
      role: roles,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .get();
};

/**
 * Create a new session record in the database
 */
export const createSession = async (params: {
  id: string;
  userId: string;
  expiresAt: number;
  userAgent: string | null;
  ipAddress: string | null;
}) => {
  return await db.insert(sessions).values({
    id: params.id,
    userId: params.userId,
    expiresAt: params.expiresAt,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
  });
};

/**
 * Invalidate/Delete a session record from the database
 */
export const deleteSession = async (sessionId: string) => {
  return await db.delete(sessions).where(eq(sessions.id, sessionId));
};

/**
 * Find an active session record by its token ID, joining user and role
 */
export const findSessionWithUserAndRole = async (sessionId: string) => {
  return await db
    .select({
      session: sessions,
      user: users,
      role: roles,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(
      and(
        eq(sessions.id, sessionId),
        isNull(users.deletedAt)
      )
    )
    .get();
};

/**
 * Retrieve all permission codes linked to a specific role
 */
export const getRolePermissions = async (roleId: number) => {
  return await db
    .select({
      code: permissions.code,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId))
    .all();
};

/**
 * Retrieve direct permission overrides for a user (grant allow or deny)
 */
export const getUserPermissionOverrides = async (userId: string) => {
  return await db
    .select({
      code: permissions.code,
      type: userPermissions.type,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId))
    .all();
};
