import { describe, it } from "node:test";
import assert from "node:assert";
import {
  createFieldVisitSchema,
  completeFieldVisitSchema,
  fieldVisitQuerySchema,
} from "./field-visit.schema";

describe("Field Visit Validation Schemas", () => {
  describe("createFieldVisitSchema", () => {
    it("validates a valid field visit creation input for a lead", () => {
      const input = {
        leadId: "lead-101",
        visitDate: Date.now() + 86400000,
        purpose: "Initial site inspection",
        assignedToId: "user-field",
        expenses: 1500,
      };

      const result = createFieldVisitSchema.parse(input);
      assert.strictEqual(result.leadId, "lead-101");
      assert.strictEqual(result.purpose, "Initial site inspection");
      assert.strictEqual(result.expenses, 1500);
    });

    it("validates a valid field visit creation input for a customer", () => {
      const input = {
        customerId: "cust-202",
        visitDate: Date.now() + 86400000,
        purpose: "Preventive maintenance check",
        assignedToId: "user-field",
      };

      const result = createFieldVisitSchema.parse(input);
      assert.strictEqual(result.customerId, "cust-202");
      assert.strictEqual(result.expenses, 0); // default
    });

    it("fails validation when neither leadId nor customerId is provided", () => {
      const input = {
        visitDate: Date.now() + 86400000,
        purpose: "Orphan visit",
        assignedToId: "user-field",
      };

      assert.throws(() => {
        createFieldVisitSchema.parse(input);
      });
    });

    it("fails validation when purpose is empty", () => {
      const input = {
        leadId: "lead-101",
        visitDate: Date.now(),
        purpose: "",
        assignedToId: "user-field",
      };

      assert.throws(() => {
        createFieldVisitSchema.parse(input);
      });
    });
  });

  describe("completeFieldVisitSchema", () => {
    it("validates a complete field visit report submission", () => {
      const input = {
        summary: "Inspected warehouse ventilation system",
        requirements: "Requires 4x high CFM exhaust fans",
        outcome: "Interested in full quote",
        feedback: "Facility manager requested proposal by Friday",
        expenses: 2500,
        nextAction: "proposal",
        nextActionDate: Date.now() + 172800000,
      };

      const result = completeFieldVisitSchema.parse(input);
      assert.strictEqual(result.summary, "Inspected warehouse ventilation system");
      assert.strictEqual(result.nextAction, "proposal");
      assert.strictEqual(result.expenses, 2500);
    });

    it("fails validation when expenses is negative", () => {
      const input = {
        expenses: -500,
      };

      assert.throws(() => {
        completeFieldVisitSchema.parse(input);
      });
    });
  });

  describe("fieldVisitQuerySchema", () => {
    it("parses query parameters with default pagination", () => {
      const result = fieldVisitQuerySchema.parse({});
      assert.strictEqual(result.page, 1);
      assert.strictEqual(result.limit, 10);
    });

    it("coerces string numbers for page and limit", () => {
      const result = fieldVisitQuerySchema.parse({
        page: "2",
        limit: "25",
        status: "completed",
      });
      assert.strictEqual(result.page, 2);
      assert.strictEqual(result.limit, 25);
      assert.strictEqual(result.status, "completed");
    });
  });
});
