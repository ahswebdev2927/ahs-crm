import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveReportDateBounds, generateTrendIntervalBuckets } from "./utils/reports-date.utils";
import { resolveAuthorizedReportsScope } from "./services/reports-authorization.service";
import { generateReportCsv } from "./services/reports-export.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import type { ReportsResponseData } from "./types/reports.types";

describe("Phase 25 - Reports Feature Layer (Functional)", () => {
  describe("Date Bounds & Bucket Utilities", () => {
    it("should resolve date bounds for standard presets correctly", () => {
      const bounds30d = resolveReportDateBounds("30d");
      assert.ok(bounds30d.startMs < bounds30d.endMs);
      const diffDays = Math.round((bounds30d.endMs - bounds30d.startMs) / (1000 * 60 * 60 * 24));
      assert.ok(diffDays >= 30 && diffDays <= 31);

      const boundsToday = resolveReportDateBounds("today");
      assert.ok(boundsToday.startMs <= boundsToday.endMs);

      const bounds7d = resolveReportDateBounds("7d");
      assert.ok(bounds7d.startMs < bounds7d.endMs);
    });

    it("should resolve custom date ranges accurately", () => {
      const from = new Date(2026, 0, 1, 0, 0, 0).toISOString();
      const to = new Date(2026, 0, 15, 23, 59, 59).toISOString();
      const bounds = resolveReportDateBounds("custom", from, to);
      assert.strictEqual(bounds.startDate.getFullYear(), 2026);
      assert.strictEqual(bounds.startDate.getMonth(), 0);
      assert.strictEqual(bounds.startDate.getDate(), 1);
      assert.strictEqual(bounds.endDate.getFullYear(), 2026);
      assert.strictEqual(bounds.endDate.getMonth(), 0);
      assert.strictEqual(bounds.endDate.getDate(), 15);
    });

    it("should generate daily interval buckets for intervals <= 35 days", () => {
      const bounds = resolveReportDateBounds("7d");
      const buckets = generateTrendIntervalBuckets(bounds);
      assert.ok(buckets.length >= 7 && buckets.length <= 9);
      assert.ok(buckets[0].label.length > 0);
    });
  });

  describe("Reports Scope & Authorization Resolver", () => {
    const superAdminUser: AuthenticatedUserPayload = {
      id: "admin-1",
      name: "Super Admin",
      email: "admin@ahs.com",
      role: { name: "SuperAdmin", code: "super_admin" },
      permissions: ["reports:view"],
      teamId: null,
      departmentId: null,
      dataVisibility: "all",
    };

    const managerUser: AuthenticatedUserPayload = {
      id: "mgr-1",
      name: "Sales Manager",
      email: "mgr@ahs.com",
      role: { name: "Sales Manager", code: "sales_manager" },
      permissions: ["reports:view"],
      teamId: 5,
      departmentId: 1,
      dataVisibility: "team",
    };

    const salesRepUser: AuthenticatedUserPayload = {
      id: "rep-1",
      name: "Sales Rep",
      email: "rep@ahs.com",
      role: { name: "Inside Sales", code: "inside_sales" },
      permissions: ["reports:view"],
      teamId: 5,
      departmentId: 1,
      dataVisibility: "own",
    };

    it("should allow SuperAdmin to view any tab with 'all' scope", () => {
      const ctx = resolveAuthorizedReportsScope(superAdminUser, "sales");
      assert.strictEqual(ctx.scope, "all");
      assert.strictEqual(ctx.targetUserId, null);
    });

    it("should lock Sales Manager to their teamId", () => {
      const ctx = resolveAuthorizedReportsScope(managerUser, "manager");
      assert.strictEqual(ctx.scope, "team");
      assert.strictEqual(ctx.teamId, 5);
      assert.strictEqual(ctx.targetTeamId, 5);
    });

    it("should lock Sales Representatives strictly to 'salesperson' tab and self userId", () => {
      const ctx = resolveAuthorizedReportsScope(salesRepUser, "salesperson");
      assert.strictEqual(ctx.scope, "own");
      assert.strictEqual(ctx.userId, "rep-1");
      assert.strictEqual(ctx.targetUserId, "rep-1");
    });

    it("should reject Sales Representatives from accessing unauthorized tabs", () => {
      assert.throws(
        () => resolveAuthorizedReportsScope(salesRepUser, "sales"),
        (err: any) => err.statusCode === 403 && err.errorCode === "FORBIDDEN"
      );

      assert.throws(
        () => resolveAuthorizedReportsScope(salesRepUser, "manager"),
        (err: any) => err.statusCode === 403 && err.errorCode === "FORBIDDEN"
      );

      assert.throws(
        () => resolveAuthorizedReportsScope(salesRepUser, "payments"),
        (err: any) => err.statusCode === 403 && err.errorCode === "FORBIDDEN"
      );
    });
  });

  describe("CSV Generation Service", () => {
    it("should format Sales report dataset into RFC 4180 CSV", () => {
      const mockReport: ReportsResponseData = {
        tab: "sales",
        data: {
          kpis: {
            leadsCreated: 42,
            dealsWon: 8,
            dealsLost: 4,
            conversionRate: 19.0,
            totalRevenuePaise: 45000000,
            averageDealValuePaise: 5625000,
          },
          leadsAndRevenueTrend: [
            { date: "01 Nov", leadsCreated: 10, dealsWon: 2, revenuePaise: 10000000 },
          ],
          pipelineStageDistribution: [
            { stageId: 1, stageName: "New Lead", stageColor: "#3b82f6", order: 1, leadCount: 15, totalValuePaise: 0 },
          ],
          leadsBySource: [
            { source: "Website", count: 20, wonCount: 4, conversionRate: 20 },
          ],
        },
        filterOptions: { teams: [], users: [] },
      };

      const result = generateReportCsv(mockReport);
      assert.ok(result.filename.startsWith("ahs-sales-report-"));
      assert.ok(result.csv.includes("Total Leads Created"));
      assert.ok(result.csv.includes('"42"'));
      assert.ok(result.csv.includes("New Lead"));
    });

    it("should format Payments report with aging buckets into RFC 4180 CSV", () => {
      const mockReport: ReportsResponseData = {
        tab: "payments",
        data: {
          kpis: {
            totalBilledPaise: 10000000,
            totalCollectedPaise: 8000000,
            outstandingPaise: 2000000,
            overduePaise: 500000,
            collectionEfficiencyRate: 80.0,
          },
          billedVsCollectedTrend: [],
          agingBuckets: [
            { range: "Current (0-30d)", invoiceCount: 5, amountPaise: 1500000 },
            { range: "31-60d", invoiceCount: 1, amountPaise: 500000 },
            { range: "61-90d", invoiceCount: 0, amountPaise: 0 },
            { range: "90+d", invoiceCount: 0, amountPaise: 0 },
          ],
          recentPaymentsSummary: [],
        },
        filterOptions: { teams: [], users: [] },
      };

      const result = generateReportCsv(mockReport);
      assert.ok(result.filename.startsWith("ahs-payments-report-"));
      assert.ok(result.csv.includes("Current (0-30d)"));
      assert.ok(result.csv.includes("Collection Efficiency Rate"));
    });
  });
});
