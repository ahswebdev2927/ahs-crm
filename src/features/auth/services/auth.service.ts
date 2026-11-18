import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import {
  findUserByEmail,
  createSession,
  deleteSession,
  deleteSessionsByUserId,
  updateSessionExpiry,
  deleteExpiredSessions,
  findSessionWithUserAndRole,
  getRolePermissions,
  getUserPermissionOverrides,
} from "../repositories/auth.repository";
import { AppError } from "@/lib/errors/AppError";
import { logger, logAuthFailure } from "@/lib/logger";

export const BCRYPT_SALT_ROUNDS = 10;
export const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
export const JWT_ISSUER = "ahs-crm";
export const JWT_AUDIENCE = "ahs-crm-users";

// Pre-computed valid bcrypt hash used to equalize execution time when an email does not exist,
// eliminating email enumeration timing attacks.
const DUMMY_HASH = "$2a$10$O3YIT23rU39e6t7F/OxxKOxrbNW9iznIf8C/0qp5/5RCO.kmgwEOe";

/**
 * Validates and retrieves the JWT signing secret.
 * Enforces a strict minimum of 32 characters in production environments to prevent weak secrets.
 */
export const getJwtSecret = (): string => {
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
  const secret = process.env.JWT_SECRET;

  if (isProduction) {
    if (!secret || secret.length < 32) {
      logger.error(
        "FATAL: JWT_SECRET environment variable is missing or less than 32 characters in production."
      );
      throw new AppError(
        "Internal server authentication configuration error.",
        500,
        "INTERNAL_SERVER_ERROR"
      );
    }
    return secret;
  }

  return secret || "local_development_jwt_access_secret_key_long_enough_32chars";
};

export type AuthenticatedUserPayload = {
  id: string;
  name: string;
  email: string;
  role: {
    code: string;
    name: string;
  };
  permissions: string[];
  teamId?: number | null;
  departmentId?: number | null;
  dataVisibility?: "own" | "shared" | "partnered" | "team" | "all";
};

/**
 * Combines role permissions and direct user permission overrides
 */
const resolvePermissions = async (userId: string, roleId: number): Promise<string[]> => {
  // 1. Fetch role permissions from Repository functions
  const rolePerms = await getRolePermissions(roleId);
  const resolvedPermissions = new Set<string>(rolePerms.map((rp) => rp.code));

  // 2. Fetch direct user overrides (allow or deny) from Repository functions
  const directPerms = await getUserPermissionOverrides(userId);

  directPerms.forEach((dp) => {
    if (dp.type === "allow") {
      resolvedPermissions.add(dp.code);
    } else if (dp.type === "deny") {
      resolvedPermissions.delete(dp.code);
    }
  });

  return Array.from(resolvedPermissions);
};

/**
 * Log in user with email and password
 */
export const login = async (
  email: string,
  password: string,
  userAgent?: string | null,
  ipAddress?: string | null
): Promise<{ user: AuthenticatedUserPayload; token: string; expiresAt: number }> => {
  // Opportunistic cleanup of expired sessions during login
  deleteExpiredSessions().catch(() => {});

  // 1. Locate user via Repository function
  const userRecord = await findUserByEmail(email);

  if (!userRecord) {
    // Constant-time dummy comparison to defeat timing attacks on email enumeration
    await bcrypt.compare(password, DUMMY_HASH);
    logAuthFailure({ email, ip: ipAddress, reason: "Invalid credentials", userAgent });
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  const { user, role } = userRecord;

  // 2. Verify password match
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    logAuthFailure({ email, ip: ipAddress, reason: "Invalid credentials", userAgent });
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  // 3. Verify user status
  if (user.status === "inactive") {
    // Invalidate any lingering active sessions for inactive user
    await deleteSessionsByUserId(user.id).catch(() => {});
    logAuthFailure({ email, ip: ipAddress, reason: "Account inactive", userAgent });
    throw new AppError(
      "Your account is inactive. Please contact administrator.",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  if (user.status === "suspended") {
    // Invalidate any lingering active sessions for suspended user
    await deleteSessionsByUserId(user.id).catch(() => {});
    logAuthFailure({ email, ip: ipAddress, reason: "Account suspended", userAgent });
    throw new AppError(
      "Your account is suspended due to violations.",
      403,
      "ACCOUNT_SUSPENDED"
    );
  }

  // 4. Create database session token via Repository function
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_EXPIRY_MS;

  await createSession({
    id: sessionId,
    userId: user.id,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
    expiresAt,
  });

  // 5. Generate signed JWT session token with pinned HS256 algorithm and standard claims
  const token = jwt.sign(
    {
      sessionId,
      userId: user.id,
      email: user.email,
      role: role.code,
    },
    getJwtSecret(),
    {
      algorithm: "HS256",
      expiresIn: "7d",
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );

  // 6. Retrieve combined permissions list
  const userPermissionsList = await resolvePermissions(user.id, user.roleId);

  logger.info(
    {
      event: "AUTH_SUCCESS",
      userId: user.id,
      email: user.email,
      role: role.code,
      ip: ipAddress || "unknown",
    },
    `User ${user.email} (${user.id}) logged in successfully`
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: {
        code: role.code,
        name: role.name,
      },
      permissions: userPermissionsList,
    },
    token,
    expiresAt,
  };
};

/**
 * Log out user and delete database session
 */
export const logout = async (token: string): Promise<void> => {
  let sessionId: string | null = null;

  try {
    // Verify JWT with pinned algorithm and claims to extract sessionId
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as { sessionId: string };

    sessionId = decoded?.sessionId || null;
  } catch (error) {
    // If verification fails (e.g. token expired), decode gracefully to ensure DB session is purged
    const decoded = jwt.decode(token) as { sessionId?: string } | null;
    sessionId = decoded?.sessionId || null;

    logger.warn(
      {
        event: "LOGOUT_TOKEN_VERIFY_WARNING",
        error: error instanceof Error ? error.message : String(error),
      },
      "Session logout token verification failed; falling back to token decode for session deletion"
    );
  }

  if (sessionId) {
    await deleteSession(sessionId).catch(() => {});
  }

  // Opportunistic cleanup of expired sessions
  deleteExpiredSessions().catch(() => {});
};

/**
 * Verify session token and retrieve user profile metadata.
 * Implements sliding renewal: if the session has passed 50% of its duration,
 * the expiry timestamp is extended in the database.
 */
export const verifySession = async (token: string): Promise<AuthenticatedUserPayload> => {
  let decoded: { sessionId: string; userId: string; email: string; role: string };

  try {
    decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as typeof decoded;
  } catch {
    throw new AppError("Invalid or expired session token.", 401, "SESSION_EXPIRED");
  }

  if (!decoded.sessionId || !decoded.userId) {
    throw new AppError("Malformed session token payload.", 401, "SESSION_EXPIRED");
  }

  const now = Date.now();

  // Query repository function to ensure session is active in DB and user status is normal
  const sessionRecord = await findSessionWithUserAndRole(decoded.sessionId);

  if (!sessionRecord || sessionRecord.session.expiresAt <= now) {
    throw new AppError("Session has expired or is invalid.", 401, "SESSION_EXPIRED");
  }

  const { user, role, session } = sessionRecord;

  // Double check status restrictions
  if (user.status === "inactive") {
    await deleteSessionsByUserId(user.id).catch(() => {});
    throw new AppError(
      "Your account is inactive. Please contact administrator.",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  if (user.status === "suspended") {
    await deleteSessionsByUserId(user.id).catch(() => {});
    throw new AppError(
      "Your account is suspended due to violations.",
      403,
      "ACCOUNT_SUSPENDED"
    );
  }

  // Sliding renewal: extend session if remaining duration is under 50% of total lifetime
  const remainingLifetime = session.expiresAt - now;
  if (remainingLifetime < SESSION_EXPIRY_MS / 2) {
    const newExpiresAt = now + SESSION_EXPIRY_MS;
    await updateSessionExpiry(session.id, newExpiresAt).catch((err) => {
      logger.warn(
        {
          event: "SESSION_RENEWAL_WARNING",
          error: err instanceof Error ? err.message : String(err),
        },
        "Failed to update sliding session expiry"
      );
    });
  }

  // Resolve combined permissions list
  const userPermissionsList = await resolvePermissions(user.id, user.roleId);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    teamId: user.teamId,
    departmentId: user.departmentId,
    dataVisibility: user.dataVisibility,
    role: {
      code: role.code,
      name: role.name,
    },
    permissions: userPermissionsList,
  };
};
