import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createUserSchema,
  updateUserSchema,
  optionalTeamNameSchema,
  optionalManagerIdSchema,
} from "./user.schema";

describe("User Schemas & Sanitization Unit Tests", () => {
  describe("optionalTeamNameSchema", () => {
    it("transforms empty string to undefined without triggering min(2) error", () => {
      const parsed = optionalTeamNameSchema.parse("");
      assert.strictEqual(parsed, undefined);
    });

    it("transforms null to undefined", () => {
      const parsed = optionalTeamNameSchema.parse(null);
      assert.strictEqual(parsed, undefined);
    });

    it("accepts valid team names with at least 2 characters", () => {
      const parsed = optionalTeamNameSchema.parse("Sales Team Alpha");
      assert.strictEqual(parsed, "Sales Team Alpha");
    });

    it("rejects 1-character non-empty team names", () => {
      assert.throws(() => optionalTeamNameSchema.parse("A"), {
        message: /Team name must be at least 2 characters/,
      });
    });
  });

  describe("optionalManagerIdSchema", () => {
    it("transforms empty string to null", () => {
      const parsed = optionalManagerIdSchema.parse("");
      assert.strictEqual(parsed, null);
    });

    it("transforms null to null", () => {
      const parsed = optionalManagerIdSchema.parse(null);
      assert.strictEqual(parsed, null);
    });

    it("preserves valid manager UUID string", () => {
      const parsed = optionalManagerIdSchema.parse("user-manager-123");
      assert.strictEqual(parsed, "user-manager-123");
    });
  });

  describe("createUserSchema", () => {
    it("successfully parses valid input with empty teamName and managerId", () => {
      const valid = createUserSchema.parse({
        name: "Marcus Vance",
        email: "marcus.v@ahs-crm.com",
        password: "Password123!",
        roleId: 2,
        teamName: "Sales Team Beta",
        managerId: "",
      });

      assert.strictEqual(valid.name, "Marcus Vance");
      assert.strictEqual(valid.teamName, "Sales Team Beta");
      assert.strictEqual(valid.managerId, null);
    });

    it("successfully parses rep input with manager and empty teamName", () => {
      const valid = createUserSchema.parse({
        name: "Sarah Jenkins",
        email: "sarah.j@ahs-crm.com",
        password: "Password123!",
        roleId: 3,
        teamName: "",
        managerId: "user-manager",
      });

      assert.strictEqual(valid.teamName, undefined);
      assert.strictEqual(valid.managerId, "user-manager");
    });
  });

  describe("updateUserSchema", () => {
    it("allows updating profile fields with empty teamName without validation failure", () => {
      const valid = updateUserSchema.parse({
        name: "Sarah Jenkins",
        email: "sarah.jenkins@ahs-crm.com",
        teamName: "",
        managerId: "",
      });

      assert.strictEqual(valid.name, "Sarah Jenkins");
      assert.strictEqual(valid.teamName, undefined);
      assert.strictEqual(valid.managerId, null);
    });
  });
});
