import { z } from "zod";

export const customerStatusEnum = z.enum(["active", "inactive"]);
export const customerOriginEnum = z.enum(["all", "direct", "converted"]);

/**
 * Schema for creating a direct external customer
 */
export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Customer name must be at least 2 characters."),
  company: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.union([z.string().trim().email("Invalid email address"), z.literal("")]).nullable().optional(),
  address: z.string().trim().nullable().optional(),
  status: customerStatusEnum.default("active"),
  ownerId: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

/**
 * Schema for updating an existing customer
 */
export const updateCustomerSchema = z.object({
  name: z.string().trim().min(2, "Customer name must be at least 2 characters.").optional(),
  company: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.union([z.string().trim().email("Invalid email address"), z.literal("")]).nullable().optional(),
  address: z.string().trim().nullable().optional(),
  status: customerStatusEnum.optional(),
  ownerId: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

/**
 * Schema for converting a Lead into a Customer
 */
export const convertLeadToCustomerSchema = z.object({
  leadId: z.string({ required_error: "Lead ID is required for conversion." }).trim().min(1, "Lead ID is required for conversion."),
  name: z.string().trim().min(2, "Customer name must be at least 2 characters.").optional(),
  company: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.union([z.string().trim().email("Invalid email address"), z.literal("")]).nullable().optional(),
  address: z.string().trim().nullable().optional(),
  ownerId: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

/**
 * Schema for listing and filtering customers
 */
export const customerQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  origin: customerOriginEnum.default("all"),
  ownerId: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "company", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ConvertLeadToCustomerInput = z.infer<typeof convertLeadToCustomerSchema>;
export type CustomerQueryInput = z.input<typeof customerQuerySchema>;
export type CustomerQueryOutput = z.infer<typeof customerQuerySchema>;
