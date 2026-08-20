import { headers } from "next/headers";
import { db } from "@/db";
import { rateLimits } from "@/db/schema/security";
import { AppError } from "@/lib/errors/AppError";
import { eq, and, sql, count } from "drizzle-orm";

interface RateLimitConfig {
  key: string;
  identifier: string;
  limit: number;
  windowMs: number;
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

export async function checkRateLimit(config: RateLimitConfig): Promise<void> {
  const { key, identifier, limit, windowMs } = config;
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

  if (currentCount >= limit) {
    throw new AppError(
      "Too many login attempts. Please try again in 15 minutes.",
      429,
      "TOO_MANY_REQUESTS"
    );
  }

  // Insert new request record
  await db.insert(rateLimits).values({
    key: fullKey,
    timestamp: now,
    expiresAt: now + windowMs,
  });
}
