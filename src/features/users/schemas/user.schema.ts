import { z } from "zod";

export const dataVisibilityEnum = z.enum(["own", "shared", "partnered", "team", "all"]);
export const userStatusEnum = z.enum(["active", "inactive", "suspended"]);
export const permissionOverrideTypeEnum = z.enum(["allow", "deny"]);

export const userPermissionOverrideSchema = z.object({
  permissionId: z.number().int().positive(),
  type: permissionOverrideTypeEnum,
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long."),
  email: z.string().trim().email("Please provide a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  roleId: z.number().int().positive("Role is required."),
  departmentId: z.number().int().positive().nullable().optional(),
  teamId: z.number().int().positive().nullable().optional(),
  managerId: z.string().trim().nullable().optional(),
  teamName: z.string().trim().min(2, "Team name must be at least 2 characters.").optional(),
  dataVisibility: dataVisibilityEnum.default("own"),
  permissions: z.array(userPermissionOverrideSchema).optional().default([]),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long.").optional(),
  email: z.string().trim().email("Please provide a valid email address.").optional(),
  roleId: z.number().int().positive("Role must be valid.").optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  teamId: z.number().int().positive().nullable().optional(),
  managerId: z.string().trim().nullable().optional(),
  teamName: z.string().trim().min(2, "Team name must be at least 2 characters.").optional(),
  dataVisibility: dataVisibilityEnum.optional(),
  permissions: z.array(userPermissionOverrideSchema).optional(),
});

export const resetUserPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
});

export const updateUserStatusSchema = z.object({
  status: userStatusEnum,
});

export const userQuerySchema = z.object({
  search: z.string().optional(),
  roleId: z.coerce.number().int().optional(),
  departmentId: z.coerce.number().int().optional(),
  status: userStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
