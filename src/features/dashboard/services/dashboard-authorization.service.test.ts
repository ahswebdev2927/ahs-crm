import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getAllowedDashboardScopes,
  resolveAuthorizedDashboardScope,
} from "./dashboard-authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";

describe("Dashboard Authorization Service", () => {
  const superAdminUser: AuthenticatedUserPayload = {
    id: "admin-1",
    name: "Super Admin",
    email: "admin@ahs.com",
    role: { code: "super_admin", name: "SuperAdmin" },
    permissions: [],
    dataVisibility: "all",
  };

  const managerUser: AuthenticatedUserPayload = {
    id: "manager-1",
    name: "Sales Manager",
    email: "manager@ahs.com",
    role: { code: "sales_manager", name: "Sales Manager" },
    permissions: [],
    teamId: 1,
    dataVisibility: "team",
  };

  const salesRepUser: AuthenticatedUserPayload = {
    id: "rep-1",
    name: "Inside Sales Rep",
    email: "rep@ahs.com",
    role: { code: "inside_sales", name: "Inside Sales" },
    permissions: [],
    teamId: 1,
    dataVisibility: "own",
  };

  describe("getAllowedDashboardScopes", () => {
    it("allows business and personal scope for super_admin", () => {
      const scopes = getAllowedDashboardScopes(superAdminUser);
      assert.ok(scopes.includes("business"));
      assert.ok(scopes.includes("personal"));
    });

    it("allows team and personal scope for sales_manager", () => {
      const scopes = getAllowedDashboardScopes(managerUser);
      assert.ok(scopes.includes("team"));
      assert.ok(scopes.includes("personal"));
      assert.strictEqual(scopes.includes("business"), false);
    });

    it("allows only personal scope for sales reps", () => {
      const scopes = getAllowedDashboardScopes(salesRepUser);
      assert.deepStrictEqual(scopes, ["personal"]);
    });
  });

  describe("resolveAuthorizedDashboardScope", () => {
    it("resolves valid business scope for super_admin", () => {
      const ctx = resolveAuthorizedDashboardScope(superAdminUser, "business");
      assert.strictEqual(ctx.scope, "business");
      assert.strictEqual(ctx.userId, "admin-1");
    });

    it("resolves valid team scope for sales_manager", () => {
      const ctx = resolveAuthorizedDashboardScope(managerUser, "team");
      assert.strictEqual(ctx.scope, "team");
      assert.strictEqual(ctx.teamId, 1);
    });

    it("throws 403 AppError when sales rep requests business scope", () => {
      assert.throws(() => {
        resolveAuthorizedDashboardScope(salesRepUser, "business");
      }, /Access denied/);
    });

    it("throws 403 AppError when sales rep requests team scope", () => {
      assert.throws(() => {
        resolveAuthorizedDashboardScope(salesRepUser, "team");
      }, /Access denied/);
    });

    it("throws 403 AppError when sales manager requests business scope", () => {
      assert.throws(() => {
        resolveAuthorizedDashboardScope(managerUser, "business");
      }, /Access denied/);
    });
  });
});
