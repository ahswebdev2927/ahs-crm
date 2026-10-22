import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { backfillHistoricalActivities } from "../utils/backfill-activities";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { count } from "drizzle-orm";

test("Activity Foundation - Historical Data Backfill execution", async () => {
  const result = await backfillHistoricalActivities();
  assert.ok(typeof result.inserted === "number");
  assert.ok(result.inserted >= 0);

  const totalActivities = await db.select({ total: count() }).from(activities).get();
  assert.ok(totalActivities);
  assert.ok((totalActivities.total ?? 0) >= 0);

  // Re-running backfill should be idempotent (0 new items if ran immediately again)
  const rerunResult = await backfillHistoricalActivities();
  assert.equal(rerunResult.inserted, 0);
});
