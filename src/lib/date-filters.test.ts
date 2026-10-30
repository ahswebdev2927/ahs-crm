import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getDateRangeFromPreset,
  formatDateRangeForApi,
  parseDateRangeFromApi,
  detectPresetFromRange,
} from "./date-filters";

describe("date-filters utility", () => {
  const mockNow = new Date("2026-10-30T10:00:00.000Z");

  it("calculates 'today' preset correctly", () => {
    const range = getDateRangeFromPreset("today", mockNow);
    assert.ok(range.from);
    assert.ok(range.to);
    assert.strictEqual(range.from.getHours(), 0);
    assert.strictEqual(range.from.getMinutes(), 0);
    assert.strictEqual(range.to.getHours(), 23);
    assert.strictEqual(range.to.getMinutes(), 59);
  });

  it("calculates 'yesterday' preset correctly", () => {
    const range = getDateRangeFromPreset("yesterday", mockNow);
    assert.ok(range.from);
    assert.ok(range.to);
    assert.strictEqual(range.from.getDate(), 29);
    assert.strictEqual(range.to.getDate(), 29);
  });

  it("calculates 'last_7_days' preset correctly", () => {
    const range = getDateRangeFromPreset("last_7_days", mockNow);
    assert.ok(range.from);
    assert.ok(range.to);
    assert.strictEqual(range.from.getDate(), 24);
    assert.strictEqual(range.to.getDate(), 30);
  });

  it("formats date range for API query safely", () => {
    const from = new Date(2026, 9, 15, 12, 0, 0); // Oct 15, 2026 local time
    const to = new Date(2026, 9, 20, 15, 30, 0);  // Oct 20, 2026 local time
    const formatted = formatDateRangeForApi({ from, to });

    assert.ok(formatted.dateFrom);
    assert.ok(formatted.dateTo);

    const parsedFrom = new Date(formatted.dateFrom);
    const parsedTo = new Date(formatted.dateTo);

    assert.strictEqual(parsedFrom.getDate(), 15);
    assert.strictEqual(parsedFrom.getHours(), 0);
    assert.strictEqual(parsedFrom.getMinutes(), 0);

    assert.strictEqual(parsedTo.getDate(), 20);
    assert.strictEqual(parsedTo.getHours(), 23);
    assert.strictEqual(parsedTo.getMinutes(), 59);
  });

  it("parses date range from API strings safely", () => {
    const parsed = parseDateRangeFromApi(
      "2026-10-15T00:00:00.000Z",
      "2026-10-20T23:59:59.999Z"
    );
    assert.ok(parsed.from);
    assert.ok(parsed.to);
    assert.strictEqual(parsed.from.getUTCFullYear(), 2026);
    assert.strictEqual(parsed.from.getUTCMonth(), 9); // October is 9 in 0-indexed
    assert.strictEqual(parsed.from.getUTCDate(), 15);
  });

  it("detects presets from ranges", () => {
    const todayRange = getDateRangeFromPreset("today", mockNow);
    const detected = detectPresetFromRange(todayRange.from, todayRange.to, mockNow);
    assert.strictEqual(detected, "today");

    const allTime = detectPresetFromRange(undefined, undefined, mockNow);
    assert.strictEqual(allTime, "all_time");
  });
});
