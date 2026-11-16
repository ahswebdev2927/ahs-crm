import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { recordAuditLog, getAuditLogs } from "./audit.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";

describe("Phase 26 - Mutation Auditing Across CRM Modules (Component 2)", () => {
  const superAdminUser: AuthenticatedUserPayload = {
    id: "user-admin",
    name: "Alex Thorne",
    email: "admin@ahs-crm.com",
    role: { code: "super_admin", name: "SuperAdmin" },
    permissions: ["settings:view"],
    teamId: null,
    departmentId: null,
    dataVisibility: "all",
  };

  const testBatch = `run_${Date.now()}`;

  describe("Lead Mutation Auditing", () => {
    it("records lead:created with initial properties", async () => {
      const action = `lead:created_${testBatch}`;
      await recordAuditLog({
        userId: superAdminUser.id,
        action,
        entityType: "lead",
        entityId: "lead-test-01",
        newData: {
          name: "Acme Tech Pvt Ltd",
          source: "website",
          priority: "high",
          stageId: 1,
          ownerId: superAdminUser.id,
        },
      });

      const logs = await getAuditLogs(superAdminUser, { action });
      assert.strictEqual(logs.items.length, 1);
      assert.strictEqual(logs.items[0].entityType, "lead");
      assert.strictEqual(logs.items[0].newData?.name, "Acme Tech Pvt Ltd");
      assert.strictEqual(logs.items[0].user?.name, "Alex Thorne");
    });

    it("records lead:updated with field delta", async () => {
      const action = `lead:updated_${testBatch}`;
      await recordAuditLog({
        userId: superAdminUser.id,
        action,
        entityType: "lead",
        entityId: "lead-test-01",
        oldData: { priority: "medium", phone: "9876543210" },
        newData: { priority: "high", phone: "9876543211" },
      });

      const logs = await getAuditLogs(superAdminUser, { action });
      assert.strictEqual(logs.items.length, 1);
      assert.strictEqual(logs.items[0].oldData?.priority, "medium");
      assert.strictEqual(logs.items[0].newData?.priority, "high");
    });

    it("records lead:transferred / lead:assigned on owner changes", async () => {
      const action = `lead:transferred_${testBatch}`;
      await recordAuditLog({
        userId: superAdminUser.id,
        action,
        entityType: "lead",
        entityId: "lead-test-01",
        oldData: { ownerId: "user-prev", ownerName: "Previous Rep" },
        newData: { ownerId: "user-new", leadName: "Acme Tech Pvt Ltd" },
      });

      const logs = await getAuditLogs(superAdminUser, { action });
      assert.strictEqual(logs.items.length, 1);
      assert.strictEqual(logs.items[0].oldData?.ownerId, "user-prev");
      assert.strictEqual(logs.items[0].newData?.ownerId, "user-new");
    });

    it("records lead:stage_changed on stage transition", async () => {
      const action = `lead:stage_changed_${testBatch}`;
      await recordAuditLog({
        userId: superAdminUser.id,
        action,
        entityType: "lead",
        entityId: "lead-test-01",
        oldData: { stageId: 1, stageName: "New" },
        newData: { stageId: 2, stageName: "Contacted", reason: "First qualification call completed" },
      });

      const logs = await getAuditLogs(superAdminUser, { action });
      assert.strictEqual(logs.items.length, 1);
      assert.strictEqual(logs.items[0].oldData?.stageName, "New");
      assert.strictEqual(logs.items[0].newData?.stageName, "Contacted");
    });

    it("records lead_partner:added and lead_partner:removed", async () => {
      const addAction = `lead_partner:added_${testBatch}`;
      const removeAction = `lead_partner:removed_${testBatch}`;

      await recordAuditLog({
        userId: superAdminUser.id,
        action: addAction,
        entityType: "lead_partner",
        entityId: "partner-rec-01",
        newData: { leadId: "lead-test-01", partnerName: "Inside Rep", percentage: 40 },
      });

      await recordAuditLog({
        userId: superAdminUser.id,
        action: removeAction,
        entityType: "lead_partner",
        entityId: "partner-rec-01",
        oldData: { percentage: 40 },
        newData: { status: "removed", removalReason: "Lead transferred to Enterprise" },
      });

      const addLogs = await getAuditLogs(superAdminUser, { action: addAction });
      const removeLogs = await getAuditLogs(superAdminUser, { action: removeAction });

      assert.strictEqual(addLogs.items.length, 1);
      assert.strictEqual(addLogs.items[0].newData?.percentage, 40);
      assert.strictEqual(removeLogs.items.length, 1);
      assert.strictEqual(removeLogs.items[0].newData?.status, "removed");
    });
  });

  describe("Customer & Service Mutation Auditing", () => {
    it("records customer:created and customer:converted_from_lead", async () => {
      const convertAction = `customer:converted_from_lead_${testBatch}`;
      await recordAuditLog({
        userId: superAdminUser.id,
        action: convertAction,
        entityType: "customer",
        entityId: "cust-01",
        newData: {
          leadId: "lead-test-01",
          customerName: "Acme Tech Pvt Ltd",
          ownerId: superAdminUser.id,
        },
      });

      const logs = await getAuditLogs(superAdminUser, { action: convertAction });
      assert.strictEqual(logs.items.length, 1);
      assert.strictEqual(logs.items[0].entityType, "customer");
      assert.strictEqual(logs.items[0].newData?.customerName, "Acme Tech Pvt Ltd");
    });

    it("records service:created and service:archived", async () => {
      const createAction = `service:created_${testBatch}`;
      const archiveAction = `service:archived_${testBatch}`;

      await recordAuditLog({
        userId: superAdminUser.id,
        action: createAction,
        entityType: "service",
        entityId: "101",
        newData: { name: "Cloud Migration", code: "SRV-CLOUD", billingModel: "one_time", price: 15000000 },
      });

      await recordAuditLog({
        userId: superAdminUser.id,
        action: archiveAction,
        entityType: "service",
        entityId: "101",
        oldData: { status: "active" },
        newData: { status: "archived" },
      });

      const createLogs = await getAuditLogs(superAdminUser, { action: createAction });
      const archiveLogs = await getAuditLogs(superAdminUser, { action: archiveAction });

      assert.strictEqual(createLogs.items.length, 1);
      assert.strictEqual(createLogs.items[0].newData?.code, "SRV-CLOUD");
      assert.strictEqual(archiveLogs.items.length, 1);
      assert.strictEqual(archiveLogs.items[0].newData?.status, "archived");
    });
  });

  describe("Financial Mutation Auditing (Quotes, Invoices, Payments)", () => {
    it("records quotation:created and quotation:status_changed", async () => {
      const quoteCreated = `quotation:created_${testBatch}`;
      const quoteStatus = `quotation:status_changed_${testBatch}`;

      await recordAuditLog({
        userId: superAdminUser.id,
        action: quoteCreated,
        entityType: "quotation",
        entityId: "quote-01",
        newData: { quoteNumber: "Q-2026-001", total: 17700000, subtotal: 15000000 },
      });

      await recordAuditLog({
        userId: superAdminUser.id,
        action: quoteStatus,
        entityType: "quotation",
        entityId: "quote-01",
        oldData: { status: "draft" },
        newData: { status: "accepted" },
      });

      const cLogs = await getAuditLogs(superAdminUser, { action: quoteCreated });
      const sLogs = await getAuditLogs(superAdminUser, { action: quoteStatus });

      assert.strictEqual(cLogs.items.length, 1);
      assert.strictEqual(cLogs.items[0].newData?.quoteNumber, "Q-2026-001");
      assert.strictEqual(sLogs.items.length, 1);
      assert.strictEqual(sLogs.items[0].newData?.status, "accepted");
    });

    it("records invoice:created and invoice:status_changed", async () => {
      const invCreated = `invoice:created_${testBatch}`;
      const invStatus = `invoice:status_changed_${testBatch}`;

      await recordAuditLog({
        userId: superAdminUser.id,
        action: invCreated,
        entityType: "invoice",
        entityId: "inv-01",
        newData: { invoiceNumber: "INV-2026-001", total: 17700000, customerId: "cust-01" },
      });

      await recordAuditLog({
        userId: superAdminUser.id,
        action: invStatus,
        entityType: "invoice",
        entityId: "inv-01",
        oldData: { status: "sent" },
        newData: { status: "paid" },
      });

      const cLogs = await getAuditLogs(superAdminUser, { action: invCreated });
      const sLogs = await getAuditLogs(superAdminUser, { action: invStatus });

      assert.strictEqual(cLogs.items.length, 1);
      assert.strictEqual(cLogs.items[0].newData?.invoiceNumber, "INV-2026-001");
      assert.strictEqual(sLogs.items.length, 1);
      assert.strictEqual(sLogs.items[0].newData?.status, "paid");
    });

    it("records payment:received and payment:status_changed", async () => {
      const payReceived = `payment:received_${testBatch}`;
      await recordAuditLog({
        userId: superAdminUser.id,
        action: payReceived,
        entityType: "payment",
        entityId: "pay-01",
        newData: { invoiceId: "inv-01", amount: 10000000, method: "bank_transfer" },
      });

      const pLogs = await getAuditLogs(superAdminUser, { action: payReceived });
      assert.strictEqual(pLogs.items.length, 1);
      assert.strictEqual(pLogs.items[0].newData?.amount, 10000000);
      assert.strictEqual(pLogs.items[0].newData?.method, "bank_transfer");
    });
  });

  describe("User & Security Mutation Auditing", () => {
    it("records user:created, user:updated, user:password_reset, and user:status_changed", async () => {
      const uCreated = `user:created_${testBatch}`;
      const uUpdated = `user:updated_${testBatch}`;
      const uPassword = `user:password_reset_${testBatch}`;
      const uStatus = `user:status_changed_${testBatch}`;

      await recordAuditLog({
        userId: superAdminUser.id,
        action: uCreated,
        entityType: "user",
        entityId: "user-new-01",
        newData: { name: "Jane Doe", email: "jane@ahs.com", roleId: 3 },
      });

      await recordAuditLog({
        userId: superAdminUser.id,
        action: uUpdated,
        entityType: "user",
        entityId: "user-new-01",
        oldData: { name: "Jane Doe" },
        newData: { name: "Jane Smith" },
      });

      await recordAuditLog({
        userId: superAdminUser.id,
        action: uPassword,
        entityType: "user",
        entityId: "user-new-01",
      });

      await recordAuditLog({
        userId: superAdminUser.id,
        action: uStatus,
        entityType: "user",
        entityId: "user-new-01",
        oldData: { status: "active" },
        newData: { status: "inactive" },
      });

      const [cLog, uLog, pLog, sLog] = await Promise.all([
        getAuditLogs(superAdminUser, { action: uCreated }),
        getAuditLogs(superAdminUser, { action: uUpdated }),
        getAuditLogs(superAdminUser, { action: uPassword }),
        getAuditLogs(superAdminUser, { action: uStatus }),
      ]);

      assert.strictEqual(cLog.items.length, 1);
      assert.strictEqual(cLog.items[0].newData?.email, "jane@ahs.com");

      assert.strictEqual(uLog.items.length, 1);
      assert.strictEqual(uLog.items[0].oldData?.name, "Jane Doe");
      assert.strictEqual(uLog.items[0].newData?.name, "Jane Smith");

      assert.strictEqual(pLog.items.length, 1);
      assert.strictEqual(pLog.items[0].entityType, "user");

      assert.strictEqual(sLog.items.length, 1);
      assert.strictEqual(sLog.items[0].oldData?.status, "active");
      assert.strictEqual(sLog.items[0].newData?.status, "inactive");
    });
  });
});
