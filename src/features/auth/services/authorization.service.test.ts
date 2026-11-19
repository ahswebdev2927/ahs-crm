import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  assertUserPermission,
  checkAnyPermission,
  getAppointmentVisibilityFilter,
  getFollowUpVisibilityFilter,
  getFieldVisitVisibilityFilter,
  getQuotationVisibilityFilter,
  getInvoiceVisibilityFilter,
  getPaymentVisibilityFilter,
  checkLeadAccess,
  checkCustomerAccess,
  checkAppointmentAccess,
  checkFollowUpAccess,
  checkFieldVisitAccess,
  checkTaskAccess,
  checkQuotationAccess,
  checkInvoiceAccess,
  checkPaymentAccess,
} from "./authorization.service";
import type { AuthenticatedUserPayload } from "./auth.service";
import { db } from "@/db";
import {
  users,
  leads,
  leadStages,
  customers,
  appointments,
  followUps,
  fieldVisits,
  tasks,
  quotations,
  invoices,
  payments,
  teams,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors/AppError";

describe("Phase 28 — Authorization Security Hardening Unit & Integration Tests", () => {
  // Mock payloads for unit assertion tests
  const adminUser: AuthenticatedUserPayload = {
    id: "user-admin-authz",
    email: "admin@example.com",
    name: "Admin User",
    role: { name: "Super Admin", code: "super_admin" },
    permissions: [
      "leads:view",
      "leads:create",
      "leads:edit",
      "leads:delete",
      "customers:view",
      "customers:create",
      "customers:edit",
      "quotations:view",
      "quotations:create",
      "invoices:view",
      "invoices:create",
      "payments:view",
      "payments:create",
      "tasks:view",
      "tasks:create",
    ],
    dataVisibility: "all",
    teamId: null,
  };

  const repUserTeam1: AuthenticatedUserPayload = {
    id: "user-rep-t1",
    email: "rep1@example.com",
    name: "Rep Team 1",
    role: { name: "Inside Sales", code: "inside_sales" },
    permissions: [
      "leads:view",
      "leads:edit",
      "customers:view",
      "appointments:view",
      "followups:view",
      "tasks:view",
      "quotations:view",
    ],
    dataVisibility: "own",
    teamId: 101,
  };

  const managerUserTeam1: AuthenticatedUserPayload = {
    id: "user-mgr-t1",
    email: "mgr1@example.com",
    name: "Manager Team 1",
    role: { name: "Sales Manager", code: "sales_manager" },
    permissions: [
      "leads:view",
      "leads:edit",
      "customers:view",
      "quotations:view",
      "quotations:create",
      "invoices:view",
      "invoices:create",
      "payments:view",
      "payments:create",
      "tasks:view",
      "tasks:create",
    ],
    dataVisibility: "team",
    teamId: 101,
  };

  const managerUserTeam2: AuthenticatedUserPayload = {
    id: "user-mgr-t2",
    email: "mgr2@example.com",
    name: "Manager Team 2",
    role: { name: "Sales Manager", code: "sales_manager" },
    permissions: [
      "leads:view",
      "leads:edit",
      "customers:view",
      "quotations:view",
      "quotations:create",
      "invoices:view",
      "invoices:create",
      "payments:view",
      "payments:create",
      "tasks:view",
      "tasks:create",
    ],
    dataVisibility: "team",
    teamId: 102,
  };

  const repUserTeam2: AuthenticatedUserPayload = {
    id: "user-rep-t2",
    email: "rep2@example.com",
    name: "Rep Team 2",
    role: { name: "Field Sales", code: "field_sales" },
    permissions: [
      "leads:view",
      "leads:edit",
      "customers:view",
      "appointments:view",
      "followups:view",
      "tasks:view",
    ],
    dataVisibility: "own",
    teamId: 102,
  };

  describe("Permission Checks (assertUserPermission & checkAnyPermission)", () => {
    it("assertUserPermission passes when user has the requested permission", () => {
      assert.doesNotThrow(() => {
        assertUserPermission(adminUser, "leads:delete");
      });
      assert.doesNotThrow(() => {
        assertUserPermission(repUserTeam1, "leads:view");
      });
    });

    it("assertUserPermission throws 403 AppError when user lacks the permission", () => {
      assert.throws(
        () => assertUserPermission(repUserTeam1, "leads:delete"),
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.errorCode, "FORBIDDEN");
          return true;
        }
      );
    });

    it("checkAnyPermission returns user if at least one permission matches", async () => {
      const result = await checkAnyPermission(
        ["leads:delete", "leads:view"],
        repUserTeam1
      );
      assert.strictEqual(result.id, repUserTeam1.id);
    });

    it("checkAnyPermission throws 403 AppError if none of the permissions match", async () => {
      await assert.rejects(
        async () => {
          await checkAnyPermission(["leads:delete", "settings:manage"], repUserTeam1);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.errorCode, "FORBIDDEN");
          return true;
        }
      );
    });
  });

  describe("Data Visibility Filter Generators", () => {
    it("getAppointmentVisibilityFilter returns undefined for super_admin with 'all' visibility", () => {
      const filter = getAppointmentVisibilityFilter("admin-id", "super_admin", "all", null);
      assert.strictEqual(filter, undefined);
    });

    it("getAppointmentVisibilityFilter constructs WHERE clauses for 'own' visibility", () => {
      const filter = getAppointmentVisibilityFilter("rep-id", "inside_sales", "own", 101);
      assert.ok(filter !== undefined);
    });

    it("getFollowUpVisibilityFilter returns undefined for super_admin and defined filter for own", () => {
      assert.strictEqual(getFollowUpVisibilityFilter("admin-id", "super_admin", "all"), undefined);
      assert.ok(getFollowUpVisibilityFilter("rep-id", "inside_sales", "own") !== undefined);
    });

    it("getFieldVisitVisibilityFilter returns undefined for super_admin and defined filter for own", () => {
      assert.strictEqual(getFieldVisitVisibilityFilter("admin-id", "super_admin", "all"), undefined);
      assert.ok(getFieldVisitVisibilityFilter("rep-id", "field_sales", "own") !== undefined);
    });

    it("getQuotationVisibilityFilter returns undefined for super_admin", () => {
      assert.strictEqual(getQuotationVisibilityFilter("admin-id", "super_admin"), undefined);
      assert.ok(getQuotationVisibilityFilter("rep-id", "inside_sales") !== undefined);
    });

    it("getInvoiceVisibilityFilter returns undefined for super_admin", () => {
      assert.strictEqual(getInvoiceVisibilityFilter("admin-id", "super_admin"), undefined);
      assert.ok(getInvoiceVisibilityFilter("rep-id", "inside_sales") !== undefined);
    });

    it("getPaymentVisibilityFilter returns undefined for super_admin", () => {
      assert.strictEqual(getPaymentVisibilityFilter("admin-id", "super_admin"), undefined);
      assert.ok(getPaymentVisibilityFilter("rep-id", "inside_sales") !== undefined);
    });
  });

  describe("Integration: Record Access IDOR & Team Scoping Checks", () => {
    // Entities created for test isolation
    const testTeam1Id = 9101;
    const testTeam2Id = 9102;
    const leadStageId = 901;

    const testLeadIdT1 = "lead-authz-t1";
    const testLeadIdT2 = "lead-authz-t2";
    const testCustomerIdT1 = "cust-authz-t1";
    const testCustomerIdT2 = "cust-authz-t2";
    const testApptIdT1 = "appt-authz-t1";
    const testFollowUpIdT1 = "flw-authz-t1";
    const testVisitIdT1 = "visit-authz-t1";
    const testTaskIdT1 = "task-authz-t1";
    const testQuoteIdT1 = "quote-authz-t1";
    const testInvoiceIdT1 = "inv-authz-t1";
    const testPaymentIdT1 = "pay-authz-t1";

    before(async () => {
      // 1. Setup teams
      await db.insert(teams).values([
        { id: testTeam1Id, name: "Authz Test Team 1", code: "authz_t1" },
        { id: testTeam2Id, name: "Authz Test Team 2", code: "authz_t2" },
      ]).onConflictDoNothing();

      // 2. Setup users in DB matching mock payloads
      await db.insert(users).values([
        {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          passwordHash: "hash",
          roleId: 1,
          status: "active",
          teamId: null,
        },
        {
          id: managerUserTeam1.id,
          name: managerUserTeam1.name,
          email: managerUserTeam1.email,
          passwordHash: "hash",
          roleId: 3,
          status: "active",
          teamId: testTeam1Id,
        },
        {
          id: repUserTeam1.id,
          name: repUserTeam1.name,
          email: repUserTeam1.email,
          passwordHash: "hash",
          roleId: 2,
          status: "active",
          teamId: testTeam1Id,
        },
        {
          id: managerUserTeam2.id,
          name: managerUserTeam2.name,
          email: managerUserTeam2.email,
          passwordHash: "hash",
          roleId: 3,
          status: "active",
          teamId: testTeam2Id,
        },
        {
          id: repUserTeam2.id,
          name: repUserTeam2.name,
          email: repUserTeam2.email,
          passwordHash: "hash",
          roleId: 4,
          status: "active",
          teamId: testTeam2Id,
        },
      ]).onConflictDoNothing();

      // 3. Setup lead stages
      await db.insert(leadStages).values({
        id: leadStageId,
        name: "Stage Authz",
        code: "stage_authz",
        order: 99,
      }).onConflictDoNothing();

      // 4. Setup Leads (Team 1 vs Team 2)
      await db.insert(leads).values([
        {
          id: testLeadIdT1,
          name: "Lead Team 1",
          company: "Company T1",
          ownerId: repUserTeam1.id,
          createdById: repUserTeam1.id,
          stageId: leadStageId,
        },
        {
          id: testLeadIdT2,
          name: "Lead Team 2",
          company: "Company T2",
          ownerId: repUserTeam2.id,
          createdById: repUserTeam2.id,
          stageId: leadStageId,
        },
      ]).onConflictDoNothing();

      // 5. Setup Customers
      await db.insert(customers).values({
        id: testCustomerIdT1,
        name: "Customer Team 1",
        company: "Cust Corp T1",
        ownerId: repUserTeam1.id,
      }).onConflictDoNothing();

      await db.insert(customers).values({
        id: testCustomerIdT2,
        name: "Customer Team 2",
        company: "Cust Corp T2",
        ownerId: repUserTeam2.id,
      }).onConflictDoNothing();

      // 6. Setup Appointment (Team 1)
      await db.insert(appointments).values({
        id: testApptIdT1,
        title: "Meeting Team 1",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        status: "scheduled",
        leadId: testLeadIdT1,
        assignedToId: repUserTeam1.id,
        createdById: managerUserTeam1.id,
      }).onConflictDoNothing();

      // 7. Setup FollowUp (Team 1)
      await db.insert(followUps).values({
        id: testFollowUpIdT1,
        type: "call",
        scheduledAt: new Date(),
        status: "scheduled",
        leadId: testLeadIdT1,
        assignedToId: repUserTeam1.id,
        createdById: managerUserTeam1.id,
      }).onConflictDoNothing();

      // 8. Setup Field Visit (Team 1)
      await db.insert(fieldVisits).values({
        id: testVisitIdT1,
        appointmentId: testApptIdT1,
        leadId: testLeadIdT1,
        visitDate: new Date(),
        purpose: "Site Inspection",
        assignedToId: repUserTeam1.id,
        createdById: managerUserTeam1.id,
        status: "scheduled",
      }).onConflictDoNothing();

      // 9. Setup Task (Team 1)
      await db.insert(tasks).values({
        id: testTaskIdT1,
        title: "Task Team 1",
        assignedToId: repUserTeam1.id,
        createdById: managerUserTeam1.id,
        status: "pending",
        priority: "medium",
      }).onConflictDoNothing();

      // 10. Setup Quotation (Team 1)
      await db.insert(quotations).values({
        id: testQuoteIdT1,
        quoteNumber: "QT-TEST-0001",
        leadId: testLeadIdT1,
        createdById: repUserTeam1.id,
        validUntil: new Date(),
        subtotal: 100000,
        discount: 0,
        tax: 18000,
        total: 118000,
        status: "draft",
      }).onConflictDoNothing();

      // 11. Setup Invoice (Team 1)
      await db.insert(invoices).values({
        id: testInvoiceIdT1,
        invoiceNumber: "INV-TEST-0001",
        customerId: testCustomerIdT1,
        quotationId: testQuoteIdT1,
        issueDate: new Date(),
        dueDate: new Date(),
        subtotal: 100000,
        discount: 0,
        tax: 18000,
        total: 118000,
        amountPaid: 0,
        amountDue: 118000,
        status: "unpaid",
        createdById: repUserTeam1.id,
      }).onConflictDoNothing();

      // 12. Setup Payment (Team 1)
      await db.insert(payments).values({
        id: testPaymentIdT1,
        invoiceId: testInvoiceIdT1,
        customerId: testCustomerIdT1,
        amount: 50000,
        paymentDate: new Date(),
        paymentMethod: "bank_transfer",
        receivedById: repUserTeam1.id,
        status: "completed",
      }).onConflictDoNothing();
    });

    after(async () => {
      const safeDelete = async (fn: () => Promise<unknown>) => {
        for (let i = 0; i < 5; i++) {
          try {
            await fn();
            return;
          } catch (e: unknown) {
            const err = e as { code?: string; cause?: { code?: string } };
            if (err?.code === "SQLITE_BUSY" || err?.cause?.code === "SQLITE_BUSY") {
              await new Promise((resolve) => setTimeout(resolve, 50 * (i + 1)));
            } else {
              break;
            }
          }
        }
      };

      // Clean up test data safely
      await safeDelete(() => db.delete(payments).where(eq(payments.id, testPaymentIdT1)));
      await safeDelete(() => db.delete(invoices).where(eq(invoices.id, testInvoiceIdT1)));
      await safeDelete(() => db.delete(quotations).where(eq(quotations.id, testQuoteIdT1)));
      await safeDelete(() => db.delete(tasks).where(eq(tasks.id, testTaskIdT1)));
      await safeDelete(() => db.delete(fieldVisits).where(eq(fieldVisits.id, testVisitIdT1)));
      await safeDelete(() => db.delete(followUps).where(eq(followUps.id, testFollowUpIdT1)));
      await safeDelete(() => db.delete(appointments).where(eq(appointments.id, testApptIdT1)));
      await safeDelete(() => db.delete(customers).where(eq(customers.id, testCustomerIdT1)));
      await safeDelete(() => db.delete(customers).where(eq(customers.id, testCustomerIdT2)));
      await safeDelete(() => db.delete(leads).where(eq(leads.id, testLeadIdT1)));
      await safeDelete(() => db.delete(leads).where(eq(leads.id, testLeadIdT2)));
      await safeDelete(() => db.delete(leadStages).where(eq(leadStages.id, leadStageId)));
      await safeDelete(() => db.delete(users).where(eq(users.id, repUserTeam1.id)));
      await safeDelete(() => db.delete(users).where(eq(users.id, managerUserTeam1.id)));
      await safeDelete(() => db.delete(users).where(eq(users.id, repUserTeam2.id)));
      await safeDelete(() => db.delete(users).where(eq(users.id, managerUserTeam2.id)));
      await safeDelete(() => db.delete(users).where(eq(users.id, adminUser.id)));
      await safeDelete(() => db.delete(teams).where(eq(teams.id, testTeam1Id)));
      await safeDelete(() => db.delete(teams).where(eq(teams.id, testTeam2Id)));
    });

    it("checkLeadAccess: Allows Super Admin access across any lead", async () => {
      const result = await checkLeadAccess(testLeadIdT1, "view", adminUser);
      assert.strictEqual(result.id, adminUser.id);
    });

    it("checkLeadAccess: Allows Team Manager access to team member's lead", async () => {
      const mockMgr1WithTeam = { ...managerUserTeam1, teamId: testTeam1Id };
      const result = await checkLeadAccess(testLeadIdT1, "view", mockMgr1WithTeam);
      assert.strictEqual(result.id, managerUserTeam1.id);
    });

    it("checkLeadAccess: Denies Team Manager access to another team's lead (403)", async () => {
      const mockMgr2WithTeam = { ...managerUserTeam2, teamId: testTeam2Id };
      await assert.rejects(
        async () => {
          await checkLeadAccess(testLeadIdT1, "view", mockMgr2WithTeam);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it("checkCustomerAccess: Scopes access by team and rejects unauthorized rep", async () => {
      const mockMgr1 = { ...managerUserTeam1, teamId: testTeam1Id };
      const mockMgr2 = { ...managerUserTeam2, teamId: testTeam2Id };

      // Manager 1 can view Customer 1
      const res = await checkCustomerAccess(testCustomerIdT1, "view", mockMgr1);
      assert.strictEqual(res.id, mockMgr1.id);

      // Manager 2 cannot view Customer 1 (cross-team IDOR block)
      await assert.rejects(
        async () => {
          await checkCustomerAccess(testCustomerIdT1, "view", mockMgr2);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it("checkAppointmentAccess: Allows assignee/creator/team manager, denies stranger", async () => {
      const mockRep1 = { ...repUserTeam1, teamId: testTeam1Id };
      const mockRep2 = { ...repUserTeam2, teamId: testTeam2Id };

      // Assignee has access
      const res = await checkAppointmentAccess(testApptIdT1, "view", mockRep1);
      assert.strictEqual(res.id, mockRep1.id);

      // Rep from Team 2 is blocked
      await assert.rejects(
        async () => {
          await checkAppointmentAccess(testApptIdT1, "view", mockRep2);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it("checkFollowUpAccess: Allows assignee/creator/team manager, denies stranger", async () => {
      const mockRep1 = { ...repUserTeam1, teamId: testTeam1Id };
      const mockRep2 = { ...repUserTeam2, teamId: testTeam2Id };

      const res = await checkFollowUpAccess(testFollowUpIdT1, "view", mockRep1);
      assert.strictEqual(res.id, mockRep1.id);

      await assert.rejects(
        async () => {
          await checkFollowUpAccess(testFollowUpIdT1, "view", mockRep2);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it("checkFieldVisitAccess: Allows assignee/creator/team manager, denies stranger", async () => {
      const mockRep1 = { ...repUserTeam1, teamId: testTeam1Id };
      const mockRep2 = { ...repUserTeam2, teamId: testTeam2Id };

      const res = await checkFieldVisitAccess(testVisitIdT1, "view", mockRep1);
      assert.strictEqual(res.id, mockRep1.id);

      await assert.rejects(
        async () => {
          await checkFieldVisitAccess(testVisitIdT1, "view", mockRep2);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it("checkTaskAccess: Allows assignee/creator/team manager, denies stranger", async () => {
      const mockRep1 = { ...repUserTeam1, teamId: testTeam1Id };
      const mockRep2 = { ...repUserTeam2, teamId: testTeam2Id };

      const res = await checkTaskAccess(testTaskIdT1, "view", mockRep1);
      assert.strictEqual(res.id, mockRep1.id);

      await assert.rejects(
        async () => {
          await checkTaskAccess(testTaskIdT1, "view", mockRep2);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it("checkQuotationAccess: Allows creator and team manager, denies cross-team access", async () => {
      const mockMgr1 = { ...managerUserTeam1, teamId: testTeam1Id };
      const mockMgr2 = { ...managerUserTeam2, teamId: testTeam2Id };

      // Team 1 manager has access
      const res = await checkQuotationAccess(testQuoteIdT1, "view", mockMgr1);
      assert.strictEqual(res.id, mockMgr1.id);

      // Team 2 manager blocked
      await assert.rejects(
        async () => {
          await checkQuotationAccess(testQuoteIdT1, "view", mockMgr2);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it("checkInvoiceAccess: Allows creator and team manager, denies cross-team access", async () => {
      const mockMgr1 = { ...managerUserTeam1, teamId: testTeam1Id };
      const mockMgr2 = { ...managerUserTeam2, teamId: testTeam2Id };

      const res = await checkInvoiceAccess(testInvoiceIdT1, "view", mockMgr1);
      assert.strictEqual(res.id, mockMgr1.id);

      await assert.rejects(
        async () => {
          await checkInvoiceAccess(testInvoiceIdT1, "view", mockMgr2);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    it("checkPaymentAccess: Allows receiver and team manager, denies cross-team access", async () => {
      const mockMgr1 = { ...managerUserTeam1, teamId: testTeam1Id };
      const mockMgr2 = { ...managerUserTeam2, teamId: testTeam2Id };

      const res = await checkPaymentAccess(testPaymentIdT1, "view", mockMgr1);
      assert.strictEqual(res.id, mockMgr1.id);

      await assert.rejects(
        async () => {
          await checkPaymentAccess(testPaymentIdT1, "view", mockMgr2);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  describe("Production Gating for Test Endpoints", () => {
    it("rejects test endpoints with 404 in production environment", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalAppEnv = process.env.APP_ENV;
      const env = process.env as Record<string, string | undefined>;

      try {
        env.NODE_ENV = "production";
        env.APP_ENV = "production";

        const { GET: getTestAuth } = await import("@/app/api/test-auth/route");
        const { GET: getTestSecurity } = await import("@/app/api/test-security/route");
        const { GET: getTestErrorHandler } = await import("@/app/api/test-error-handler/route");

        const dummyRequest = {
          url: "http://localhost:3000/api/test-auth",
        } as unknown as Parameters<typeof getTestAuth>[0];

        const dummyContext = { params: Promise.resolve({}) } as unknown as Parameters<typeof getTestAuth>[1];

        const resAuth = await getTestAuth(dummyRequest, dummyContext);
        assert.strictEqual(resAuth.status, 404);

        const resSec = await getTestSecurity(dummyRequest, dummyContext);
        assert.strictEqual(resSec.status, 404);

        const resErr = await getTestErrorHandler(dummyRequest, dummyContext);
        assert.strictEqual(resErr.status, 404);
      } finally {
        env.NODE_ENV = originalNodeEnv;
        env.APP_ENV = originalAppEnv;
      }
    });
  });
});
