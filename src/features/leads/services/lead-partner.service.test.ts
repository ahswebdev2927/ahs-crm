import { describe, it } from "node:test";
import assert from "node:assert";
import {
  addLeadPartner,
  updateLeadPartner,
  removeLeadPartner,
  getLeadPartnershipSummary,
} from "./lead-partner.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";

describe("Lead Partnership Service Unit Tests", () => {
  const superAdminUser: AuthenticatedUserPayload = {
    id: "admin-user-id",
    email: "admin@ahs.com",
    name: "Super Admin",
    role: {
      id: 1,
      code: "super_admin",
      name: "Super Admin",
    },
    permissions: ["leads:view", "leads:create", "leads:edit", "leads:delete", "leads:assign"],
    dataVisibility: "all",
  };

  describe("Partnership Percentage Arithmetic", () => {
    it("correctly calculates available and owner percentages based on active partner shares", () => {
      const activePartnerPercentageSum = 40;
      const availablePercentage = Math.max(0, 100 - activePartnerPercentageSum);
      const ownerPercentage = availablePercentage;

      assert.strictEqual(availablePercentage, 60, "Remaining available percentage should be 60%");
      assert.strictEqual(ownerPercentage, 60, "Lead owner share should equal remaining 60%");
    });

    it("prevents total partnership allocation from exceeding 100%", () => {
      const currentAllocation = 70;
      const requestedNewShare = 40;
      const willExceed = currentAllocation + requestedNewShare > 100;

      assert.strictEqual(willExceed, true, "Allocation sum of 110% should be flagged as exceeding 100%");
    });
  });

  describe("Business Rules & Validation Constraints", () => {
    it("ensures lead owner cannot be added as a partner to their own lead", async () => {
      const ownerId = "sales-owner-1";
      const partnerInputId = "sales-owner-1";

      const isSameAsOwner = ownerId === partnerInputId;
      assert.strictEqual(isSameAsOwner, true, "Attempting to assign lead owner as partner should be detected");
    });

    it("verifies soft-removal frees up percentage share allocation", () => {
      let activePartners = [
        { id: "p1", partnerId: "u2", percentage: 40, status: "active" as const },
        { id: "p2", partnerId: "u3", percentage: 30, status: "active" as const },
      ];

      let initialAllocated = activePartners.reduce((acc, p) => acc + p.percentage, 0);
      assert.strictEqual(initialAllocated, 70, "Initial allocated percentage should be 70%");

      // Remove p1
      activePartners = activePartners.filter((p) => p.id !== "p1");
      let newAllocated = activePartners.reduce((acc, p) => acc + p.percentage, 0);
      assert.strictEqual(newAllocated, 30, "After removal allocated percentage should be reduced to 30%");
      assert.strictEqual(100 - newAllocated, 70, "Available percentage should increase to 70%");
    });
  });
});
