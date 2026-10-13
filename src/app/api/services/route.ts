import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getCatalog,
  createCatalogItem,
  getServiceKpis,
} from "@/features/services";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const result = await getCatalog(user, queryParams as any);
  const kpis = await getServiceKpis(user);

  return successResponse({
    statusCode: 200,
    message: "Services retrieved successfully.",
    data: {
      ...result,
      kpis,
      services: result.items,
    },
  });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const service = await createCatalogItem(user, body);

  return successResponse({
    statusCode: 201,
    message: "Service created successfully.",
    data: { service },
  });
});
