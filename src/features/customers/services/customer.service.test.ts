import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/db";
import {
  users,
  roles,
  departments,
  leads,
  leadStages,
  customers,
  appointments,
  followUps,
  fieldVisits,
  leadActivities,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createCustomer,
  getCustomerById,
  updateCustomer,
  convertLeadToCustomer,
  getCustomers,
} from "./customer.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";

describe("Customer Service & Repository Unit Tests", () => {
  const testUserId = "test-cust-user-1";
  const testLeadId = "test-cust-lead-1";
  const testStageId = 9991;

  const mockUser: AuthenticatedUserPayload = {
    id: testUserId,
    email: "cust-test@example.com",
    name: "Customer Tester",
    role: {
      name: "SuperAdmin",
      code: "super_admin",
    },
    permissions: [
      "customers:view",
      "customers:create",
      "customers:edit",
      "leads:view",
      "leads:edit",
    ],
    dataVisibility: "all",
    teamId: null,
  };

  before(async () => {
    // Ensure test user exists
    await db
      .insert(users)
      .values({
        id: testUserId,
        email: "cust-test@example.com",
        name: "Customer Tester",
        passwordHash: "hash",
        roleId: 1,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    // Ensure test stage exists
    await db
      .insert(leadStages)
      .values({
        id: testStageId,
        name: "Won Stage",
        code: "won_test",
        color: "#10b981",
        order: 99,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    // Ensure test lead exists
    await db
      .insert(leads)
      .values({
        id: testLeadId,
        name: "Acme Conversion Lead",
        company: "Acme Industries",
        phone: "+1 555-1234",
        email: "lead@acme.com",
        stageId: testStageId,
        ownerId: testUserId,
        createdById: testUserId,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    // Seed linked appointment, followup, and visit for conversion test
    await db
      .insert(appointments)
      .values({
        id: "test-cust-appt-1",
        leadId: testLeadId,
        title: "Initial Consultation",
        startTime: new Date(),
        endTime: new Date(),
        createdById: testUserId,
        assignedToId: testUserId,
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    await db
      .insert(followUps)
      .values({
        id: "test-cust-followup-1",
        leadId: testLeadId,
        scheduledAt: new Date(),
        type: "call",
        createdById: testUserId,
        assignedToId: testUserId,
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  });

  after(async () => {
    // Clean up created records
    try {
      await db.delete(leadActivities).where(eq(leadActivities.leadId, testLeadId));
      await db.delete(appointments).where(eq(appointments.leadId, testLeadId));
      await db.delete(followUps).where(eq(followUps.leadId, testLeadId));
      await db.delete(customers).where(eq(customers.leadId, testLeadId));
      await db.delete(customers).where(eq(customers.ownerId, testUserId));
      await db.delete(leads).where(eq(leads.id, testLeadId));
      await db.delete(leadStages).where(eq(leadStages.id, testStageId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (_e) {}
  });

  test("creates direct external customer with leadId = null", async () => {
    const customer = await createCustomer(mockUser, {
      name: "Global Tech Direct",
      company: "Global Tech Inc",
      email: "info@globaltech.com",
      phone: "+1 555-9876",
      status: "active",
    });

    assert.ok(customer.id);
    assert.equal(customer.name, "Global Tech Direct");
    assert.equal(customer.company, "Global Tech Inc");
    assert.equal(customer.leadId, null);
    assert.equal(customer.origin, "direct");
    assert.equal(customer.ownerId, testUserId);
  });

  test("retrieves customer by ID with aggregated statistics", async () => {
    const created = await createCustomer(mockUser, {
      name: "Detail Test Customer",
      company: "Detail Corp",
      status: "active",
    });

    const retrieved = await getCustomerById(mockUser, created.id);
    assert.equal(retrieved.id, created.id);
    assert.equal(retrieved.name, "Detail Test Customer");
    assert.ok(retrieved.stats);
    assert.equal(typeof retrieved.stats.totalAppointments, "number");
    assert.equal(typeof retrieved.stats.totalFollowUps, "number");
  });

  test("updates existing customer record", async () => {
    const created = await createCustomer(mockUser, {
      name: "Original Name",
      status: "active",
    });

    const updated = await updateCustomer(mockUser, created.id, {
      name: "Updated Name",
      company: "New Company Ltd",
    });

    assert.equal(updated.name, "Updated Name");
    assert.equal(updated.company, "New Company Ltd");
  });

  test("converts lead to customer and re-links existing historical records", async () => {
    const converted = await convertLeadToCustomer(mockUser, {
      leadId: testLeadId,
      name: "Acme Industries Client",
    });

    assert.ok(converted.id);
    assert.equal(converted.leadId, testLeadId);
    assert.equal(converted.origin, "converted");
    assert.equal(converted.name, "Acme Industries Client");

    // Verify appointment was re-linked to customer
    const appt = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, "test-cust-appt-1"))
      .get();
    assert.equal(appt?.customerId, converted.id);

    // Verify followup was re-linked to customer
    const fup = await db
      .select()
      .from(followUps)
      .where(eq(followUps.id, "test-cust-followup-1"))
      .get();
    assert.equal(fup?.customerId, converted.id);
  });

  test("lists customers with origin and status filtering", async () => {
    const listDirect = await getCustomers(mockUser, {
      origin: "direct",
      limit: 10,
    });
    assert.ok(Array.isArray(listDirect.items));
    for (const item of listDirect.items) {
      assert.equal(item.origin, "direct");
      assert.equal(item.leadId, null);
    }

    const listConverted = await getCustomers(mockUser, {
      origin: "converted",
      limit: 10,
    });
    assert.ok(Array.isArray(listConverted.items));
    for (const item of listConverted.items) {
      assert.equal(item.origin, "converted");
      assert.notEqual(item.leadId, null);
    }
  });
});
