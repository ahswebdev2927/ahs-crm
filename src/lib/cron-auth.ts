import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/AppError";

/**
 * Validates incoming cron invocation from Cron-job.org or external runners.
 * Supports multiple authorization formats used by cron services:
 * 1. Authorization: Bearer <secret>
 * 2. X-Cron-Secret: <secret>
 * 3. ?secret=<secret> (URL query parameter)
 */
export function validateCronSecret(request: NextRequest): void {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader && authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;

  const headerSecret = request.headers.get("x-cron-secret")?.trim() || null;
  const querySecret = request.nextUrl.searchParams.get("secret")?.trim() || null;

  const incomingSecret = bearerSecret || headerSecret || querySecret;
  const systemSecret =
    process.env.CRON_SECRET ||
    (process.env.NODE_ENV !== "production" ? "development_cron_secret_key" : "");

  if (!systemSecret) {
    throw new AppError("CRON_SECRET is not configured on the server.", 500, "CONFIG_ERROR");
  }

  if (!incomingSecret || incomingSecret !== systemSecret) {
    throw new AppError("Unauthorized cron trigger.", 401, "UNAUTHORIZED");
  }
}

/**
 * Anti-caching HTTP response headers for Hostinger LiteSpeed Web Server,
 * CloudLinux reverse proxy, and intermediate CDNs (e.g. Cloudflare).
 * Ensures cron executions are never cached and always execute fresh on every ping.
 */
export const CRON_RESPONSE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Robots-Tag": "noindex, nofollow",
};
