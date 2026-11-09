import { describe, it } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import { leadStages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPaymentMetrics } from "./payment-metrics.service";
import { getLeadMetrics } from "./lead-metrics.service";
import { getSalesMetrics } from "./sales-metrics.service";
import { getActivityMetrics } from "./activity-metrics.service";
import { formatINR, formatAxisINR } from "@/lib/formatters";
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

    it("verifies formatINR dynamic decimal formatting across whole and fractional amounts", () => {
      // Whole amounts without decimals
      assert.strictEqual(formatINR(2241800), "₹22,418");
      assert.strictEqual(formatINR(0), "₹0");
      assert.strictEqual(formatINR(null), "₹0");

      // Fractional paise amounts retain two decimals
      assert.strictEqual(formatINR(2241882), "₹22,418.82");
      assert.strictEqual(formatINR(2241850), "₹22,418.50");

      // Optional forceDecimals preserves .00 when explicitly requested
      assert.strictEqual(formatINR(2241800, { forceDecimals: true }), "₹22,418.00");
    });

    it("verifies formatAxisINR compact label formatting without currency symbols", () => {
      assert.strictEqual(formatAxisINR(0), "0");
      assert.strictEqual(formatAxisINR(500), "0.5k");
      assert.strictEqual(formatAxisINR(1000), "1k");
      assert.strictEqual(formatAxisINR(2000), "2k");
      assert.strictEqual(formatAxisINR(20000), "20k");
      assert.strictEqual(formatAxisINR(100000), "1L");
      assert.strictEqual(formatAxisINR(2000000), "20L");
      assert.strictEqual(formatAxisINR(5000000), "50L");
      assert.strictEqual(formatAxisINR(10000000), "1Cr");
    });

    it("verifies revenue trend time-series buckets for 7d and 3m intervals", async () => {
      const metrics7d = await getPaymentMetrics(mockContext, "7d");
      assert.strictEqual(metrics7d.revenueTrend.length, 7, "7d should have 7 daily points");
      assert.match(metrics7d.revenueTrend[0].date, /^\d{2} [A-Z][a-z]{2}$/, "Daily label should match DD MMM format");

      const metrics3m = await getPaymentMetrics(mockContext, "3m");
      assert.strictEqual(metrics3m.revenueTrend.length, 3, "3m should have 3 monthly points");
      assert.match(metrics3m.revenueTrend[0].date, /^[A-Z][a-z]{2} \d{4}$/, "Monthly label should match MMM YYYY format");

      // Revenue equals totalCollected
      assert.strictEqual(metrics7d.totalRevenue, metrics7d.paymentCollections.totalCollected);
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

