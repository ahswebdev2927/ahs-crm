import { z } from "zod";

export const reportsFilterSchema = z.object({
  tab: z.enum(["sales", "salesperson", "manager", "customer", "payments"]).default("sales"),
  preset: z.enum(["today", "7d", "30d", "this_month", "last_month", "this_quarter", "this_year", "custom"]).default("30d"),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  teamId: z.coerce.number().optional(),
  userId: z.string().optional(),
});

export type ReportsFilterInput = z.infer<typeof reportsFilterSchema>;
