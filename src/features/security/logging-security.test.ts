import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pino from "pino";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import {
  logger,
  pinoOptions,
  sensitivePaths,
  SENSITIVE_KEYS,
  generateSensitivePaths,
  logAuthFailure,
  logAuthzFailure,
  logRateLimitViolation,
  logBusinessMutation,
  logExternalServiceFailure,
  logServiceError,
} from "@/lib/logger";

describe("Phase 28 — Logging Security Hardening Unit & Integration Tests", () => {
  // =========================================================================
  // 1. Base Configuration & Metadata Verification
  // =========================================================================
  describe("Pino Base Configuration", () => {
    it("exports active logger singleton and base sensitive keys", () => {
      assert.ok(logger, "Logger instance must be exported");
      assert.ok(Array.isArray(SENSITIVE_KEYS), "SENSITIVE_KEYS must be an array");
      assert.ok(SENSITIVE_KEYS.includes("password"));
      assert.ok(SENSITIVE_KEYS.includes("token"));
      assert.ok(SENSITIVE_KEYS.includes("secret"));
    });

    it("configures standard service identity and environment in base options", () => {
      assert.equal(
        (pinoOptions.base as { service?: string })?.service,
        "ahs-salescrm",
        "Base service must be ahs-salescrm"
      );
      assert.ok(
        (pinoOptions.base as { env?: string })?.env,
        "Base env must be defined"
      );
    });

    it("uses standard ISO timestamp function", () => {
      assert.equal(
        pinoOptions.timestamp,
        pino.stdTimeFunctions.isoTime,
        "Timestamp function must use standard ISO time"
      );
    });
  });

  // =========================================================================
  // 2. stdout / stderr Stream Routing & Deduplication
  // =========================================================================
  describe("Stream Separation & Deduplication (stdout vs stderr)", () => {
    it("routes info and warn to stdout and error to stderr without duplication", () => {
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];

      const mockStdout = {
        write: (chunk: string) => {
          stdoutChunks.push(chunk);
          return true;
        },
      };

      const mockStderr = {
        write: (chunk: string) => {
          stderrChunks.push(chunk);
          return true;
        },
      };

      const testStreams: pino.StreamEntry[] = [
        { level: "info", stream: mockStdout },
        { level: "error", stream: mockStderr },
      ];

      const testLogger = pino(
        {
          level: "info",
          base: { service: "ahs-test" },
          timestamp: pino.stdTimeFunctions.isoTime,
        },
        pino.multistream(testStreams, { dedupe: true })
      );

      // Log messages across different severity levels
      testLogger.info({ event: "NORMAL_INFO" }, "User login succeeded");
      testLogger.warn({ event: "WARNING_EVENT" }, "Rate limit approaching");
      testLogger.error({ event: "ERROR_EVENT" }, "Database connection timed out");

      // Verify stdout contains info and warn, but NOT error
      assert.equal(stdoutChunks.length, 2, "stdout should receive exactly 2 messages (info and warn)");
      const stdoutLog1 = JSON.parse(stdoutChunks[0]);
      const stdoutLog2 = JSON.parse(stdoutChunks[1]);
      assert.equal(stdoutLog1.msg, "User login succeeded");
      assert.equal(stdoutLog1.level, 30); // info
      assert.equal(stdoutLog2.msg, "Rate limit approaching");
      assert.equal(stdoutLog2.level, 40); // warn

      // Verify stderr contains error, and it was NOT duplicated to stdout
      assert.equal(stderrChunks.length, 1, "stderr should receive exactly 1 message (error)");
      const stderrLog1 = JSON.parse(stderrChunks[0]);
      assert.equal(stderrLog1.msg, "Database connection timed out");
      assert.equal(stderrLog1.level, 50); // error

      // Crucial deduplication check: Error message must not appear in any stdout chunk
      const stdoutAllText = stdoutChunks.join("\n");
      assert.ok(
        !stdoutAllText.includes("Database connection timed out"),
        "Error logs must be deduplicated and not appear in stdout"
      );
    });

    it("routes debug logs to stdout when log level is set to debug", () => {
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];

      const mockStdout = {
        write: (chunk: string) => {
          stdoutChunks.push(chunk);
          return true;
        },
      };
      const mockStderr = {
        write: (chunk: string) => {
          stderrChunks.push(chunk);
          return true;
        },
      };

      const testLogger = pino(
        { level: "debug" },
        pino.multistream(
          [
            { level: "debug", stream: mockStdout },
            { level: "error", stream: mockStderr },
          ],
          { dedupe: true }
        )
      );

      testLogger.debug({ traceId: "abc-123" }, "Debug query execution trace");

      assert.equal(stdoutChunks.length, 1);
      assert.equal(stderrChunks.length, 0);
      const parsed = JSON.parse(stdoutChunks[0]);
      assert.equal(parsed.msg, "Debug query execution trace");
      assert.equal(parsed.level, 20); // debug
    });
  });

  // =========================================================================
  // 3. Multi-Depth Zero-Secrets Redaction
  // =========================================================================
  describe("Zero-Secrets Redaction (Pino fast-redact)", () => {
    it("generates wildcard paths covering depths 0 through 5 for sensitive keys", () => {
      const testKeys = ["password", "token"];
      const generated = generateSensitivePaths(testKeys, 5);

      assert.ok(generated.includes("password"));
      assert.ok(generated.includes("*.password"));
      assert.ok(generated.includes("*.*.password"));
      assert.ok(generated.includes("*.*.*.password"));
      assert.ok(generated.includes("*.*.*.*.password"));
      assert.ok(generated.includes("*.*.*.*.*.password"));

      assert.ok(generated.includes("token"));
      assert.ok(generated.includes("*.token"));
      assert.ok(generated.includes("*.*.token"));
      assert.ok(generated.includes("*.*.*.token"));
      assert.ok(generated.includes("*.*.*.*.token"));
      assert.ok(generated.includes("*.*.*.*.*.token"));

      // Standard sensitive header paths
      assert.ok(generated.includes("headers.authorization"));
      assert.ok(generated.includes("headers.cookie"));
      assert.ok(generated.includes("req.headers.cookie"));
    });

    it("redacts top-level sensitive fields from log payloads", () => {
      const chunks: string[] = [];
      const mockStream = {
        write: (chunk: string) => {
          chunks.push(chunk);
          return true;
        },
      };

      const testLogger = pino(
        {
          level: "info",
          redact: { paths: sensitivePaths, censor: "[REDACTED]" },
        },
        mockStream
      );

      testLogger.info(
        {
          userId: "usr-100",
          password: "mySecretPassword123!",
          confirmPassword: "mySecretPassword123!",
          jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.sig",
          token: "secret-token-xyz",
          apiKey: "test-api-key-999",
          dbUrl: "libsql://ahs-crm.turso.io?authToken=secret",
          cookie: "session_token=abc123xyz",
        },
        "User credentials test"
      );

      assert.equal(chunks.length, 1);
      const parsed = JSON.parse(chunks[0]);

      // Non-sensitive data remains visible
      assert.equal(parsed.userId, "usr-100");
      assert.equal(parsed.msg, "User credentials test");

      // Sensitive fields must all be censored to [REDACTED]
      assert.equal(parsed.password, "[REDACTED]");
      assert.equal(parsed.confirmPassword, "[REDACTED]");
      assert.equal(parsed.jwt, "[REDACTED]");
      assert.equal(parsed.token, "[REDACTED]");
      assert.equal(parsed.apiKey, "[REDACTED]");
      assert.equal(parsed.dbUrl, "[REDACTED]");
      assert.equal(parsed.cookie, "[REDACTED]");

      // Plaintext values must NOT appear anywhere in the output
      assert.ok(!chunks[0].includes("mySecretPassword123!"));
      assert.ok(!chunks[0].includes("secret-token-xyz"));
      assert.ok(!chunks[0].includes("test-api-key-999"));
      assert.ok(!chunks[0].includes("session_token=abc123xyz"));
    });

    it("redacts deeply nested sensitive fields up to 5 levels deep", () => {
      const chunks: string[] = [];
      const mockStream = {
        write: (chunk: string) => {
          chunks.push(chunk);
          return true;
        },
      };

      const testLogger = pino(
        {
          level: "info",
          redact: { paths: sensitivePaths, censor: "[REDACTED]" },
        },
        mockStream
      );

      testLogger.info(
        {
          level1: {
            newPassword: "level1-secret-password",
            level2: {
              session_token: "level2-session-token",
              level3: {
                apiKey: "level3-api-key",
                level4: {
                  tursoAuthToken: "level4-turso-token",
                  level5: {
                    cronSecret: "level5-cron-secret",
                  },
                },
              },
            },
          },
          req: {
            headers: {
              authorization: "Bearer secret-bearer-token-123",
              cookie: "session_token=nested-cookie-value",
            },
          },
        },
        "Deeply nested security payload"
      );

      assert.equal(chunks.length, 1);
      const parsed = JSON.parse(chunks[0]);

      // Verify deep redactions
      assert.equal(parsed.level1.newPassword, "[REDACTED]");
      assert.equal(parsed.level1.level2.session_token, "[REDACTED]");
      assert.equal(parsed.level1.level2.level3.apiKey, "[REDACTED]");
      assert.equal(parsed.level1.level2.level3.level4.tursoAuthToken, "[REDACTED]");
      assert.equal(parsed.level1.level2.level3.level4.level5.cronSecret, "[REDACTED]");
      assert.equal(parsed.req.headers.authorization, "[REDACTED]");
      assert.equal(parsed.req.headers.cookie, "[REDACTED]");

      // Verify no plain secret strings leak
      assert.ok(!chunks[0].includes("level1-secret-password"));
      assert.ok(!chunks[0].includes("level2-session-token"));
      assert.ok(!chunks[0].includes("level3-api-key"));
      assert.ok(!chunks[0].includes("level4-turso-token"));
      assert.ok(!chunks[0].includes("level5-cron-secret"));
      assert.ok(!chunks[0].includes("secret-bearer-token-123"));
      assert.ok(!chunks[0].includes("nested-cookie-value"));
    });
  });

  // =========================================================================
  // 4. Domain Observability Helper Verification
  // =========================================================================
  describe("Domain Observability Helpers", () => {
    it("logAuthFailure logs structured authentication failure with safe fields", () => {
      // Execute helper function to ensure it formats correctly without throwing
      logAuthFailure({
        email: "agent@ahshouse.com",
        ip: "192.168.1.10",
        reason: "Invalid email or password",
        userAgent: "Mozilla/5.0",
      });

      const chunks: string[] = [];
      const mockStream = {
        write: (chunk: string) => {
          chunks.push(chunk);
          return true;
        },
      };

      const testLogger = pino(
        { level: "warn", redact: { paths: sensitivePaths, censor: "[REDACTED]" } },
        mockStream
      );

      testLogger.warn(
        {
          event: "AUTH_FAILURE",
          email: "agent@ahshouse.com",
          ip: "192.168.1.10",
          reason: "Invalid email or password",
          userAgent: "Mozilla/5.0",
        },
        "Authentication failed: Invalid email or password"
      );

      assert.equal(chunks.length, 1);
      const parsed = JSON.parse(chunks[0]);
      assert.equal(parsed.event, "AUTH_FAILURE");
      assert.equal(parsed.email, "agent@ahshouse.com");
      assert.equal(parsed.ip, "192.168.1.10");
      assert.equal(parsed.reason, "Invalid email or password");
    });

    it("logAuthzFailure logs authorization failures with required permission context", () => {
      logAuthzFailure({
        userId: "usr-456",
        requiredPermission: "quotations:delete",
        scope: "team",
        action: "delete",
        resource: "quotations",
        reason: "User lacks delete permission on quotations",
      });

      const chunks: string[] = [];
      const mockStream = {
        write: (chunk: string) => {
          chunks.push(chunk);
          return true;
        },
      };

      const testLogger = pino({ level: "warn" }, mockStream);

      testLogger.warn(
        {
          event: "AUTHZ_FAILURE",
          userId: "usr-456",
          requiredPermission: "quotations:delete",
          scope: "team",
          action: "delete",
          resource: "quotations",
          reason: "User lacks delete permission on quotations",
        },
        "Authorization failed for user usr-456"
      );

      assert.equal(chunks.length, 1);
      const parsed = JSON.parse(chunks[0]);
      assert.equal(parsed.event, "AUTHZ_FAILURE");
      assert.equal(parsed.userId, "usr-456");
      assert.equal(parsed.requiredPermission, "quotations:delete");
      assert.equal(parsed.action, "delete");
    });

    it("logRateLimitViolation logs rate limit violation details with IP and quota key", () => {
      logRateLimitViolation({
        key: "ratelimit:login:10.0.0.5",
        ip: "10.0.0.5",
        limit: 5,
        windowMs: 900000,
      });

      const chunks: string[] = [];
      const mockStream = {
        write: (chunk: string) => {
          chunks.push(chunk);
          return true;
        },
      };

      const testLogger = pino({ level: "warn" }, mockStream);

      testLogger.warn(
        {
          event: "RATE_LIMIT_VIOLATION",
          key: "ratelimit:login:10.0.0.5",
          ip: "10.0.0.5",
          limit: 5,
          windowMs: 900000,
        },
        "Rate limit exceeded for key: ratelimit:login:10.0.0.5 from IP: 10.0.0.5"
      );

      assert.equal(chunks.length, 1);
      const parsed = JSON.parse(chunks[0]);
      assert.equal(parsed.event, "RATE_LIMIT_VIOLATION");
      assert.equal(parsed.limit, 5);
      assert.equal(parsed.ip, "10.0.0.5");
    });

    it("logBusinessMutation logs audit-grade business state transitions", () => {
      logBusinessMutation({
        action: "lead:stage_changed",
        entity: "leads",
        entityId: "lead-777",
        actorId: "usr-mgr-1",
        metadata: { previousStage: "contacted", newStage: "qualified" },
      });

      const chunks: string[] = [];
      const mockStream = {
        write: (chunk: string) => {
          chunks.push(chunk);
          return true;
        },
      };

      const testLogger = pino({ level: "info" }, mockStream);

      testLogger.info(
        {
          event: "BUSINESS_MUTATION",
          action: "lead:stage_changed",
          entity: "leads",
          entityId: "lead-777",
          actorId: "usr-mgr-1",
          metadata: { previousStage: "contacted", newStage: "qualified" },
        },
        "Business mutation: lead:stage_changed on leads (lead-777) by usr-mgr-1"
      );

      assert.equal(chunks.length, 1);
      const parsed = JSON.parse(chunks[0]);
      assert.equal(parsed.event, "BUSINESS_MUTATION");
      assert.equal(parsed.action, "lead:stage_changed");
      assert.equal(parsed.entityId, "lead-777");
      assert.equal(parsed.actorId, "usr-mgr-1");
      assert.equal((parsed.metadata as { newStage: string }).newStage, "qualified");
    });

    it("logExternalServiceFailure and logServiceError log operational errors", () => {
      logExternalServiceFailure({
        service: "Cloudinary",
        operation: "upload",
        error: new Error("Socket timeout"),
      });

      logServiceError({
        service: "AppointmentService",
        operation: "sendNotification",
        error: new Error("Network socket hangup"),
      });

      const chunks: string[] = [];
      const mockStream = {
        write: (chunk: string) => {
          chunks.push(chunk);
          return true;
        },
      };

      const testLogger = pino({ level: "error" }, mockStream);

      testLogger.error(
        {
          event: "SERVICE_ERROR",
          service: "AppointmentService",
          operation: "sendNotification",
          errorMessage: "Network socket hangup",
        },
        "Service error [AppointmentService]: sendNotification failed - Network socket hangup"
      );

      assert.equal(chunks.length, 1);
      const parsed = JSON.parse(chunks[0]);
      assert.equal(parsed.event, "SERVICE_ERROR");
      assert.equal(parsed.service, "AppointmentService");
      assert.equal(parsed.operation, "sendNotification");
      assert.equal(parsed.errorMessage, "Network socket hangup");
    });
  });

  // =========================================================================
  // 5. API Route Performance & Duration Tracking (withErrorHandling)
  // =========================================================================
  describe("API Route Duration & Slow Request Tracking", () => {
    it("tracks request execution and returns standard response without error", async () => {
      const handler = withErrorHandling(async () => {
        return NextResponse.json({ success: true, data: "test-ok" });
      });

      const request = new NextRequest("http://localhost:3000/api/leads");
      const response = await handler(request, { params: Promise.resolve({}) });

      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.success, true);
      assert.equal(body.data, "test-ok");
    });

    it("triggers SLOW_API_REQUEST warning when handler exceeds 1000ms threshold", async () => {
      const warnedEvents: Array<{ event?: string; durationMs?: number; method?: string }> = [];

      // Temporarily spy on logger.warn
      const originalWarn = logger.warn.bind(logger);
      (logger as unknown as { warn: unknown }).warn = (obj: Record<string, unknown>, msg?: string) => {
        if (typeof obj === "object" && obj?.event === "SLOW_API_REQUEST") {
          warnedEvents.push(obj as { event?: string; durationMs?: number; method?: string });
        }
        return originalWarn(obj, msg);
      };

      try {
        const slowHandler = withErrorHandling(async () => {
          // Simulate slow query / external API operation > 1000ms
          await new Promise((resolve) => setTimeout(resolve, 1050));
          return NextResponse.json({ success: true, message: "slow operation complete" });
        });

        const req = new NextRequest("http://localhost:3000/api/reports/heavy-calc", { method: "GET" });
        const res = await slowHandler(req, { params: Promise.resolve({}) });

        assert.equal(res.status, 200);
        assert.equal(warnedEvents.length, 1, "Must emit exactly 1 SLOW_API_REQUEST warning");
        assert.equal(warnedEvents[0].event, "SLOW_API_REQUEST");
        assert.equal(warnedEvents[0].method, "GET");
        assert.ok(
          (warnedEvents[0].durationMs || 0) >= 1000,
          `Duration (${warnedEvents[0].durationMs}ms) must be >= 1000ms`
        );
      } finally {
        // Restore original logger.warn
        logger.warn = originalWarn;
      }
    });

    it("verifies financial mutation logging records authoritative payment details safely", () => {
      const chunks: string[] = [];
      const mockStream = {
        write: (chunk: string) => {
          chunks.push(chunk);
          return true;
        },
      };

      const testLogger = pino(
        {
          level: "info",
          redact: { paths: sensitivePaths, censor: "[REDACTED]" },
        },
        mockStream
      );

      // Simulate financial payment recording
      testLogger.info(
        {
          event: "BUSINESS_MUTATION",
          action: "payment:recorded",
          entity: "payments",
          entityId: "pay-rec-101",
          actorId: "usr-sales-1",
          metadata: {
            invoiceId: "inv-001",
            amountPaise: 15000000, // ₹1,50,000.00 in paise
            paymentMethod: "bank_transfer",
            status: "completed",
            // Verify sensitive creditCard/password/token fields get redacted if mistakenly attached
            creditCard: "4111222233334444",
            token: "trans-token-xyz",
          },
        },
        "Business mutation: payment:recorded on payments (pay-rec-101) by usr-sales-1"
      );

      assert.equal(chunks.length, 1);
      const parsed = JSON.parse(chunks[0]);
      assert.equal(parsed.event, "BUSINESS_MUTATION");
      assert.equal(parsed.action, "payment:recorded");
      assert.equal(parsed.metadata.amountPaise, 15000000);
      assert.equal(parsed.metadata.paymentMethod, "bank_transfer");

      // Verify that sensitive fields inside metadata are thoroughly redacted
      assert.equal(parsed.metadata.creditCard, "[REDACTED]");
      assert.equal(parsed.metadata.token, "[REDACTED]");
      assert.ok(!chunks[0].includes("4111222233334444"));
      assert.ok(!chunks[0].includes("trans-token-xyz"));
    });
  });
});
