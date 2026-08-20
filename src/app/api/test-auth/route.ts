import { NextRequest, NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { db } from "@/db";
import { users, sessions, leads, leadPartners, leadStages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse, errorResponse } from "@/lib/api/response";
import {
  requireAuth,
  checkPermission,
  checkLeadAccess
} from "@/features/auth/services/authorization.service";

const JWT_SECRET = process.env.JWT_SECRET || "local_development_jwt_access_secret_key_long_enough";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  // ==========================================
  // SUB-ENDPOINTS CALLED BY THE TEST RUNNER
  // ==========================================
  if (endpoint === "check-auth") {
    const user = await requireAuth();
    return successResponse({ statusCode: 200, message: "Auth checked successfully", data: { user } });
  }

  if (endpoint === "check-permission") {
    const perm = searchParams.get("permission") || "";
    const user = await checkPermission(perm);
    return successResponse({ statusCode: 200, message: "Permission checked successfully", data: { user } });
  }

  if (endpoint === "check-lead-access") {
    const id = searchParams.get("id") || "";
    const action = (searchParams.get("action") as any) || "view";
    const user = await checkLeadAccess(id, action);
    return successResponse({ statusCode: 200, message: "Lead access checked successfully", data: { user } });
  }

  // ==========================================
  // MAIN TEST RUNNER
  // ==========================================
  const origin = new URL(request.url).origin;
  const results: any[] = [];

  // Helper to run a test scenario via local fetch
  const runTestCase = async (
    name: string,
    endpointUrl: string,
    token: string | null,
    expectedStatus: number
  ) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Cookie"] = `session_token=${token}`;
    }

    try {
      const res = await fetch(`${origin}/api/test-auth?${endpointUrl}`, {
        headers,
        cache: "no-store",
      });
      const data = await res.json();
      const statusMatch = res.status === expectedStatus;

      results.push({
        scenario: name,
        expectedStatus,
        actualStatus: res.status,
        passed: statusMatch,
        response: data,
      });
    } catch (err: any) {
      results.push({
        scenario: name,
        expectedStatus,
        actualStatus: 500,
        passed: false,
        error: err.message,
      });
    }
  };

  // 1. Setup Test Data (Leads, Sessions)
  const userInside = await db.select().from(users).where(eq(users.id, "user-inside")).get();
  const userField = await db.select().from(users).where(eq(users.id, "user-field")).get();
  const userAdmin = await db.select().from(users).where(eq(users.id, "user-admin")).get();

  if (!userInside || !userField || !userAdmin) {
    return errorResponse({
      statusCode: 500,
      message: "Database seed data not found. Please run seed script first.",
      errorCode: "SEED_DATA_MISSING",
    });
  }

  // Ensure a lead stage exists
  let stage = await db.select().from(leadStages).all();
  if (stage.length === 0) {
    await db.insert(leadStages).values({
      id: 1,
      name: "New Lead",
      code: "new",
      order: 1,
    });
    stage = await db.select().from(leadStages).all();
  }
  const stageId = stage[0].id;

  // Insert a test lead owned by user-field
  const testLeadId = crypto.randomUUID();
  await db.insert(leads).values({
    id: testLeadId,
    name: "Test Visibility Lead",
    company: "Test Corp",
    ownerId: userField.id,
    createdById: userField.id,
    stageId,
  });

  // Create temporary sessions and sign JWTs
  const createTestToken = async (userId: string, email: string, roleCode: string) => {
    const sessId = crypto.randomUUID();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    await db.insert(sessions).values({
      id: sessId,
      userId,
      expiresAt,
    });
    const token = jwt.sign(
      { sessionId: sessId, userId, email, role: roleCode },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    return { token, sessId };
  };

  const insideSess = await createTestToken(userInside.id, userInside.email, "inside_sales");
  const fieldSess = await createTestToken(userField.id, userField.email, "field_sales");
  const adminSess = await createTestToken(userAdmin.id, userAdmin.email, "super_admin");

  // ==========================================
  // RUN SCENARIOS
  // ==========================================

  // -- Scenario 1: Authentication Checks --
  await runTestCase("Unauthenticated check-auth", "endpoint=check-auth", null, 401);
  await runTestCase("Authenticated check-auth (Inside)", "endpoint=check-auth", insideSess.token, 200);

  // -- Scenario 2: Permission Checks --
  await runTestCase(
    "Sales Rep accessing settings:view",
    "endpoint=check-permission&permission=settings:view",
    insideSess.token,
    403
  );
  await runTestCase(
    "SuperAdmin accessing settings:view",
    "endpoint=check-permission&permission=settings:view",
    adminSess.token,
    200
  );

  // -- Scenario 3: Lead Visibility (No partner access) --
  await runTestCase(
    "Owner accessing their own lead (Field Sales)",
    `endpoint=check-lead-access&id=${testLeadId}&action=view`,
    fieldSess.token,
    200
  );
  await runTestCase(
    "Non-owner accessing restricted lead (Inside Sales)",
    `endpoint=check-lead-access&id=${testLeadId}&action=view`,
    insideSess.token,
    403
  );

  // -- Scenario 4: Partner Visibility (After adding partnership) --
  // Insert partnership relation
  await db.insert(leadPartners).values({
    leadId: testLeadId,
    partnerId: userInside.id,
    role: "collaborator",
  });

  await runTestCase(
    "Partner accessing lead after addition (Inside Sales)",
    `endpoint=check-lead-access&id=${testLeadId}&action=view`,
    insideSess.token,
    200
  );

  // ==========================================
  // CLEAN UP TEST DATA
  // ==========================================
  await db.delete(leadPartners).where(eq(leadPartners.leadId, testLeadId));
  await db.delete(leads).where(eq(leads.id, testLeadId));
  await db.delete(sessions).where(eq(sessions.id, insideSess.sessId));
  await db.delete(sessions).where(eq(sessions.id, fieldSess.sessId));
  await db.delete(sessions).where(eq(sessions.id, adminSess.sessId));

  const allPassed = results.every((r) => r.passed);

  return successResponse({
    statusCode: 200,
    message: allPassed
      ? "All RBAC & Authorization checks passed successfully!"
      : "Some authorization checks failed.",
    data: {
      allPassed,
      results,
    },
  });
});
