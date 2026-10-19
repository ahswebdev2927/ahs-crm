import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  recordPaymentSchema,
  paymentQuerySchema,
} from "../index";

describe("Payments Feature Unit Tests", () => {
  describe("Zod Validation Schemas", () => {
    test("validates valid payment recording input", () => {
      const valid = recordPaymentSchema.parse({
        invoiceId: "44444444-4444-4444-8444-444444444444",
        amount: 1500000, // ₹15,000 in paise
        paymentMethod: "upi",
        transactionReference: "UPI-REF-998877",
        notes: "Received via PhonePe QR",
      });

      assert.equal(valid.invoiceId, "44444444-4444-4444-8444-444444444444");
      assert.equal(valid.amount, 1500000);
      assert.equal(valid.paymentMethod, "upi");
      assert.equal(valid.transactionReference, "UPI-REF-998877");
    });

    test("fails validation when amount is zero or negative", () => {
      assert.throws(() => {
        recordPaymentSchema.parse({
          invoiceId: "44444444-4444-4444-8444-444444444444",
          amount: 0,
          paymentMethod: "cash",
        });
      }, /Payment amount must be greater than zero/);

      assert.throws(() => {
        recordPaymentSchema.parse({
          invoiceId: "44444444-4444-4444-8444-444444444444",
          amount: -50000,
          paymentMethod: "cash",
        });
      });
    });

    test("fails validation when payment method is invalid", () => {
      assert.throws(() => {
        recordPaymentSchema.parse({
          invoiceId: "44444444-4444-4444-8444-444444444444",
          amount: 50000,
          paymentMethod: "bitcoin",
        });
      }, /Please select a valid payment method/);
    });

    test("validates receipt URL formatting", () => {
      const validWithUrl = recordPaymentSchema.parse({
        invoiceId: "44444444-4444-4444-8444-444444444444",
        amount: 250000,
        paymentMethod: "bank_transfer",
        receiptUrl: "https://res.cloudinary.com/ahs/image/upload/v1/receipts/rec1.jpg",
      });

      assert.equal(
        validWithUrl.receiptUrl,
        "https://res.cloudinary.com/ahs/image/upload/v1/receipts/rec1.jpg"
      );

      assert.throws(() => {
        recordPaymentSchema.parse({
          invoiceId: "44444444-4444-4444-8444-444444444444",
          amount: 250000,
          paymentMethod: "bank_transfer",
          receiptUrl: "not-a-valid-url",
        });
      }, /Receipt must be a valid URL/);
    });

    test("parses paymentQuerySchema with default pagination", () => {
      const query = paymentQuerySchema.parse({});
      assert.equal(query.page, 1);
      assert.equal(query.limit, 20);
    });
  });
});
