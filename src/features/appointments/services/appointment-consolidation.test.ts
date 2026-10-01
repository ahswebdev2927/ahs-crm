import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import { users, roles, leads, leadStages, appointments, fieldVisits, followUps, leadActivities } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  findFieldVisitById,
  findFieldVisitByAppointmentId,
  createFieldVisitRecord,
  completeFieldVisitRecord,
} from "@/features/field-visits/repositories/field-visit.repository";
import {
  findAppointmentById,
  findAppointmentWithFieldVisit,
  createAppointmentRecord,
  updateAppointmentStatusRecord,
} from "@/features/appointments/repositories/appointment.repository";
import { startVisitSchema, completeFieldVisitSchema } from "@/features/field-visits/schemas/field-visit.schema";

describe("Phase 15 + 16 Appointment & Field Visit Consolidation", () => {
  const testUserId = "test-rep-consolidation-1";
  const testLeadId = "test-lead-consolidation-1";
  const testAppointmentId = "test-appt-consolidation-1";

  before(async () => {
    let fieldRole = await db.query.roles.findFirst({
      where: eq(roles.code, "field_sales"),
    });
    if (!fieldRole) {
      await db.insert(roles).values({
        name: "Field Sales",
        code: "field_sales",
      });
      fieldRole = await db.query.roles.findFirst({
        where: eq(roles.code, "field_sales"),
      });
    }

    await db.insert(users).values({
      id: testUserId,
      email: "rep@ahs.com",
      name: "Field Rep Test",
      passwordHash: "hash",
      roleId: fieldRole?.id || 1,
      status: "active",
    }).onConflictDoNothing();

    let stage = await db.query.leadStages.findFirst();
    if (!stage) {
      await db.insert(leadStages).values({
        name: "New Lead",
        code: "new",
        order: 1,
      });
      stage = await db.query.leadStages.findFirst();
    }

    await db.insert(leads).values({
      id: testLeadId,
      name: "Acme Prospect",
      company: "Acme Corp",
      phone: "+91 9876543210",
      email: "contact@acme.com",
      ownerId: testUserId,
      createdById: testUserId,
      stageId: stage?.id || 1,
    }).onConflictDoNothing();

    await db.insert(appointments).values({
      id: testAppointmentId,
      title: "Initial Site Assessment",
      description: "Measure site dimensions and discuss interior package",
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 90000000),
      location: "123 Business Park, Bangalore",
      status: "scheduled",
      leadId: testLeadId,
      createdById: testUserId,
      assignedToId: testUserId,
    }).onConflictDoNothing();
  });

  after(async () => {
    await db.delete(leadActivities).where(eq(leadActivities.leadId, testLeadId));
    await db.delete(followUps).where(eq(followUps.leadId, testLeadId));
    await db.delete(fieldVisits).where(eq(fieldVisits.leadId, testLeadId));
    await db.delete(appointments).where(eq(appointments.leadId, testLeadId));
    await db.delete(leads).where(eq(leads.id, testLeadId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  test("validates startVisitSchema and completeFieldVisitSchema rules", () => {
    const validStart = startVisitSchema.parse({
      purpose: "Site Measurement",
      visitDate: Date.now(),
    });
    assert.strictEqual(validStart.purpose, "Site Measurement");

    const validComplete = completeFieldVisitSchema.parse({
      summary: "Completed client site inspection and measurement.",
      outcome: "Client agreed to kitchen package.",
      nextAction: "second_visit",
      nextActionDate: Date.now() + 7 * 86400000,
      expenses: 350,
    });
    assert.strictEqual(validComplete.nextAction, "second_visit");
    assert.strictEqual(validComplete.expenses, 350);
  });

  test("creates field visit record linked to appointment and queries via findFieldVisitByAppointmentId", async () => {
    const createdVisit = await createFieldVisitRecord(
      {
        appointmentId: testAppointmentId,
        leadId: testLeadId,
        visitDate: Date.now(),
        purpose: "Initial Site Assessment",
        assignedToId: testUserId,
        expenses: 0,
      },
      testUserId
    );

    assert.ok(createdVisit.id);
    assert.strictEqual(createdVisit.appointmentId, testAppointmentId);

    const lookup = await findFieldVisitByAppointmentId(testAppointmentId);
    assert.ok(lookup);
    assert.strictEqual(lookup?.id, createdVisit.id);
    assert.strictEqual(lookup?.appointmentId, testAppointmentId);
  });

  test("queries appointment with embedded field visit via findAppointmentWithFieldVisit", async () => {
    const apptWithVisit = await findAppointmentWithFieldVisit(testAppointmentId);

    assert.ok(apptWithVisit, "Should return appointment record");
    assert.ok(apptWithVisit.fieldVisit, "Should embed linked field visit");
    assert.strictEqual(apptWithVisit.fieldVisit?.appointmentId, testAppointmentId);
    assert.strictEqual(apptWithVisit.lead?.contactName, "Acme Prospect");
  });

  test("completes field visit record and updates appointment status in repository", async () => {
    const existingVisit = await findFieldVisitByAppointmentId(testAppointmentId);
    assert.ok(existingVisit);

    const completed = await completeFieldVisitRecord(existingVisit.id, {
      summary: "Client reviewed and approved initial layout.",
      outcome: "Proceed to proposal.",
      nextAction: "proposal",
      expenses: 150,
    });

    assert.strictEqual(completed.status, "completed");
    assert.strictEqual(completed.outcome, "Proceed to proposal.");
    assert.strictEqual(completed.expenses, 150);

    const updatedAppt = await updateAppointmentStatusRecord(testAppointmentId, "completed");
    assert.strictEqual(updatedAppt.status, "completed");

    const finalApptWithVisit = await findAppointmentWithFieldVisit(testAppointmentId);
    assert.strictEqual(finalApptWithVisit?.status, "completed");
    assert.strictEqual(finalApptWithVisit?.fieldVisit?.status, "completed");
  });
});
