import { describe, it } from "node:test";
import assert from "node:assert";
import { globalSearchQuerySchema } from "./global-search.schema";

describe("globalSearchQuerySchema", () => {
  it("validates queries with 2 or more characters", () => {
    const parsed = globalSearchQuerySchema.parse({ q: "Acme", limit: "5" });
    assert.strictEqual(parsed.q, "Acme");
    assert.strictEqual(parsed.limit, 5);
  });

  it("applies default limit of 4", () => {
    const parsed = globalSearchQuerySchema.parse({ q: "john" });
    assert.strictEqual(parsed.q, "john");
    assert.strictEqual(parsed.limit, 4);
  });

  it("fails on queries with less than 2 characters", () => {
    assert.throws(() => {
      globalSearchQuerySchema.parse({ q: "a" });
    });
  });
});
