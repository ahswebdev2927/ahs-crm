import { headers } from "next/headers";
import { db } from "@/db";
import { rateLimits } from "@/db/schema/security";
import { AppError } from "@/lib/errors/AppError";
import { logRateLimitViolation } from "@/lib/logger";
import { eq, and, sql, count } from "drizzle-orm";

export interface RateLimitConfig {
  key: string;
  identifier: string;
  limit: number;
  windowMs: number;
  message?: string;
}

export interface RateLimitResult {
  limit: number;
  remaining: number;
  resetTime: number;
}

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = headersList.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { key, identifier, limit, windowMs, message } = config;
  const fullKey = `${key}:${identifier}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  // Count requests in current window
  const countResult = await db
    .select({ count: count() })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.key, fullKey),
        sql`${rateLimits.timestamp} >= ${cutoff}`
      )
    )
    .get();

  const currentCount = countResult?.count ?? 0;
  const remaining = Math.max(0, limit - currentCount - 1);
  const resetTime = now + windowMs;

  if (currentCount >= limit) {
    logRateLimitViolation({
      key: fullKey,
      ip: identifier,
      limit,
      windowMs,
    });

    const defaultMsg =
      windowMs >= 60000
        ? `Too many requests. Please try again in ${Math.ceil(windowMs / 60000)} minutes.`
        : "Too many requests. Please try again later.";

    throw new AppError(
      message || defaultMsg,
      429,
      "TOO_MANY_REQUESTS"
    );
  }

  // Insert new request record
  await db.insert(rateLimits).values({
    key: fullKey,
    timestamp: now,
    expiresAt: resetTime,
  });

  return {
    limit,
    remaining,
    resetTime,
  };
}
