import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateInvoiceFinancials,
  createInvoiceSchema,
  convertQuotationToInvoiceSchema,
  updateInvoiceStatusSchema,
} from "../index";

describe("Invoices Feature Unit Tests", () => {
  describe("Financial Calculations & Minor-Unit Math", () => {
    test("calculates accurate subtotal, 18% GST, and total in paise", () => {
      // 2 deliverables @ ₹15,000 each (1,500,000 paise) = ₹30,000
      const items = [
        { description: "Digital Marketing Retainer", quantity: 2, unitPrice: 1500000 },
      ];

      const res = calculateInvoiceFinancials(items, 0, 18);

      assert.equal(res.subtotal, 3000000);
      assert.equal(res.discount, 0);
      // GST 18% of 30,000 = ₹5,400 (540,000 paise)
      assert.equal(res.tax, 540000);
      // Total = ₹35,400 (3,540,000 paise)
      assert.equal(res.total, 3540000);
    });

    test("accurately applies discount before tax assessment", () => {
      // Subtotal ₹50,000 (5,000,000 paise), Discount ₹5,000 (500,000 paise)
      const items = [{ description: "E-Commerce Setup", quantity: 1, unitPrice: 5000000 }];

      const res = calculateInvoiceFinancials(items, 500000, 18);

      assert.equal(res.subtotal, 5000000);
      assert.equal(res.discount, 500000);
      // Taxable = 45,000. 18% GST = ₹8,100 (810,000 paise)
      assert.equal(res.tax, 810000);
      assert.equal(res.total, 5310000);
    });
  });

  describe("Validation Schemas", () => {
    const validDueDate = Date.now() + 30 * 24 * 60 * 60 * 1000;

    test("validates valid customer invoice input", () => {
      const valid = createInvoiceSchema.parse({
        customerId: "33333333-3333-4333-8333-333333333333",
        dueDate: validDueDate,
        items: [
          {
            description: "Server Hosting Setup",
            quantity: 1,
            unitPrice: 1200000,
          },
        ],
      });

      assert.equal(valid.customerId, "33333333-3333-4333-8333-333333333333");
      assert.equal(valid.items.length, 1);
    });

    test("fails validation when customerId is not a valid UUID", () => {
      assert.throws(() => {
        createInvoiceSchema.parse({
          customerId: "invalid-id",
          dueDate: validDueDate,
          items: [{ description: "Item", quantity: 1, unitPrice: 1000 }],
        });
      });
    });

    test("validates quotation-to-invoice conversion input", () => {
      const parsed = convertQuotationToInvoiceSchema.parse({
        dueDate: validDueDate,
        notes: "Generated from accepted quotation",
      });

      assert.equal(typeof parsed.dueDate, "number");
      assert.equal(parsed.notes, "Generated from accepted quotation");
    });

    test("validates manual invoice status update schema", () => {
      const valid = updateInvoiceStatusSchema.parse({
        status: "cancelled",
        reason: "Client requested project cancellation",
      });

      assert.equal(valid.status, "cancelled");
      assert.equal(valid.reason, "Client requested project cancellation");
    });
  });
});
