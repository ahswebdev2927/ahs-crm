import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { db } from "@/db";
import { users, leads, customers, activities, leadStages } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  getTimeline,
  logManualActivity,
  editManualActivity,
  deleteManualActivity,
  logSystemEvent,
} from "../services/activity.service";

// Mock user actors
const mockSuperAdmin: AuthenticatedUserPayload = {
  id: "test-superadmin-act",
  email: "superadmin.act@example.com",
  name: "Super Admin Act",
  role: {
    name: "Super Administrator",
    code: "super_admin",
  },
  permissions: ["leads:view", "leads:edit", "customers:view", "customers:edit"],
  dataVisibility: "all",
  teamId: null,
};

const mockRep1: AuthenticatedUserPayload = {
  id: "test-rep1-act",
  email: "rep1.act@example.com",
  name: "Inside Rep 1",
  role: {
    name: "Inside Sales",
    code: "inside_sales",
  },
  permissions: ["leads:view", "leads:edit", "customers:view", "customers:edit"],
  dataVisibility: "own",
  teamId: null,
};

const mockRep2: AuthenticatedUserPayload = {
  id: "test-rep2-act",
  email: "rep2.act@example.com",
  name: "Inside Rep 2",
  role: {
    name: "Inside Sales",
    code: "inside_sales",
  },
  permissions: ["leads:view", "leads:edit", "customers:view", "customers:edit"],
  dataVisibility: "own",
  teamId: null,
};

const testLeadId = "test-lead-timeline-01";
const testCustomerId = "test-cust-timeline-01";

test("Activity Service & Backend Test Suite", async (t) => {
  // Setup test entities
  await t.test("Setup test users and entities", async () => {
    // 1. Users
    await db.insert(users).values([
      {
        id: mockSuperAdmin.id,
        email: mockSuperAdmin.email,
        passwordHash: "hash123",
        name: mockSuperAdmin.name,
        roleId: 1,
        status: "active",
      },
      {
        id: mockRep1.id,
        email: mockRep1.email,
        passwordHash: "hash123",
        name: mockRep1.name,
        roleId: 3,
        status: "active",
      },
      {
        id: mockRep2.id,
        email: mockRep2.email,
        passwordHash: "hash123",
        name: mockRep2.name,
        roleId: 3,
        status: "active",
      },
    ]).onConflictDoNothing();

    // Ensure a default lead stage exists
    let stage = await db.select().from(leadStages).limit(1).get();
    if (!stage) {
      stage = await db.insert(leadStages).values({
        name: "New Lead",
        code: "new",
        color: "#3b82f6",
        order: 1,
      }).returning().get();
    }

    // 2. Test Lead owned by Rep 1
    await db.insert(leads).values({
      id: testLeadId,
      name: "Acme Test Corp",
      stageId: stage.id,
      ownerId: mockRep1.id,
      createdById: mockRep1.id,
    }).onConflictDoNothing();

    // 3. Test Customer linked to test lead
    await db.insert(customers).values({
      id: testCustomerId,
      leadId: testLeadId,
      name: "Acme Client Division",
      ownerId: mockRep1.id,
    }).onConflictDoNothing();
  });

  // 1. Validation test
  await t.test("getTimeline requires either leadId or customerId", async () => {
    await assert.rejects(
      async () => {
        await getTimeline(mockRep1, {
          category: "all",
          page: 1,
          limit: 20,
        });
      },
      (err: unknown) => {
        const e = err as { statusCode?: number };
        assert.equal(e.statusCode, 400);
        return true;
      }
    );
  });

  // 2. Manual activity logging
  let createdActivityId = "";
  await t.test("logManualActivity creates and returns communication activity", async () => {
    const activity = await logManualActivity(mockRep1, {
      leadId: testLeadId,
      type: "call",
      subject: "Discovery phone call",
      description: "Discussed software requirements and budget.",
      outcome: "connected",
      metadata: { callDurationSeconds: 320 },
    });

    assert.ok(activity.id);
    assert.equal(activity.category, "communication");
    assert.equal(activity.type, "call");
    assert.equal(activity.outcome, "connected");
    assert.equal(activity.canEdit, true);
    assert.equal(activity.canDelete, true);
    assert.equal(activity.user?.name, mockRep1.name);

    createdActivityId = activity.id;
  });

  // 3. Manual activity editing & RBAC ownership
  await t.test("editManualActivity allows author or super admin, rejects non-author", async () => {
    // Non-author (Rep 2) trying to edit Rep 1's activity should fail with 403
    await assert.rejects(
      async () => {
        await editManualActivity(mockRep2, createdActivityId, {
          subject: "Hacked title",
        });
      },
      (err: unknown) => {
        const e = err as { statusCode?: number };
        assert.equal(e.statusCode, 403);
        return true;
      }
    );

    // Author (Rep 1) editing their own activity succeeds
    const updated = await editManualActivity(mockRep1, createdActivityId, {
      subject: "Updated: Discovery phone call (Completed)",
      outcome: "connected",
    });

    assert.equal(updated.subject, "Updated: Discovery phone call (Completed)");
  });

  // 4. System lifecycle event logging & immutability
  let systemEventId = "";
  await t.test("logSystemEvent records event and enforces strict immutability", async () => {
    await logSystemEvent({
      leadId: testLeadId,
      userId: mockRep1.id,
      type: "payment_received",
      subject: "Payment received: ₹1,50,000",
      description: "Received token advance via NEFT",
      outcome: "received",
      metadata: {
        amountPaise: 15000000,
        paymentMethod: "bank_transfer",
      },
    });

    // Verify it was persisted in database
    const timeline = await getTimeline(mockRep1, {
      leadId: testLeadId,
      category: "commercial",
      page: 1,
      limit: 10,
    });

    const paymentItem = timeline.items.find((i) => i.type === "payment_received");
    assert.ok(paymentItem);
    assert.equal(paymentItem.category, "commercial");
    assert.equal(paymentItem.metadata?.formattedAmount, "₹1,50,000.00");
    assert.equal(paymentItem.canEdit, false);
    assert.equal(paymentItem.canDelete, false);

    systemEventId = paymentItem.id;

    // Attempting to edit or delete system events must throw 400 IMMUTABLE_EVENT
    await assert.rejects(
      async () => {
        await editManualActivity(mockSuperAdmin, systemEventId, {
          subject: "Attempted edit on system event",
        });
      },
      (err: unknown) => {
        const e = err as { errorCode?: string };
        assert.equal(e.errorCode, "IMMUTABLE_EVENT");
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await deleteManualActivity(mockSuperAdmin, systemEventId);
      },
      (err: unknown) => {
        const e = err as { errorCode?: string };
        assert.equal(e.errorCode, "IMMUTABLE_EVENT");
        return true;
      }
    );
  });

  // 5. Customer timeline origin lead continuity
  await t.test("Customer timeline includes origin lead activities tagged with isLeadPhase", async () => {
    // Also log a direct customer activity
    await logManualActivity(mockRep1, {
      customerId: testCustomerId,
      type: "note",
      subject: "Customer onboarding note",
      description: "Customer kickoff session scheduled for next week.",
    });

    const customerTimeline = await getTimeline(mockRep1, {
      customerId: testCustomerId,
      category: "all",
      page: 1,
      limit: 20,
    });

    assert.ok(customerTimeline.items.length >= 2);

    // Find the lead-phase activity
    const leadPhaseItem = customerTimeline.items.find((i) => i.leadId === testLeadId && !i.customerId);
    assert.ok(leadPhaseItem, "Origin lead activity should appear in customer timeline");
    assert.equal(leadPhaseItem.isLeadPhase, true);

    // Find the customer-phase activity
    const customerPhaseItem = customerTimeline.items.find((i) => i.customerId === testCustomerId);
    assert.ok(customerPhaseItem);
    assert.equal(customerPhaseItem.isLeadPhase, false);
  });

  // 6. Soft delete manual activity
  await t.test("deleteManualActivity soft-deletes manual entry", async () => {
    const res = await deleteManualActivity(mockRep1, createdActivityId);
    assert.equal(res.success, true);

    // Deleted item should no longer appear in timeline
    const timeline = await getTimeline(mockRep1, {
      leadId: testLeadId,
      category: "all",
      page: 1,
      limit: 20,
    });

    const deletedItem = timeline.items.find((i) => i.id === createdActivityId);
    assert.equal(deletedItem, undefined);
  });

  // Teardown
  await t.test("Teardown test activities", async () => {
    await db.delete(activities).where(eq(activities.leadId, testLeadId));
    await db.delete(customers).where(eq(customers.id, testCustomerId));
    await db.delete(leads).where(eq(leads.id, testLeadId));
  });
});
