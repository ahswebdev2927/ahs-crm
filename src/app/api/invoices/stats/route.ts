import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getInvoicesStats } from "@/features/invoices/services/invoice.service";

/**
 * GET /api/invoices/stats
 * Aggregate billing KPIs (Total Billed, Total Collected, Outstanding, Overdue).
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const user = await requireAuth();
  const stats = await getInvoicesStats(user);

  return successResponse({
    statusCode: 200,
    message: "Invoice statistics retrieved successfully.",
    data: { stats },
  });
});
