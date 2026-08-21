import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import {
  findUserByEmail,
  createSession,
  deleteSession,
  findSessionWithUserAndRole,
  getRolePermissions,
  getUserPermissionOverrides,
} from "../repositories/auth.repository";
import { AppError } from "@/lib/errors/AppError";
import { logger, logAuthFailure } from "@/lib/logger";

const JWT_SECRET = process.env.JWT_SECRET || "local_development_jwt_access_secret_key_long_enough";
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

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
  // 1. Locate user via Repository function
  const userRecord = await findUserByEmail(email);

  if (!userRecord) {
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
    logAuthFailure({ email, ip: ipAddress, reason: "Account inactive", userAgent });
    throw new AppError("Your account is inactive. Please contact administrator.", 403, "ACCOUNT_INACTIVE");
  }

  if (user.status === "suspended") {
    logAuthFailure({ email, ip: ipAddress, reason: "Account suspended", userAgent });
    throw new AppError("Your account is suspended due to violations.", 403, "ACCOUNT_SUSPENDED");
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

  // 5. Generate signed JWT session token
  const token = jwt.sign(
    {
      sessionId,
      userId: user.id,
      email: user.email,
      role: role.code,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
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
  try {
    // Decode JWT to extract sessionId
    const decoded = jwt.verify(token, JWT_SECRET) as { sessionId: string };
    if (decoded?.sessionId) {
      await deleteSession(decoded.sessionId);
    }
  } catch (error) {
    // If verification fails during logout, log warning safely
    logger.warn(
      {
        event: "LOGOUT_TOKEN_VERIFY_WARNING",
        error: error instanceof Error ? error.message : String(error),
      },
      "Session logout warning: token decode failed"
    );
  }
};


/**
 * Verify session token and retrieve user profile metadata
 */
export const verifySession = async (token: string): Promise<AuthenticatedUserPayload> => {
  let decoded: { sessionId: string; userId: string; email: string; role: string };
  
  try {
    decoded = jwt.verify(token, JWT_SECRET) as typeof decoded;
  } catch (_error) {
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

  const { user, role } = sessionRecord;

  // Double check status restrictions
  if (user.status === "inactive") {
    throw new AppError("Your account is inactive. Please contact administrator.", 403, "ACCOUNT_INACTIVE");
  }

  if (user.status === "suspended") {
    throw new AppError("Your account is suspended due to violations.", 403, "ACCOUNT_SUSPENDED");
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
