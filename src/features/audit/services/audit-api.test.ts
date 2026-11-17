import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as getLogsHandler } from "@/app/api/audit/logs/route";
import { GET as getExportHandler } from "@/app/api/audit/export/route";
import { GET as getFiltersHandler } from "@/app/api/audit/filters/route";

describe("Phase 26 - Audit API Handlers (Component 3)", () => {
  it("GET /api/audit/logs returns 401 when unauthenticated", async () => {
    const req = new NextRequest("http://localhost:3000/api/audit/logs");
    const res = await getLogsHandler(req, { params: Promise.resolve({}) });
    assert.strictEqual(res.status, 401);

    const json = await res.json();
    assert.strictEqual(json.status, false);
    assert.strictEqual(json.statusCode, 401);
    assert.strictEqual(json.errorCode, "UNAUTHORIZED");
  });

  it("GET /api/audit/export returns 401 when unauthenticated", async () => {
    const req = new NextRequest("http://localhost:3000/api/audit/export");
    const res = await getExportHandler(req, { params: Promise.resolve({}) });
    assert.strictEqual(res.status, 401);

    const json = await res.json();
    assert.strictEqual(json.status, false);
    assert.strictEqual(json.statusCode, 401);
    assert.strictEqual(json.errorCode, "UNAUTHORIZED");
  });

  it("GET /api/audit/filters returns 401 when unauthenticated", async () => {
    const req = new NextRequest("http://localhost:3000/api/audit/filters");
    const res = await getFiltersHandler(req, { params: Promise.resolve({}) });
    assert.strictEqual(res.status, 401);

    const json = await res.json();
    assert.strictEqual(json.status, false);
    assert.strictEqual(json.statusCode, 401);
    assert.strictEqual(json.errorCode, "UNAUTHORIZED");
  });
});
