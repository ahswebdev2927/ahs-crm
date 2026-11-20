import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { proxy } from "@/proxy";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { AppError } from "@/lib/errors/AppError";
import { db } from "@/db";
import { rateLimits } from "@/db/schema/security";
import { eq } from "drizzle-orm";
import nextConfig from "../../../next.config";

describe("Phase 28 — API Security Hardening Unit & Integration Tests", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAppEnv = process.env.APP_ENV;
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

  const setEnv = (key: string, value: string | undefined) => {
    const env = process.env as Record<string, string | undefined>;
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  };

  afterEach(() => {
    setEnv("NODE_ENV", originalNodeEnv);
    setEnv("APP_ENV", originalAppEnv);
    setEnv("ALLOWED_ORIGINS", originalAllowedOrigins);
  });

  // =========================================================================
  // 1. Centralized Error Handling & Response Sanitization
  // =========================================================================
  describe("Centralized Error Handling (errorResponse)", () => {
    it("includes devMessage in development environment", async () => {
      setEnv("NODE_ENV", "development");
      setEnv("APP_ENV", undefined);

      const res = errorResponse({
        statusCode: 500,
        message: "Something went wrong",
        errorCode: "INTERNAL_SERVER_ERROR",
        devMessage: "Detailed SQL syntax error: table not found",
      });

      const body = await res.json();
      assert.strictEqual(body.status, false);
      assert.strictEqual(body.statusCode, 500);
      assert.strictEqual(body.message, "Something went wrong");
      assert.strictEqual(body.errorCode, "INTERNAL_SERVER_ERROR");
      assert.strictEqual(body.devMessage, "Detailed SQL syntax error: table not found");
    });

    it("suppresses devMessage when NODE_ENV is production", async () => {
      setEnv("NODE_ENV", "production");
      setEnv("APP_ENV", undefined);

      const res = errorResponse({
        statusCode: 500,
        message: "Something went wrong",
        errorCode: "INTERNAL_SERVER_ERROR",
        devMessage: "Detailed SQL syntax error: table not found",
      });

      const body = await res.json();
      assert.strictEqual(body.status, false);
      assert.strictEqual(body.statusCode, 500);
      assert.strictEqual(body.message, "Something went wrong");
      assert.strictEqual(body.devMessage, undefined);
    });

    it("suppresses devMessage when APP_ENV is production", async () => {
      setEnv("NODE_ENV", "development");
      setEnv("APP_ENV", "production");

      const res = errorResponse({
        statusCode: 500,
        message: "Something went wrong",
        errorCode: "INTERNAL_SERVER_ERROR",
        devMessage: "Internal stack trace / secrets",
      });

      const body = await res.json();
      assert.strictEqual(body.status, false);
      assert.strictEqual(body.devMessage, undefined);
    });

    it("maps ZodError to structured 400 with field errors through withErrorHandling", async () => {
      const testSchema = z.object({
        email: z.string().email("Invalid email format"),
        age: z.number().min(18, "Must be at least 18"),
      });

      const testHandler = withErrorHandling(async () => {
        testSchema.parse({ email: "invalid-email", age: 10 });
        return successResponse({ statusCode: 200, message: "OK", data: {} });
      });

      const mockReq = new NextRequest("http://localhost:3000/api/test");
      const res = await testHandler(mockReq, { params: Promise.resolve({}) });
      const body = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.status, false);
      assert.strictEqual(body.errorCode, "VALIDATION_ERROR");
      assert.strictEqual(body.message, "Validation failed");
      assert.ok(body.errors?.email?.includes("Invalid email format"));
      assert.ok(body.errors?.age?.includes("Must be at least 18"));
    });
  });

  // =========================================================================
  // 2. CORS Verification in Proxy
  // =========================================================================
  describe("CORS Protection (src/proxy.ts)", () => {
    it("blocks cross-origin API requests from unallowed origin in production", async () => {
      setEnv("NODE_ENV", "production");
      setEnv("ALLOWED_ORIGINS", "https://crm.ahs.in,https://admin.ahs.in");

      const req = new NextRequest("http://localhost:3000/api/leads", {
        headers: {
          host: "localhost:3000",
          origin: "https://evil-attacker.com",
        },
      });

      const res = await proxy(req);
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.errorCode, "CORS_ERROR");
    });

    it("permits cross-origin API requests from whitelisted origin in production", async () => {
      setEnv("NODE_ENV", "production");
      setEnv("ALLOWED_ORIGINS", "https://crm.ahs.in,https://admin.ahs.in");

      const req = new NextRequest("http://localhost:3000/api/leads", {
        headers: {
          host: "localhost:3000",
          origin: "https://crm.ahs.in",
        },
      });

      const res = await proxy(req);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get("Access-Control-Allow-Origin"), "https://crm.ahs.in");
      assert.strictEqual(res.headers.get("Access-Control-Allow-Credentials"), "true");
    });

    it("permits same-origin requests even when origin header is absent", async () => {
      setEnv("NODE_ENV", "production");

      const req = new NextRequest("http://localhost:3000/api/leads", {
        headers: {
          host: "localhost:3000",
        },
      });

      const res = await proxy(req);
      assert.strictEqual(res.status, 200);
    });

    it("handles preflight OPTIONS request for whitelisted origin", async () => {
      setEnv("NODE_ENV", "production");
      setEnv("ALLOWED_ORIGINS", "https://crm.ahs.in");

      const req = new NextRequest("http://localhost:3000/api/leads", {
        method: "OPTIONS",
        headers: {
          host: "localhost:3000",
          origin: "https://crm.ahs.in",
        },
      });

      const res = await proxy(req);
      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers.get("Access-Control-Allow-Origin"), "https://crm.ahs.in");
      assert.ok(res.headers.get("Access-Control-Allow-Methods")?.includes("POST"));
    });

    it("rejects preflight OPTIONS request for unauthorized origin in production", async () => {
      setEnv("NODE_ENV", "production");
      setEnv("ALLOWED_ORIGINS", "https://crm.ahs.in");

      const req = new NextRequest("http://localhost:3000/api/leads", {
        method: "OPTIONS",
        headers: {
          host: "localhost:3000",
          origin: "https://unauthorized.com",
        },
      });

      const res = await proxy(req);
      assert.strictEqual(res.status, 403);
    });
  });

  // =========================================================================
  // 3. CSRF Protection in Proxy
  // =========================================================================
  describe("CSRF Protection (src/proxy.ts)", () => {
    it("blocks mutating requests with session cookie when origin/referer is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/leads", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          cookie: "session_token=valid_test_token",
        },
      });

      const res = await proxy(req);
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.errorCode, "CSRF_ERROR");
    });

    it("blocks mutating requests with session cookie when origin is cross-origin attacker", async () => {
      const req = new NextRequest("http://localhost:3000/api/leads", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://attacker.site",
          cookie: "session_token=valid_test_token",
        },
      });

      const res = await proxy(req);
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.errorCode, "CSRF_ERROR");
    });

    it("allows mutating requests with session cookie when origin matches host origin", async () => {
      const req = new NextRequest("http://localhost:3000/api/leads", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          cookie: "session_token=valid_test_token",
        },
      });

      const res = await proxy(req);
      assert.strictEqual(res.status, 200);
    });

    it("allows mutating requests with session cookie when referer matches host origin", async () => {
      const req = new NextRequest("http://localhost:3000/api/leads", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          referer: "http://localhost:3000/leads/new",
          cookie: "session_token=valid_test_token",
        },
      });

      const res = await proxy(req);
      assert.strictEqual(res.status, 200);
    });
  });

  // =========================================================================
  // 4. Rate Limiting Protection (checkRateLimit)
  // =========================================================================
  describe("Rate Limiting (checkRateLimit)", () => {
    const testKey = `test-rate-${Date.now()}`;
    const testIdentifier = "192.168.1.100";

    afterEach(async () => {
      await db.delete(rateLimits).where(eq(rateLimits.key, `${testKey}:${testIdentifier}`));
    });

    it("increments rate limit counter and tracks remaining quota", async () => {
      const result1 = await checkRateLimit({
        key: testKey,
        identifier: testIdentifier,
        limit: 3,
        windowMs: 60 * 1000,
      });

      assert.strictEqual(result1.limit, 3);
      assert.strictEqual(result1.remaining, 2);

      const result2 = await checkRateLimit({
        key: testKey,
        identifier: testIdentifier,
        limit: 3,
        windowMs: 60 * 1000,
      });

      assert.strictEqual(result2.remaining, 1);
    });

    it("throws AppError 429 when rate limit quota is exceeded", async () => {
      const config = {
        key: testKey,
        identifier: testIdentifier,
        limit: 2,
        windowMs: 60 * 1000,
        message: "Custom rate limit exceeded message",
      };

      await checkRateLimit(config);
      await checkRateLimit(config);

      await assert.rejects(
        async () => {
          await checkRateLimit(config);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 429);
          assert.strictEqual(err.errorCode, "TOO_MANY_REQUESTS");
          assert.strictEqual(err.message, "Custom rate limit exceeded message");
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 5. Security Headers Configuration (next.config.ts)
  // =========================================================================
  describe("Security Headers Configuration (next.config.ts)", () => {
    it("configures all required OWASP security headers", async () => {
      assert.ok(nextConfig.headers, "nextConfig.headers should be defined");
      const headersConfig = await nextConfig.headers();
      type HeaderEntry = { key: string; value: string };
      type RouteHeaderConfig = { source?: string; headers: HeaderEntry[] };
      const rootHeaders = (headersConfig as RouteHeaderConfig[]).find(
        (h) => h.source === "/:path*"
      );
      assert.ok(rootHeaders, "Root wildcard /:path* headers should exist");

      const headerMap: Record<string, string> = {};
      rootHeaders.headers.forEach((h: HeaderEntry) => {
        headerMap[h.key] = h.value;
      });

      // 1. Content Security Policy
      assert.ok(headerMap["Content-Security-Policy"], "CSP must be present");
      assert.ok(headerMap["Content-Security-Policy"].includes("default-src 'self'"));
      assert.ok(headerMap["Content-Security-Policy"].includes("frame-ancestors 'none'"));
      assert.ok(headerMap["Content-Security-Policy"].includes("object-src 'none'"));

      // 2. Strict Transport Security
      assert.strictEqual(
        headerMap["Strict-Transport-Security"],
        "max-age=31536000; includeSubDomains; preload"
      );

      // 3. X-Content-Type-Options
      assert.strictEqual(headerMap["X-Content-Type-Options"], "nosniff");

      // 4. X-Frame-Options
      assert.strictEqual(headerMap["X-Frame-Options"], "DENY");

      // 5. Referrer Policy
      assert.strictEqual(headerMap["Referrer-Policy"], "strict-origin-when-cross-origin");

      // 6. Permissions Policy
      assert.ok(headerMap["Permissions-Policy"], "Permissions-Policy must be present");
      assert.ok(headerMap["Permissions-Policy"].includes("camera=()"));
      assert.ok(headerMap["Permissions-Policy"].includes("microphone=()"));

      // 7. X-DNS-Prefetch-Control
      assert.strictEqual(headerMap["X-DNS-Prefetch-Control"], "on");

      // 8. Cross-Origin-Opener-Policy
      assert.strictEqual(headerMap["Cross-Origin-Opener-Policy"], "same-origin");
    });
  });
});
