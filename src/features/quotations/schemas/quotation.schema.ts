import { z } from "zod";

/**
 * Zod validation schema for individual proposal/quotation line items.
 * Financial unit prices are represented in integer minor units (paise).
 */
export const quotationItemInputSchema = z.object({
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

export type QuotationItemInput = z.infer<typeof quotationItemInputSchema>;

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
 * Zod validation schema for creating a new commercial quotation.
 * Requires either leadId (sales pipeline negotiation) or customerId (existing account).
 */
export const createQuotationSchema = z
  .object({
    leadId: z.string().uuid().nullable().optional(),
    customerId: z.string().uuid().nullable().optional(),
    validUntil: dateCoercionSchema,
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
      .array(quotationItemInputSchema)
      .min(1, "At least one proposal line item is required."),
    notes: z.string().max(2000, "Notes cannot exceed 2000 characters.").optional().nullable(),
    terms: z.string().max(4000, "Terms cannot exceed 4000 characters.").optional().nullable(),
  })
  .refine((data) => !!data.leadId || !!data.customerId, {
    message: "A quotation must be associated with either a Lead or a Customer.",
    path: ["leadId"],
  });

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

/**
 * Schema for updating an existing quotation in 'draft' status.
 */
export const updateQuotationSchema = z.object({
  validUntil: dateCoercionSchema.optional(),
  discount: z.number().int().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  items: z.array(quotationItemInputSchema).min(1).optional(),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(4000).optional().nullable(),
});

export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;

/**
 * Schema for transitioning quotation lifecycle statuses.
 */
export const updateQuotationStatusSchema = z.object({
  status: z.enum(["draft", "sent", "viewed", "accepted", "declined", "expired"]),
  reason: z.string().max(500).optional(),
});

export type UpdateQuotationStatusInput = z.infer<typeof updateQuotationStatusSchema>;

/**
 * Schema for listing and querying quotations with server-side pagination and filters.
 */
export const quotationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["all", "draft", "sent", "viewed", "accepted", "declined", "expired"]).default("all"),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.number().optional(),
  dateTo: z.coerce.number().optional(),
});

export type QuotationQueryInput = z.infer<typeof quotationQuerySchema>;

/**
 * Schema for converting an accepted proposal into an official customer invoice.
 */
export const convertQuotationToInvoiceSchema = z.object({
  dueDate: dateCoercionSchema,
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(4000).optional().nullable(),
});

export type ConvertQuotationToInvoiceInput = z.infer<typeof convertQuotationToInvoiceSchema>;
