import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateQuotationFinancials,
  createQuotationSchema,
  updateQuotationSchema,
  updateQuotationStatusSchema,
} from "../index";

describe("Quotations Feature Unit Tests", () => {
  describe("Financial Precision & Minor-Unit Math", () => {
    test("calculates accurate subtotal, GST (18%), and grand total in paise", () => {
      // 1 service @ ₹10,000 (1,000,000 paise) + 2 services @ ₹5,000 (500,000 paise)
      const items = [
        { description: "Website Development", quantity: 1, unitPrice: 1000000 },
        { description: "SEO Optimization", quantity: 2, unitPrice: 500000 },
      ];

      const res = calculateQuotationFinancials(items, 0, 18);

      // Subtotal = 10,000 + 10,000 = ₹20,000 (2,000,000 paise)
      assert.equal(res.subtotal, 2000000);
      assert.equal(res.discount, 0);
      // GST 18% of ₹20,000 = ₹3,600 (360,000 paise)
      assert.equal(res.tax, 360000);
      // Grand Total = ₹23,600 (2,360,000 paise)
      assert.equal(res.total, 2360000);
    });

    test("applies discount cleanly before calculating tax", () => {
      // Subtotal ₹10,000 (1,000,000 paise), Discount ₹2,000 (200,000 paise)
      const items = [{ description: "Social Media Package", quantity: 1, unitPrice: 1000000 }];

      const res = calculateQuotationFinancials(items, 200000, 18);

      assert.equal(res.subtotal, 1000000);
      assert.equal(res.discount, 200000);
      // Taxable = ₹8,000. 18% of 8,000 = ₹1,440 (144,000 paise)
      assert.equal(res.tax, 144000);
      // Grand Total = 8,000 + 1,440 = ₹9,440 (944,000 paise)
      assert.equal(res.total, 944000);
    });

    test("caps discount at subtotal to prevent negative amounts", () => {
      const items = [{ description: "Graphic Design", quantity: 1, unitPrice: 500000 }];
      // Discount ₹10,000 exceeds subtotal of ₹5,000
      const res = calculateQuotationFinancials(items, 1000000, 18);

      assert.equal(res.subtotal, 500000);
      assert.equal(res.discount, 500000);
      assert.equal(res.tax, 0);
      assert.equal(res.total, 0);
    });

    test("supports custom zero tax rate cleanly", () => {
      const items = [{ description: "Consulting Hour", quantity: 2, unitPrice: 150000 }];
      const res = calculateQuotationFinancials(items, 0, 0);

      assert.equal(res.subtotal, 300000);
      assert.equal(res.tax, 0);
      assert.equal(res.total, 300000);
    });
  });

  describe("Zod Validation Schemas", () => {
    const validUntilDate = Date.now() + 15 * 24 * 60 * 60 * 1000;

    test("validates quotation linked to a Lead", () => {
      const valid = createQuotationSchema.parse({
        leadId: "11111111-1111-4111-8111-111111111111",
        validUntil: validUntilDate,
        discount: 0,
        taxRate: 18,
        items: [
          {
            description: "PPC Setup",
            quantity: 1,
            unitPrice: 2500000,
          },
        ],
        notes: "Initial proposal draft",
      });

      assert.equal(valid.leadId, "11111111-1111-4111-8111-111111111111");
      assert.equal(valid.items.length, 1);
    });

    test("validates quotation linked to a Customer", () => {
      const valid = createQuotationSchema.parse({
        customerId: "22222222-2222-4222-8222-222222222222",
        validUntil: validUntilDate,
        items: [
          {
            description: "Annual Maintenance",
            quantity: 1,
            unitPrice: 5000000,
          },
        ],
      });

      assert.equal(valid.customerId, "22222222-2222-4222-8222-222222222222");
    });

    test("fails validation when neither leadId nor customerId is present", () => {
      assert.throws(() => {
        createQuotationSchema.parse({
          validUntil: validUntilDate,
          items: [{ description: "Item", quantity: 1, unitPrice: 10000 }],
        });
      }, /A quotation must be associated with either a Lead or a Customer/);
    });

    test("fails validation when items array is empty", () => {
      assert.throws(() => {
        createQuotationSchema.parse({
          leadId: "11111111-1111-4111-8111-111111111111",
          validUntil: validUntilDate,
          items: [],
        });
      });
    });

    test("fails validation when unitPrice is negative", () => {
      assert.throws(() => {
        createQuotationSchema.parse({
          leadId: "11111111-1111-4111-8111-111111111111",
          validUntil: validUntilDate,
          items: [{ description: "Invalid", quantity: 1, unitPrice: -500 }],
        });
      });
    });

    test("validates status transitions", () => {
      const validStatus = updateQuotationStatusSchema.parse({
        status: "accepted",
      });
      assert.equal(validStatus.status, "accepted");

      assert.throws(() => {
        updateQuotationStatusSchema.parse({
          status: "non_existent_status",
        });
      });
    });
  });
});
