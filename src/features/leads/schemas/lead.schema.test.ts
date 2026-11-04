import { describe, it } from "node:test";
import assert from "node:assert";
import { leadQuerySchema } from "./lead.schema";

describe("leadQuerySchema", () => {
  it("validates valid query parameters with date range and owner filter", () => {
    const raw = {
      search: "Acme Corp",
      stageId: "2",
      priority: "high",
      source: "Website",
      ownerId: "user-123",
      status: "active",
      dateFrom: "2026-10-01T00:00:00.000Z",
      dateTo: "2026-10-31T23:59:59.999Z",
      page: "1",
      limit: "25",
    };

    const parsed = leadQuerySchema.parse(raw);

    assert.strictEqual(parsed.search, "Acme Corp");
    assert.strictEqual(parsed.stageId, 2);
    assert.strictEqual(parsed.priority, "high");
    assert.strictEqual(parsed.source, "Website");
    assert.strictEqual(parsed.ownerId, "user-123");
    assert.strictEqual(parsed.status, "active");
    assert.strictEqual(parsed.dateFrom, "2026-10-01T00:00:00.000Z");
    assert.strictEqual(parsed.dateTo, "2026-10-31T23:59:59.999Z");
    assert.strictEqual(parsed.page, 1);
    assert.strictEqual(parsed.limit, 25);
  });

  it("applies defaults for missing optional query parameters", () => {
    const parsed = leadQuerySchema.parse({});

    assert.strictEqual(parsed.status, "active");
    assert.strictEqual(parsed.page, 1);
    assert.strictEqual(parsed.limit, 10);
    assert.strictEqual(parsed.sortBy, "createdAt");
    assert.strictEqual(parsed.sortOrder, "desc");
    assert.strictEqual(parsed.dateFrom, undefined);
    assert.strictEqual(parsed.dateTo, undefined);
  });
});
