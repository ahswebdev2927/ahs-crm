import { z } from "zod";

export const leadPartnerRoleEnum = z.enum([
  "co_owner",
  "collaborator",
  "referral",
  "technical_sales",
]);

export const leadPartnerStatusEnum = z.enum(["active", "removed"]);

export const addLeadPartnerSchema = z.object({
  partnerId: z.string().trim().min(1, "Partner user selection is required."),
  percentage: z
    .number({ invalid_type_error: "Percentage must be a number." })
    .int("Percentage must be a whole number.")
    .min(0, "Percentage cannot be negative.")
    .max(100, "Percentage cannot exceed 100%."),
  role: leadPartnerRoleEnum.default("collaborator"),
});

export const updateLeadPartnerSchema = z
  .object({
    percentage: z
      .number({ invalid_type_error: "Percentage must be a number." })
      .int("Percentage must be a whole number.")
      .min(0, "Percentage cannot be negative.")
      .max(100, "Percentage cannot exceed 100%.")
      .optional(),
    role: leadPartnerRoleEnum.optional(),
  })
  .refine(
    (data) => data.percentage !== undefined || data.role !== undefined,
    { message: "At least one field (percentage or role) must be provided to update." }
  );

export const removeLeadPartnerSchema = z.object({
  removalReason: z.string().trim().nullable().optional(),
});

export type AddLeadPartnerInput = z.infer<typeof addLeadPartnerSchema>;
export type UpdateLeadPartnerInput = z.infer<typeof updateLeadPartnerSchema>;
export type RemoveLeadPartnerInput = z.infer<typeof removeLeadPartnerSchema>;
export type LeadPartnerRole = z.infer<typeof leadPartnerRoleEnum>;
export type LeadPartnerStatus = z.infer<typeof leadPartnerStatusEnum>;
