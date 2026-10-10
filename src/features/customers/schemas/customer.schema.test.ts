import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createCustomerSchema,
  updateCustomerSchema,
  convertLeadToCustomerSchema,
  customerQuerySchema,
} from "./customer.schema";

describe("Customer Schemas Unit Tests", () => {
  describe("createCustomerSchema (Direct External Customers)", () => {
    test("validates valid external customer without leadId", () => {
      const input = {
        name: "Acme Corporation",
        company: "Acme Corp",
        email: "contact@acme.com",
        phone: "+1 555-0199",
        address: "123 Business Way",
        status: "active",
      };

      const result = createCustomerSchema.safeParse(input);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.name, "Acme Corporation");
        assert.equal(result.data.status, "active");
      }
    });

    test("allows empty email as valid when not provided", () => {
      const input = {
        name: "Walk-in Client",
        email: "",
      };

      const result = createCustomerSchema.safeParse(input);
      assert.equal(result.success, true);
    });

    test("fails when customer name is less than 2 characters", () => {
      const input = {
        name: "A",
      };

      const result = createCustomerSchema.safeParse(input);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0].message, /Customer name must be at least 2 characters/);
      }
    });

    test("fails when email is invalid format", () => {
      const input = {
        name: "John Doe",
        email: "not-an-email",
      };

      const result = createCustomerSchema.safeParse(input);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0].message, /Invalid email address/);
      }
    });
  });

  describe("convertLeadToCustomerSchema", () => {
    test("validates lead conversion input with leadId", () => {
      const input = {
        leadId: "lead-uuid-123",
        name: "Converted Enterprise Lead",
        company: "Enterprise Inc",
      };

      const result = convertLeadToCustomerSchema.safeParse(input);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.leadId, "lead-uuid-123");
        assert.equal(result.data.name, "Converted Enterprise Lead");
      }
    });

    test("fails conversion when leadId is empty or omitted", () => {
      const input = {
        name: "Missing Lead ID",
      };

      const result = convertLeadToCustomerSchema.safeParse(input);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0].message, /Lead ID is required for conversion/);
      }
    });
  });

  describe("customerQuerySchema", () => {
    test("applies sensible defaults for pagination and sorting", () => {
      const input = {};
      const result = customerQuerySchema.safeParse(input);

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.page, 1);
        assert.equal(result.data.limit, 10);
        assert.equal(result.data.status, "all");
        assert.equal(result.data.origin, "all");
        assert.equal(result.data.sortBy, "createdAt");
        assert.equal(result.data.sortOrder, "desc");
      }
    });

    test("supports origin filtering for direct and converted customers", () => {
      const directQuery = customerQuerySchema.safeParse({ origin: "direct" });
      assert.equal(directQuery.success, true);
      if (directQuery.success) {
        assert.equal(directQuery.data.origin, "direct");
      }

      const convertedQuery = customerQuerySchema.safeParse({ origin: "converted" });
      assert.equal(convertedQuery.success, true);
      if (convertedQuery.success) {
        assert.equal(convertedQuery.data.origin, "converted");
      }
    });
  });
});
