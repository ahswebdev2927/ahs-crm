import { z } from "zod";

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(2, "Search query must be at least 2 characters."),
  limit: z.coerce.number().int().min(1).max(10).default(4),
});

export type GlobalSearchQueryInput = z.infer<typeof globalSearchQuerySchema>;
