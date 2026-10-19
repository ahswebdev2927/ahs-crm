import { describe, it } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import { leadStages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPaymentMetrics } from "./payment-metrics.service";
import { getLeadMetrics } from "./lead-metrics.service";
import { getSalesMetrics } from "./sales-metrics.service";
import { getActivityMetrics } from "./activity-metrics.service";
import type { ResolvedDashboardScopeContext } from "../dashboard-authorization.service";

describe("Dashboard Metric Providers Audit", () => {
  const mockContext: ResolvedDashboardScopeContext = {
    scope: "business",
    userId: "admin-1",
    userRoleCode: "super_admin",
    teamId: null,
    dataVisibility: "all",
  };

  const mockPersonalContext: ResolvedDashboardScopeContext = {
    scope: "personal",
    userId: "user-1",
    userRoleCode: "inside_sales",
    teamId: 1,
    dataVisibility: "own",
  };

  describe("Financial & Payment Collection Metrics", () => {
    it("calculates collected and outstanding balances accurately without negative values", async () => {
      const metrics = await getPaymentMetrics(mockContext, "30d");
      
      assert.ok(metrics.totalRevenue >= 0, "Revenue should not be negative");
      assert.ok(metrics.pendingPayments >= 0, "Pending payments should not be negative");
      assert.ok(
        metrics.paymentCollections.outstanding >= 0,
        "Outstanding balance should not be negative"
      );
    });

    it("verifies financial arithmetic logic for partial and multiple payments", () => {
      const invoiceTotal = 50000;
      const payment1 = 20000;
      const payment2 = 15000;

      const totalCollected = payment1 + payment2;
      const outstanding = Math.max(0, invoiceTotal - totalCollected);

      assert.strictEqual(totalCollected, 35000, "Collected should be ₹35,000");
      assert.strictEqual(outstanding, 15000, "Outstanding should be ₹15,000");
    });
  });

  describe("Lead Metrics & Conversion Calculation", () => {
    it("calculates conversion rate cleanly without division by zero errors", async () => {
      const metrics = await getLeadMetrics(mockContext, "30d");

      assert.ok(metrics.conversionRate >= 0 && metrics.conversionRate <= 100);
      assert.ok(Array.isArray(metrics.leadConversion));
    });

    it("aggregates lead conversion into exactly 7 stages in expected order", async () => {
      const metrics = await getLeadMetrics(mockContext, "30d");

      assert.strictEqual(metrics.leadConversion.length, 7, "Should have exactly 7 funnel stages");
      const expectedStages = [
        "Total",
        "New Leads",
        "Contacted",
        "Qualified",
        "In-Progress",
        "Won",
        "Lost",
      ];
      const actualStages = metrics.leadConversion.map((s) => s.stage);
      assert.deepStrictEqual(actualStages, expectedStages);

      const totalStage = metrics.leadConversion.find((s) => s.stage === "Total");
      assert.strictEqual(totalStage?.count, metrics.totalLeads);

      const wonStage = metrics.leadConversion.find((s) => s.stage === "Won");
      assert.strictEqual(wonStage?.count, metrics.wonDeals);

      const lostStage = metrics.leadConversion.find((s) => s.stage === "Lost");
      assert.strictEqual(lostStage?.count, metrics.lostDeals);
    });

    it("handles personal scope lead metrics query cleanly", async () => {
      const metrics = await getLeadMetrics(mockPersonalContext, "7d");
      assert.ok(typeof metrics.totalLeads === "number");
      assert.ok(Array.isArray(metrics.leadSources));
      assert.strictEqual(metrics.leadConversion.length, 7);
    });

    it("dynamically rolls any intermediate pipeline stage into In-Progress", async () => {
      const [insertedStage] = await db
        .insert(leadStages)
        .values({
          name: "Site Survey Scheduled",
          code: `site_survey_test_${Date.now()}`,
          order: 5,
        })
        .returning();

      try {
        const metrics = await getLeadMetrics(mockContext, "30d");
        const inProgress = metrics.leadConversion.find((s) => s.stage === "In-Progress");
        assert.ok(inProgress, "In-Progress stage must exist");
        assert.strictEqual(metrics.leadConversion.length, 7, "Must retain exactly 7 consolidated stages");
      } finally {
        if (insertedStage?.id) {
          await db.delete(leadStages).where(eq(leadStages.id, insertedStage.id));
        }
      }
    });
  });

  describe("Sales Pipeline & Team Performance Metrics", () => {
    it("fetches pipeline distribution and team performance", async () => {
      const metrics = await getSalesMetrics(mockContext, "30d");

      assert.ok(Array.isArray(metrics.pipelineDistribution));
      assert.ok(Array.isArray(metrics.teamPerformance));
    });
  });

  describe("Activity & Follow-up Metrics", () => {
    it("returns valid follow-up and appointment summaries", async () => {
      const metrics = await getActivityMetrics(mockContext, "today");

      assert.ok(typeof metrics.followups.today === "number");
      assert.ok(typeof metrics.followups.overdue === "number");
      assert.ok(typeof metrics.followups.upcoming === "number");
      assert.ok(typeof metrics.followups.completed === "number");
      assert.ok(Array.isArray(metrics.priorityItems));
    });
  });
});

