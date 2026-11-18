import { revalidateTag } from "next/cache";
import { logger } from "@/lib/logger";

/**
 * Standard Cache Tags used across the application.
 */
export const CACHE_TAGS = {
  SERVICES: "services:catalog",
  LEAD_STAGES: "leads:stages",
  TEAMS: "teams:metadata",
  DASHBOARD_BUSINESS: "dashboard:business",
  DASHBOARD_TEAM: (teamId: number | string) => `dashboard:team:${teamId}`,
  DASHBOARD_USER: (userId: string) => `dashboard:user:${userId}`,
  PIPELINE_BOARD: (userId: string) => `pipeline:user:${userId}`,
  FINANCIAL_STATS: "financials:stats",
} as const;

export interface CacheEntry<T> {
  data: T;
  tags: string[];
  expiresAt: number;
}

export interface CacheOptions {
  tags: string[];
  ttlSeconds?: number;
}

// Module-scoped functional memory cache state
const memoryCache = new Map<string, CacheEntry<unknown>>();
const tagToKeys = new Map<string, Set<string>>();

/**
 * Retrieves an item from the in-memory cache if it exists and has not expired.
 */
export const getCachedData = <T>(key: string): T | undefined => {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    deleteCachedData(key);
    return undefined;
  }

  return entry.data as T;
};

/**
 * Stores an item in the in-memory cache with specified tags and TTL.
 */
export const setCachedData = <T>(
  key: string,
  data: T,
  tags: string[],
  ttlSeconds: number
): void => {
  deleteCachedData(key);

  const expiresAt = Date.now() + ttlSeconds * 1000;
  memoryCache.set(key, { data, tags, expiresAt });

  for (const tag of tags) {
    let keys = tagToKeys.get(tag);
    if (!keys) {
      keys = new Set();
      tagToKeys.set(tag, keys);
    }
    keys.add(key);
  }
};

/**
 * Deletes an item from the in-memory cache and cleans up tag associations.
 */
export const deleteCachedData = (key: string): void => {
  const entry = memoryCache.get(key);
  if (!entry) return;

  for (const tag of entry.tags) {
    const keys = tagToKeys.get(tag);
    if (keys) {
      keys.delete(key);
      if (keys.size === 0) {
        tagToKeys.delete(tag);
      }
    }
  }
  memoryCache.delete(key);
};

/**
 * Evicts all cached keys associated with the specified tag.
 */
export const evictTag = (tag: string): number => {
  const keys = tagToKeys.get(tag);
  if (!keys || keys.size === 0) return 0;

  const count = keys.size;
  for (const key of Array.from(keys)) {
    memoryCache.delete(key);
  }
  tagToKeys.delete(tag);
  return count;
};

/**
 * Clears the entire in-memory cache.
 */
export const clearAllCache = (): void => {
  memoryCache.clear();
  tagToKeys.clear();
};

/**
 * Retrieves data from the tagged cache, or computes and stores it.
 * Provides sub-millisecond retrieval on cache hits.
 */
export const wrapWithCache = async <T>(
  key: string,
  options: CacheOptions,
  fetcher: () => Promise<T>
): Promise<T> => {
  const cached = getCachedData<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const data = await fetcher();
  const ttl = options.ttlSeconds ?? 300; // default 5 minutes
  setCachedData(key, data, options.tags, ttl);
  return data;
};

/**
 * Instantly and synchronously purges one or more cache tags without any delay.
 * Evicts entries from the in-memory cache and triggers Next.js revalidateTag().
 */
export const invalidateCacheTags = (tags: string | string[]): void => {
  const tagList = Array.isArray(tags) ? tags : [tags];

  for (const tag of tagList) {
    if (!tag) continue;

    // 1. Instant synchronous eviction from in-memory store
    const evictedCount = evictTag(tag);
    if (evictedCount > 0) {
      logger.debug({ tag, evictedCount }, "Instant cache evicted in-memory entries");
    }

    // 2. Next.js Data Cache revalidation
    try {
      (revalidateTag as (tag: string, profile?: string) => void)(tag, "max");
    } catch (_err) {
      // revalidateTag may throw if called outside Next.js request context (e.g. CLI or tests)
    }
  }
};

/**
 * Functional object for convenient namespaced usage and full backwards compatibility.
 */
export const cacheService = {
  wrap: wrapWithCache,
  invalidateTags: invalidateCacheTags,
  clearAll: clearAllCache,
  get: getCachedData,
  set: setCachedData,
  delete: deleteCachedData,
};

// Backwards-compatible alias for existing imports
export const CacheService = cacheService;
