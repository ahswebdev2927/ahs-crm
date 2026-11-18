import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import {
  login,
  logout,
  verifySession,
  getJwtSecret,
  BCRYPT_SALT_ROUNDS,
  JWT_ISSUER,
  JWT_AUDIENCE,
} from "./auth.service";
import {
  createSession,
  deleteSessionsByUserId,
  deleteExpiredSessions,
  findSessionWithUserAndRole,
} from "../repositories/auth.repository";
import {
  createUser,
  updatePassword,
  updateUserStatus,
  getRoles,
} from "@/features/users/repositories/users.repository";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors/AppError";

describe("Phase 28 — Authentication Security Hardening Unit & Integration Tests", () => {
  it("exports standardized BCRYPT_SALT_ROUNDS of 10", () => {
    assert.strictEqual(BCRYPT_SALT_ROUNDS, 10);
  });

  describe("getJwtSecret()", () => {
    it("returns a valid secret in non-production environments", () => {
      const originalAppEnv = process.env.APP_ENV;
      const originalNodeEnv = process.env.NODE_ENV;
      const env = process.env as Record<string, string | undefined>;
      try {
        delete env.APP_ENV;
        env.NODE_ENV = "test";

        const secret = getJwtSecret();
        assert.ok(typeof secret === "string");
        assert.ok(secret.length >= 32);
      } finally {
        env.APP_ENV = originalAppEnv;
        env.NODE_ENV = originalNodeEnv;
      }
    });

    it("throws a 500 error in production when JWT_SECRET is missing or less than 32 characters", () => {
      const originalAppEnv = process.env.APP_ENV;
      const originalJwtSecret = process.env.JWT_SECRET;

      try {
        process.env.APP_ENV = "production";
        process.env.JWT_SECRET = "too_short";

        assert.throws(
          () => getJwtSecret(),
          (err: unknown) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 500);
            assert.strictEqual(err.errorCode, "INTERNAL_SERVER_ERROR");
            return true;
          }
        );

        delete process.env.JWT_SECRET;
        assert.throws(
          () => getJwtSecret(),
          (err: unknown) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 500);
            assert.strictEqual(err.errorCode, "INTERNAL_SERVER_ERROR");
            return true;
          }
        );
      } finally {
        process.env.APP_ENV = originalAppEnv;
        if (originalJwtSecret !== undefined) {
          process.env.JWT_SECRET = originalJwtSecret;
        } else {
          delete process.env.JWT_SECRET;
        }
      }
    });
  });

  describe("Login & Timing Attack Defense", () => {
    it("performs dummy hash comparison and returns 401 for non-existent email", async () => {
      const nonExistentEmail = `unknown-${Date.now()}@test-nonexistent.com`;

      await assert.rejects(
        async () => {
          await login(nonExistentEmail, "WrongPassword123!");
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 401);
          assert.strictEqual(err.errorCode, "INVALID_CREDENTIALS");
          return true;
        }
      );
    });

    it("logs in successfully with valid credentials and returns HS256 JWT with iss and aud", async () => {
      const rolesList = await getRoles();
      const superAdminRole = rolesList.find((r) => r.code === "super_admin");
      assert.ok(superAdminRole);

      const testUserId = `test-auth-${Date.now()}`;
      const email = `${testUserId}@example.com`;
      const rawPassword = "ValidPassword123!";
      const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

      await createUser({
        id: testUserId,
        name: "Auth Test User",
        email,
        passwordHash,
        roleId: superAdminRole.id,
        status: "active",
        dataVisibility: "all",
      });

      const result = await login(email, rawPassword, "TestAgent", "127.0.0.1");

      assert.ok(result.token);
      assert.ok(result.expiresAt > Date.now());
      assert.strictEqual(result.user.id, testUserId);
      assert.strictEqual(result.user.email, email);

      // Verify JWT claims directly
      const decoded = jwt.verify(result.token, getJwtSecret(), {
        algorithms: ["HS256"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as { sessionId: string; userId: string; iss: string; aud: string };

      assert.strictEqual(decoded.userId, testUserId);
      assert.strictEqual(decoded.iss, JWT_ISSUER);
      assert.strictEqual(decoded.aud, JWT_AUDIENCE);

      // Verify session exists in DB
      const dbSession = await findSessionWithUserAndRole(decoded.sessionId);
      assert.ok(dbSession);
      assert.strictEqual(dbSession.session.userId, testUserId);

      // Cleanup
      await deleteSessionsByUserId(testUserId);
    });

    it("rejects login for inactive user and invalidates any sessions", async () => {
      const rolesList = await getRoles();
      const role = rolesList[0];
      const testUserId = `inactive-user-${Date.now()}`;
      const email = `${testUserId}@example.com`;
      const rawPassword = "Password123!";
      const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

      await createUser({
        id: testUserId,
        name: "Inactive User",
        email,
        passwordHash,
        roleId: role.id,
        status: "inactive",
      });

      await assert.rejects(
        async () => {
          await login(email, rawPassword);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.errorCode, "ACCOUNT_INACTIVE");
          return true;
        }
      );
    });

    it("rejects login for suspended user", async () => {
      const rolesList = await getRoles();
      const role = rolesList[0];
      const testUserId = `suspended-user-${Date.now()}`;
      const email = `${testUserId}@example.com`;
      const rawPassword = "Password123!";
      const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

      await createUser({
        id: testUserId,
        name: "Suspended User",
        email,
        passwordHash,
        roleId: role.id,
        status: "suspended",
      });

      await assert.rejects(
        async () => {
          await login(email, rawPassword);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.errorCode, "ACCOUNT_SUSPENDED");
          return true;
        }
      );
    });
  });

  describe("Session Verification & Sliding Renewal", () => {
    it("successfully verifies session and extends expiry if remaining time is under 50%", async () => {
      const rolesList = await getRoles();
      const role = rolesList[0];
      const testUserId = `sliding-user-${Date.now()}`;
      const email = `${testUserId}@example.com`;
      const rawPassword = "Password123!";
      const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

      await createUser({
        id: testUserId,
        name: "Sliding User",
        email,
        passwordHash,
        roleId: role.id,
        status: "active",
      });

      const { token } = await login(email, rawPassword);
      const decoded = jwt.decode(token) as { sessionId: string };

      // Manually simulate a session that is older than 50% (remaining lifetime is 2 days < 3.5 days)
      const nearExpiry = Date.now() + 2 * 24 * 60 * 60 * 1000;
      await db
        .update(sessions)
        .set({ expiresAt: nearExpiry })
        .where(eq(sessions.id, decoded.sessionId));

      // Verify session should trigger sliding renewal
      const verified = await verifySession(token);
      assert.strictEqual(verified.id, testUserId);

      // Check updated expiresAt in DB
      const refreshedSession = await findSessionWithUserAndRole(decoded.sessionId);
      assert.ok(refreshedSession);
      // It should now be extended by SESSION_EXPIRY_MS (approx 7 days from now)
      assert.ok(refreshedSession.session.expiresAt > Date.now() + 6 * 24 * 60 * 60 * 1000);

      // Cleanup
      await deleteSessionsByUserId(testUserId);
    });

    it("rejects tampered or forged JWT tokens", async () => {
      const forgedToken = jwt.sign(
        { sessionId: "fake-session", userId: "fake-user" },
        "wrong_signing_secret_12345678901234567890",
        { algorithm: "HS256" }
      );

      await assert.rejects(
        async () => {
          await verifySession(forgedToken);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 401);
          assert.strictEqual(err.errorCode, "SESSION_EXPIRED");
          return true;
        }
      );
    });
  });

  describe("Logout & Session Invalidation", () => {
    it("deletes database session on logout", async () => {
      const rolesList = await getRoles();
      const role = rolesList[0];
      const testUserId = `logout-user-${Date.now()}`;
      const email = `${testUserId}@example.com`;
      const rawPassword = "Password123!";
      const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

      await createUser({
        id: testUserId,
        name: "Logout User",
        email,
        passwordHash,
        roleId: role.id,
        status: "active",
      });

      const { token } = await login(email, rawPassword);
      const decoded = jwt.decode(token) as { sessionId: string };

      // Session exists
      const beforeLogout = await findSessionWithUserAndRole(decoded.sessionId);
      assert.ok(beforeLogout);

      // Perform logout
      await logout(token);

      // Session should be deleted
      const afterLogout = await findSessionWithUserAndRole(decoded.sessionId);
      assert.strictEqual(afterLogout, undefined);
    });

    it("handles expired tokens gracefully during logout by decoding and purging DB session", async () => {
      const rolesList = await getRoles();
      const role = rolesList[0];
      const testUserId = `expired-logout-${Date.now()}`;
      const email = `${testUserId}@example.com`;
      const rawPassword = "Password123!";
      const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

      await createUser({
        id: testUserId,
        name: "Expired Logout User",
        email,
        passwordHash,
        roleId: role.id,
        status: "active",
      });

      const sessionId = `test-expired-session-${Date.now()}`;
      await createSession({
        id: sessionId,
        userId: testUserId,
        userAgent: "TestAgent",
        ipAddress: "127.0.0.1",
        expiresAt: Date.now() - 1000, // already expired
      });

      // Sign token that is already expired
      const expiredToken = jwt.sign(
        { sessionId, userId: testUserId },
        getJwtSecret(),
        { algorithm: "HS256", expiresIn: -10, issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
      );

      // Logout should NOT throw, and should purge the DB session
      await logout(expiredToken);

      const sessionAfter = await findSessionWithUserAndRole(sessionId);
      assert.strictEqual(sessionAfter, undefined);
    });
  });

  describe("Security Event Session Revocation", () => {
    it("invalidates all active sessions when user password is updated", async () => {
      const rolesList = await getRoles();
      const role = rolesList[0];
      const testUserId = `pass-change-${Date.now()}`;
      const email = `${testUserId}@example.com`;
      const rawPassword = "Password123!";
      const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

      await createUser({
        id: testUserId,
        name: "Pass Change User",
        email,
        passwordHash,
        roleId: role.id,
        status: "active",
      });

      // Create two active sessions (e.g. mobile and desktop)
      const session1 = await login(email, rawPassword);
      const session2 = await login(email, rawPassword);

      const decoded1 = jwt.decode(session1.token) as { sessionId: string };
      const decoded2 = jwt.decode(session2.token) as { sessionId: string };

      assert.ok(await findSessionWithUserAndRole(decoded1.sessionId));
      assert.ok(await findSessionWithUserAndRole(decoded2.sessionId));

      // Update password
      const newPasswordHash = await bcrypt.hash("NewPassword123!", BCRYPT_SALT_ROUNDS);
      await updatePassword(testUserId, newPasswordHash);

      // Both sessions must now be deleted from DB
      assert.strictEqual(await findSessionWithUserAndRole(decoded1.sessionId), undefined);
      assert.strictEqual(await findSessionWithUserAndRole(decoded2.sessionId), undefined);
    });

    it("invalidates all active sessions when user status is changed to inactive or suspended", async () => {
      const rolesList = await getRoles();
      const role = rolesList[0];
      const testUserId = `status-change-${Date.now()}`;
      const email = `${testUserId}@example.com`;
      const rawPassword = "Password123!";
      const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

      await createUser({
        id: testUserId,
        name: "Status Change User",
        email,
        passwordHash,
        roleId: role.id,
        status: "active",
      });

      const { token } = await login(email, rawPassword);
      const decoded = jwt.decode(token) as { sessionId: string };
      assert.ok(await findSessionWithUserAndRole(decoded.sessionId));

      // Deactivate account
      await updateUserStatus(testUserId, "inactive");

      // Session must be purged
      assert.strictEqual(await findSessionWithUserAndRole(decoded.sessionId), undefined);
    });
  });

  describe("Expired Session Cleanup", () => {
    it("deletes expired sessions while leaving active sessions untouched", async () => {
      const rolesList = await getRoles();
      const role = rolesList[0];
      const testUserId = `cleanup-user-${Date.now()}`;
      const email = `${testUserId}@example.com`;
      const rawPassword = "Password123!";
      const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

      await createUser({
        id: testUserId,
        name: "Cleanup Test User",
        email,
        passwordHash,
        roleId: role.id,
        status: "active",
      });

      const expiredSessionId = `expired-${Date.now()}`;
      const activeSessionId = `active-${Date.now()}`;
      const now = Date.now();

      await createSession({
        id: expiredSessionId,
        userId: testUserId,
        userAgent: "Expired",
        ipAddress: "127.0.0.1",
        expiresAt: now - 5000,
      });

      await createSession({
        id: activeSessionId,
        userId: testUserId,
        userAgent: "Active",
        ipAddress: "127.0.0.1",
        expiresAt: now + 60000,
      });

      // Run cleanup
      await deleteExpiredSessions(now);

      const expiredCheck = await findSessionWithUserAndRole(expiredSessionId);
      const activeCheck = await findSessionWithUserAndRole(activeSessionId);

      assert.strictEqual(expiredCheck, undefined);
      assert.ok(activeCheck);

      // Cleanup active
      await deleteSessionsByUserId(testUserId);
    });
  });
});
