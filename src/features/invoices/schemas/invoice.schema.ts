import { z } from "zod";

/**
 * Zod validation schema for individual line items on an invoice.
 * Financial unit prices are represented in integer minor units (paise).
 */
export const invoiceItemInputSchema = z.object({
  serviceId: z.number().int().positive().nullable().optional(),
  description: z
    .string()
    .min(1, "Item description is required.")
    .max(500, "Description cannot exceed 500 characters."),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number." })
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .default(1),
  unitPrice: z
    .number({ invalid_type_error: "Unit price must be a number." })
    .int("Unit price must be specified in minor units (paise).")
    .min(0, "Unit price cannot be negative."),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;

/**
 * Helper to coerce and validate timestamp or date string into valid epoch timestamp_ms.
 */
const dateCoercionSchema = z.preprocess((val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? undefined : parsed;
  }
  if (val instanceof Date) return val.getTime();
  return undefined;
}, z.number({ invalid_type_error: "Valid date is required." }));

/**
 * Schema for drafting or issuing a customer invoice.
 */
export const createInvoiceSchema = z.object({
  customerId: z.string().uuid("A valid customer ID is required."),
  quotationId: z.string().uuid().nullable().optional(),
  issueDate: dateCoercionSchema.default(() => Date.now()),
  dueDate: dateCoercionSchema,
  discount: z
    .number()
    .int("Discount must be in paise.")
    .min(0, "Discount cannot be negative.")
    .default(0),
  taxRate: z
    .number()
    .min(0, "Tax rate cannot be negative.")
    .max(100, "Tax rate cannot exceed 100%.")
    .default(18), // standard 18% GST default
  items: z
    .array(invoiceItemInputSchema)
    .min(1, "At least one billing line item is required."),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters.").optional().nullable(),
  terms: z.string().max(4000, "Terms cannot exceed 4000 characters.").optional().nullable(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/**
 * Schema for updating an unpaid invoice.
 */
export const updateInvoiceSchema = z.object({
  dueDate: dateCoercionSchema.optional(),
  discount: z.number().int().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  items: z.array(invoiceItemInputSchema).min(1).optional(),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(4000).optional().nullable(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

/**
 * Schema for manual status update (e.g., voiding or cancelling an invoice).
 */
export const updateInvoiceStatusSchema = z.object({
  status: z.enum(["draft", "unpaid", "partially_paid", "paid", "overdue", "cancelled", "void"]),
  reason: z.string().max(500).optional(),
});

export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;

/**
 * Schema for querying invoices with pagination, customer filter, and status pills.
 */
export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["all", "draft", "unpaid", "partially_paid", "paid", "overdue", "cancelled", "void"])
    .default("all"),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
  overdueOnly: z
    .preprocess((val) => val === true || val === "true" || val === 1 || val === "1", z.boolean())
    .optional(),
  dateFrom: z.coerce.number().optional(),
  dateTo: z.coerce.number().optional(),
});

export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;

export {
  convertQuotationToInvoiceSchema,
  type ConvertQuotationToInvoiceInput,
} from "@/features/quotations/schemas/quotation.schema";
