import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  recordAuditLog,
  getAuditLogs,
  exportAuditLogsCsv,
  getAuditFilterMetadata,
} from "./audit.service";
import { auditQuerySchema } from "../schemas/audit.schema";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";

describe("Phase 26 - Audit Core Service Layer (Component 1)", () => {
  const superAdminUser: AuthenticatedUserPayload = {
    id: "user-admin",
    name: "AHS Admin",
    email: "admin@ahs-crm.com",
    role: { code: "super_admin", name: "SuperAdmin" },
    permissions: ["settings:view"],
    teamId: null,
    departmentId: null,
    dataVisibility: "all",
  };

  const managerUser: AuthenticatedUserPayload = {
    id: "user-manager",
    name: "Marcus Vance",
    email: "manager@ahs-crm.com",
    role: { code: "sales_manager", name: "Sales Manager" },
    permissions: ["team:view"],
    teamId: 1,
    departmentId: 1,
    dataVisibility: "team",
  };

  describe("Audit Query Schema Validation", () => {
    it("should apply default pagination when params are empty", () => {
      const parsed = auditQuerySchema.parse({});
      assert.strictEqual(parsed.page, 1);
      assert.strictEqual(parsed.limit, 20);
      assert.strictEqual(parsed.entityType, undefined);
    });

    it("should accept valid filtering params", () => {
      const parsed = auditQuerySchema.parse({
        page: "2",
        limit: "50",
        entityType: "lead",
        action: "lead:created",
        search: "Acme Corp",
      });
      assert.strictEqual(parsed.page, 2);
      assert.strictEqual(parsed.limit, 50);
      assert.strictEqual(parsed.entityType, "lead");
      assert.strictEqual(parsed.action, "lead:created");
      assert.strictEqual(parsed.search, "Acme Corp");
    });

    it("should reject invalid limit or page numbers", () => {
      assert.throws(() => auditQuerySchema.parse({ page: -1 }));
      assert.throws(() => auditQuerySchema.parse({ limit: 500 }));
    });
  });

  describe("Role Authorization Boundary", () => {
    it("should reject non-SuperAdmin access to getAuditLogs", async () => {
      await assert.rejects(
        async () => {
          await getAuditLogs(managerUser, { page: 1, limit: 20 });
        },
        (err: any) => {
          assert.strictEqual(err.name, "AppError");
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.errorCode, "FORBIDDEN");
          return true;
        }
      );
    });

    it("should reject non-SuperAdmin access to exportAuditLogsCsv", async () => {
      await assert.rejects(
        async () => {
          await exportAuditLogsCsv(managerUser, {});
        },
        (err: any) => {
          assert.strictEqual(err.name, "AppError");
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.errorCode, "FORBIDDEN");
          return true;
        }
      );
    });

    it("should reject non-SuperAdmin access to getAuditFilterMetadata", async () => {
      await assert.rejects(
        async () => {
          await getAuditFilterMetadata(managerUser);
        },
        (err: any) => {
          assert.strictEqual(err.name, "AppError");
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.errorCode, "FORBIDDEN");
          return true;
        }
      );
    });
  });

  describe("Audit Record Persistence & Retrieval", () => {
    const testAction = `test:component_1_${Date.now()}`;

    it("should safely write audit log entry without error", async () => {
      await recordAuditLog({
        userId: superAdminUser.id,
        action: testAction,
        entityType: "test_entity",
        entityId: "test-id-123",
        oldData: { status: "draft" },
        newData: { status: "published", title: "Audit Verification" },
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 TestSuite",
      });
    });

    it("should query recorded audit log via getAuditLogs for SuperAdmin", async () => {
      const result = await getAuditLogs(superAdminUser, {
        action: testAction,
        limit: 10,
        page: 1,
      });

      assert.ok(result.items.length >= 1, "Should find at least 1 written test audit log");
      const entry = result.items.find((item) => item.action === testAction);
      assert.ok(entry, "Test audit log entry should exist in query result");
      assert.strictEqual(entry.entityType, "test_entity");
      assert.strictEqual(entry.entityId, "test-id-123");
      assert.deepStrictEqual(entry.oldData, { status: "draft" });
      assert.deepStrictEqual(entry.newData, { status: "published", title: "Audit Verification" });
      assert.strictEqual(entry.ipAddress, "192.168.1.100");
      assert.strictEqual(entry.user?.name, "Alex Thorne");
    });

    it("should export matching records to RFC 4180 CSV with headers", async () => {
      const exportResult = await exportAuditLogsCsv(superAdminUser, {
        action: testAction,
      });

      assert.ok(exportResult.filename.startsWith("ahs-audit-logs-"));
      assert.ok(exportResult.filename.endsWith(".csv"));
      assert.ok(exportResult.count >= 1);

      // Verify CSV header row
      const [headerLine] = exportResult.csv.split("\r\n");
      assert.ok(headerLine.includes("ID"));
      assert.ok(headerLine.includes("Action"));
      assert.ok(headerLine.includes("Entity Type"));
      assert.ok(headerLine.includes("Old Data (JSON)"));
      assert.ok(headerLine.includes("New Data (JSON)"));

      // Verify test data line
      assert.ok(exportResult.csv.includes(testAction));
      assert.ok(exportResult.csv.includes("test_entity"));
    });

    it("should fetch filter metadata including distinct entity types and actions", async () => {
      const metadata = await getAuditFilterMetadata(superAdminUser);
      assert.ok(Array.isArray(metadata.actions));
      assert.ok(Array.isArray(metadata.entityTypes));
      assert.ok(Array.isArray(metadata.actors));
      assert.ok(metadata.actions.includes(testAction));
      assert.ok(metadata.entityTypes.includes("test_entity"));
    });
  });
});
