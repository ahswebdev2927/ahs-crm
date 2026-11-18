import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  wrapWithCache,
  invalidateCacheTags,
  clearAllCache,
  CACHE_TAGS,
} from "./cache.service";

describe("CacheService - Functional Instant Cache Invalidation", () => {
  beforeEach(() => {
    clearAllCache();
  });

  it("should return cached data on second call without invoking fetcher again", async () => {
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      return { id: 1, name: "SEO Package" };
    };

    const first = await wrapWithCache(
      "services:list",
      { tags: [CACHE_TAGS.SERVICES] },
      fetcher
    );
    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(first, { id: 1, name: "SEO Package" });

    const second = await wrapWithCache(
      "services:list",
      { tags: [CACHE_TAGS.SERVICES] },
      fetcher
    );
    assert.strictEqual(callCount, 1, "Fetcher should NOT be called again on cache hit");
    assert.deepStrictEqual(second, { id: 1, name: "SEO Package" });
  });

  it("should instantly invalidate cached entries when tag is invalidated", async () => {
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      return { timestamp: Date.now(), count: callCount };
    };

    const res1 = await wrapWithCache(
      "dashboard:business:30d",
      { tags: [CACHE_TAGS.DASHBOARD_BUSINESS] },
      fetcher
    );
    assert.strictEqual(callCount, 1);
    assert.strictEqual(res1.count, 1);

    // Call again before invalidation -> hit
    const res2 = await wrapWithCache(
      "dashboard:business:30d",
      { tags: [CACHE_TAGS.DASHBOARD_BUSINESS] },
      fetcher
    );
    assert.strictEqual(callCount, 1);
    assert.strictEqual(res2.count, 1);

    // Perform INSTANT invalidation via pure function
    invalidateCacheTags(CACHE_TAGS.DASHBOARD_BUSINESS);

    // Call immediately after invalidation -> MUST re-fetch fresh data instantly
    const res3 = await wrapWithCache(
      "dashboard:business:30d",
      { tags: [CACHE_TAGS.DASHBOARD_BUSINESS] },
      fetcher
    );
    assert.strictEqual(callCount, 2, "Fetcher should be called immediately on cache miss following invalidation");
    assert.strictEqual(res3.count, 2);
  });

  it("should support invalidating multiple tags simultaneously", async () => {
    let user1Calls = 0;
    let user2Calls = 0;

    await wrapWithCache("user:1", { tags: [CACHE_TAGS.DASHBOARD_USER("user-1")] }, async () => {
      user1Calls++;
      return "user1";
    });
    await wrapWithCache("user:2", { tags: [CACHE_TAGS.DASHBOARD_USER("user-2")] }, async () => {
      user2Calls++;
      return "user2";
    });

    assert.strictEqual(user1Calls, 1);
    assert.strictEqual(user2Calls, 1);

    // Invalidate user 1 only
    invalidateCacheTags([CACHE_TAGS.DASHBOARD_USER("user-1")]);

    await wrapWithCache("user:1", { tags: [CACHE_TAGS.DASHBOARD_USER("user-1")] }, async () => {
      user1Calls++;
      return "user1-new";
    });
    await wrapWithCache("user:2", { tags: [CACHE_TAGS.DASHBOARD_USER("user-2")] }, async () => {
      user2Calls++;
      return "user2-new";
    });

    assert.strictEqual(user1Calls, 2, "User 1 cache should have been evicted");
    assert.strictEqual(user2Calls, 1, "User 2 cache should have remained intact");
  });
});
