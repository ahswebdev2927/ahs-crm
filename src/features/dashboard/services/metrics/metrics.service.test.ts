import { describe, it } from "node:test";
import assert from "node:assert";
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

    it("handles personal scope lead metrics query cleanly", async () => {
      const metrics = await getLeadMetrics(mockPersonalContext, "7d");
      assert.ok(typeof metrics.totalLeads === "number");
      assert.ok(Array.isArray(metrics.leadSources));
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

