import { z } from "zod";

export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "upi",
  "cheque",
  "card",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const dateCoercionSchema = z.preprocess((val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? undefined : parsed;
  }
  if (val instanceof Date) return val.getTime();
  return undefined;
}, z.number({ invalid_type_error: "Valid payment date is required." }));

/**
 * Zod validation schema for recording a payment against an invoice.
 * Payment amounts are represented in integer minor units (paise).
 */
export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid("A valid invoice ID is required."),
  amount: z
    .number({ invalid_type_error: "Payment amount must be a number." })
    .int("Payment amount must be in paise.")
    .positive("Payment amount must be greater than zero."),
  paymentDate: dateCoercionSchema.default(() => Date.now()),
  paymentMethod: z.enum(PAYMENT_METHODS, {
    errorMap: () => ({ message: "Please select a valid payment method." }),
  }),
  transactionReference: z
    .string()
    .max(100, "Transaction reference cannot exceed 100 characters.")
    .optional()
    .nullable(),
  receiptUrl: z
    .string()
    .url("Receipt must be a valid URL.")
    .max(1000)
    .optional()
    .nullable(),
  receiptPublicId: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters.").optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

/**
 * Schema for querying the payment transactions ledger.
 */
export const paymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  invoiceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.number().optional(),
  dateTo: z.coerce.number().optional(),
});

export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
