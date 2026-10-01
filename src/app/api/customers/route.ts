import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth, checkPermission } from "@/features/auth/services/authorization.service";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requireAuth();
  await checkPermission("customers:view");

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const items = await db
    .select({
      id: customers.id,
      name: customers.name,
      company: customers.company,
      phone: customers.phone,
      email: customers.email,
      status: customers.status,
    })
    .from(customers)
    .where(eq(customers.status, "active"))
    .orderBy(desc(customers.createdAt))
    .limit(limit);

  return successResponse({
    statusCode: 200,
    message: "Customers retrieved successfully.",
    data: { items, customers: items },
  });
});
