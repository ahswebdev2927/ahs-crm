import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { validateAllowlist } from "@/lib/security/validation";
import { db } from "@/db";
import { rateLimits } from "@/db/schema/security";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  if (endpoint === "rate-limit-trigger") {
    const key = searchParams.get("key") || "test";
    const limit = parseInt(searchParams.get("limit") || "3", 10);
    await checkRateLimit({
      key,
      identifier: "test-client",
      limit,
      windowMs: 5000,
    });
    return successResponse({ statusCode: 200, message: "Allowed", data: {} });
  }

  const results: { name: string; passed: boolean; details?: string }[] = [];
  const origin = new URL(request.url).origin;

  const assert = (name: string, condition: boolean, details?: string) => {
    results.push({ name, passed: condition, details });
  };

  // 1. Test Rate Limiting
  const testKey = `test-limit-${Date.now()}`;
  try {
    await fetch(`${origin}/api/test-security?endpoint=rate-limit-trigger&key=${testKey}&limit=2`);
    await fetch(`${origin}/api/test-security?endpoint=rate-limit-trigger&key=${testKey}&limit=2`);
    const res = await fetch(`${origin}/api/test-security?endpoint=rate-limit-trigger&key=${testKey}&limit=2`);
    
    assert(
      "Rate Limiter throws 429 after limit is reached",
      res.status === 429,
      `Expected status 429, got ${res.status}`
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    assert("Rate Limiter throws 429", false, errMessage);
  } finally {
    await db.delete(rateLimits).where(eq(rateLimits.key, `${testKey}:test-client`));
  }

  // 2. Test Cron Cleanup Route Security
  try {
    const badRes = await fetch(`${origin}/api/cron/cleanup-rate-limits?secret=wrong`);
    assert("Cron Cleanup rejects bad secret", badRes.status === 401);

    const systemSecret = process.env.CRON_SECRET || "development_cron_secret_key";
    const goodRes = await fetch(`${origin}/api/cron/cleanup-rate-limits?secret=${systemSecret}`);
    assert("Cron Cleanup accepts valid secret", goodRes.status === 200);
  } catch (e: unknown) {
    const errMessage = e instanceof Error ? e.message : String(e);
    assert("Cron Cleanup testing error", false, errMessage);
  }

  // 3. Test Input Validation Allowlist Helper
  try {
    validateAllowlist("createdAt", ["createdAt", "status"]);
    assert("validateAllowlist accepts valid items", true);
  } catch {
    assert("validateAllowlist accepts valid items", false, "Threw error unexpectedly");
  }

  try {
    validateAllowlist("invalidField", ["createdAt", "status"]);
    assert("validateAllowlist rejects invalid items", false, "Should have thrown an error");
  } catch {
    assert("validateAllowlist rejects invalid items", true);
  }

  // 4. Test Security Headers
  try {
    const res = await fetch(`${origin}/api/test-error-handler`);
    const csp = res.headers.get("content-security-policy");
    const hsts = res.headers.get("strict-transport-security");
    const nosniff = res.headers.get("x-content-type-options");
    const frame = res.headers.get("x-frame-options");

    assert("CSP Header Present", !!csp, `CSP: ${csp}`);
    assert("HSTS Header Present", !!hsts, `HSTS: ${hsts}`);
    assert("nosniff Header Present", nosniff === "nosniff", `x-content-type-options: ${nosniff}`);
    assert("X-Frame-Options Header Present", frame === "DENY", `x-frame-options: ${frame}`);
  } catch (e: unknown) {
    const errMessage = e instanceof Error ? e.message : String(e);
    assert("Security Headers Check", false, errMessage);
  }

  // 5. Test CORS / CSRF Protection
  try {
    const postRes = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: {
        "Origin": "https://malicious-site.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "test@domain.com", password: "pwd" }),
    });

    assert(
      "CSRF/CORS Proxy blocks malicious origins on POST",
      postRes.status === 403,
      `Expected status 403, got ${postRes.status}`
    );
  } catch (e: unknown) {
    const errMessage = e instanceof Error ? e.message : String(e);
    assert("CSRF/CORS Proxy Check", false, errMessage);
  }

  const allPassed = results.every(r => r.passed);

  return successResponse({
    statusCode: 200,
    message: allPassed ? "All security foundation tests passed!" : "Some security checks failed.",
    data: { allPassed, results }
  });
});
