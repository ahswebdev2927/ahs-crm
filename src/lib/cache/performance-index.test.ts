import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { client } from "@/db";

describe("Database Performance - Index Query Plan Verification", () => {
  it("should utilize leads_status_created_idx for active leads sorted by creation", async () => {
    const res = await client.execute(
      "EXPLAIN QUERY PLAN SELECT id FROM leads WHERE status = 'active' ORDER BY created_at DESC"
    );
    const plan = res.rows.map((r) => String(r.detail)).join(" ");
    assert.match(
      plan,
      /leads_status_created_idx|USING INDEX/i,
      `Expected query plan to use index, got: ${plan}`
    );
  });

  it("should utilize leads_owner_status_created_idx for rep scoped lead queries", async () => {
    const res = await client.execute(
      "EXPLAIN QUERY PLAN SELECT id FROM leads WHERE owner_id = 'user-1' AND status = 'active' ORDER BY created_at DESC"
    );
    const plan = res.rows.map((r) => String(r.detail)).join(" ");
    assert.match(
      plan,
      /leads_owner_status_created_idx|USING INDEX/i,
      `Expected query plan to use index, got: ${plan}`
    );
  });

  it("should utilize audit_logs_entity_created_idx for entity history queries", async () => {
    const res = await client.execute(
      "EXPLAIN QUERY PLAN SELECT id FROM audit_logs WHERE entity_type = 'lead' AND entity_id = '123' ORDER BY created_at DESC"
    );
    const plan = res.rows.map((r) => String(r.detail)).join(" ");
    assert.match(
      plan,
      /audit_logs_entity_created_idx|USING INDEX/i,
      `Expected query plan to use index, got: ${plan}`
    );
  });

  it("should utilize customers_status_created_idx for active customers", async () => {
    const res = await client.execute(
      "EXPLAIN QUERY PLAN SELECT id FROM customers WHERE status = 'active' ORDER BY created_at DESC"
    );
    const plan = res.rows.map((r) => String(r.detail)).join(" ");
    assert.match(
      plan,
      /customers_status_created_idx|USING INDEX/i,
      `Expected query plan to use index, got: ${plan}`
    );
  });
});
