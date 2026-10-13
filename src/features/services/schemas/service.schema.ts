import { z } from "zod";

export const billingModelEnum = z.enum(["monthly", "one_time"]);
export const serviceStatusEnum = z.enum(["active", "inactive"]);
export const customerServiceStatusEnum = z.enum(["active", "suspended", "cancelled", "expired"]);

export const catalogServiceSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(100),
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().min(2).max(100),
  categoryKey: z.string().min(2).max(100),
  serviceType: z.string().min(2).max(100),
  plan: z.string().min(1).max(100),
  billingModel: billingModelEnum.default("monthly"),
  billingText: z.string().max(100).nullable().optional(),
  price: z.number().int().min(0, "Price must be non-negative integer paise"),
  priceText: z.string().max(50).nullable().optional(),
  features: z.array(z.string()).default([]),
  rawFeatures: z.array(z.string()).optional(),
  note: z.string().max(500).nullable().optional(),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  status: serviceStatusEnum.default("active"),
});

export const updateCatalogServiceSchema = catalogServiceSchema.partial();

export const websiteSyncResponseSchema = z.object({
  success: z.boolean(),
  syncedAt: z.string(),
  source: z.string(),
  summary: z
    .object({
      categoriesCount: z.number().optional(),
      serviceTypesCount: z.number().optional(),
      catalogItemsCount: z.number().optional(),
      standaloneServicesCount: z.number().optional(),
    })
    .optional(),
  data: z.object({
    catalogItems: z.array(
      z.object({
        externalId: z.string(),
        code: z.string(),
        name: z.string(),
        category: z.string(),
        categoryKey: z.string(),
        serviceType: z.string(),
        plan: z.string(),
        billingModel: billingModelEnum,
        billingText: z.string(),
        priceMinorUnits: z.number().int().min(0),
        priceText: z.string(),
        features: z.array(z.string()),
        rawFeatures: z.array(z.string()).optional(),
        note: z.string().optional().default(""),
        isPopular: z.boolean().optional().default(false),
        sortOrder: z.number().int().optional().default(0),
      })
    ),
    standaloneServices: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().optional(),
          iconName: z.string().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .optional(),
  }),
});

export const assignCustomerServiceSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  serviceId: z.number().int().positive("Valid service ID is required"),
  quantity: z.number().int().positive().default(1),
  price: z.number().int().min(0, "Agreed price in paise must be non-negative"),
  startDate: z.coerce.date().default(() => new Date()),
  endDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: customerServiceStatusEnum.default("active"),
});

export const updateCustomerServiceSchema = z.object({
  quantity: z.number().int().positive().optional(),
  price: z.number().int().min(0).optional(),
  status: customerServiceStatusEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const serviceQuerySchema = z.object({
  categoryKey: z.string().optional(),
  serviceType: z.string().optional(),
  status: z.enum(["active", "inactive", "all"]).default("all"),
  billingModel: z.enum(["monthly", "one_time", "all"]).default("all"),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CatalogServiceInput = z.infer<typeof catalogServiceSchema>;
export type UpdateCatalogServiceInput = z.infer<typeof updateCatalogServiceSchema>;
export type WebsiteSyncResponse = z.infer<typeof websiteSyncResponseSchema>;
export type AssignCustomerServiceInput = z.infer<typeof assignCustomerServiceSchema>;
export type UpdateCustomerServiceInput = z.infer<typeof updateCustomerServiceSchema>;
export type ServiceQueryInput = z.infer<typeof serviceQuerySchema>;
