import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveWebsiteSyncUrl,
  catalogServiceSchema,
  websiteSyncResponseSchema,
  assignCustomerServiceSchema,
} from "../index";

describe("Service Feature Unit Tests", () => {
  describe("Website Sync URL Resolution & Normalization", () => {
    test("strips single trailing slash cleanly", () => {
      const original = process.env.AHS_WEBSITE_URL;
      process.env.AHS_WEBSITE_URL = "http://localhost:3001/";
      try {
        const resolved = resolveWebsiteSyncUrl();
        assert.equal(resolved, "http://localhost:3001/api/crm/services");
      } finally {
        process.env.AHS_WEBSITE_URL = original;
      }
    });

    test("strips multiple trailing slashes cleanly", () => {
      const original = process.env.AHS_WEBSITE_URL;
      process.env.AHS_WEBSITE_URL = "https://ananyahisolutions.com///";
      try {
        const resolved = resolveWebsiteSyncUrl();
        assert.equal(resolved, "https://ananyahisolutions.com/api/crm/services");
      } finally {
        process.env.AHS_WEBSITE_URL = original;
      }
    });

    test("handles URL without trailing slash", () => {
      const original = process.env.AHS_WEBSITE_URL;
      process.env.AHS_WEBSITE_URL = "http://localhost:3001";
      try {
        const resolved = resolveWebsiteSyncUrl();
        assert.equal(resolved, "http://localhost:3001/api/crm/services");
      } finally {
        process.env.AHS_WEBSITE_URL = original;
      }
    });
  });

  describe("Zod Validation Schemas", () => {
    test("validates valid catalog service input", () => {
      const input = {
        code: "DM-SOCIAL-MEDIA-MARKETING-BASIC-PLAN",
        name: "Social Media Marketing - Basic Plan",
        category: "Digital Marketing Packages",
        categoryKey: "digital-marketing",
        serviceType: "Social Media Marketing",
        plan: "Basic Plan",
        billingModel: "monthly" as const,
        billingText: "+ GST/Month",
        price: 1699900,
        priceText: "₹16,999",
        features: ["Facebook, Instagram Platform", "Social Media Audit"],
        isPopular: false,
        sortOrder: 0,
        status: "active" as const,
      };

      const result = catalogServiceSchema.safeParse(input);
      assert.equal(result.success, true);
    });

    test("rejects negative pricing in catalog schema", () => {
      const input = {
        code: "TEST-CODE",
        name: "Test Plan",
        category: "Category",
        categoryKey: "category",
        serviceType: "Type",
        plan: "Plan",
        billingModel: "monthly" as const,
        price: -500, // Invalid
      };

      const result = catalogServiceSchema.safeParse(input);
      assert.equal(result.success, false);
    });

    test("validates live website sync response structure", () => {
      const sampleResponse = {
        success: true,
        syncedAt: "2026-10-13T07:34:38.568Z",
        source: "ahs-public-website-turso",
        summary: {
          categoriesCount: 5,
          serviceTypesCount: 11,
          catalogItemsCount: 1,
        },
        data: {
          catalogItems: [
            {
              externalId: "plan:417",
              code: "DM-SOCIAL-MEDIA-MARKETING-BASIC-PLAN",
              name: "Social Media Marketing - Basic Plan",
              category: "Digital Marketing Packages",
              categoryKey: "digital-marketing",
              serviceType: "Social Media Marketing",
              plan: "Basic Plan",
              billingModel: "monthly",
              billingText: "+ GST/Month",
              priceMinorUnits: 1699900,
              priceText: "₹16,999",
              features: ["Facebook, Instagram Platform", "Social Media Audit"],
              rawFeatures: ["Facebook, Instagram Platform"],
              note: "Campaign charge not included.",
              isPopular: false,
              sortOrder: 0,
            },
          ],
        },
      };

      const result = websiteSyncResponseSchema.safeParse(sampleResponse);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.data.catalogItems.length, 1);
        assert.equal(result.data.data.catalogItems[0].priceMinorUnits, 1699900);
      }
    });

    test("validates customer service assignment input", () => {
      const input = {
        customerId: "cust-001",
        serviceId: 2,
        quantity: 2,
        price: 2100000,
        notes: "Approved multi-month discount",
      };

      const result = assignCustomerServiceSchema.safeParse(input);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.quantity, 2);
        assert.equal(result.data.price, 2100000);
      }
    });
  });
});
