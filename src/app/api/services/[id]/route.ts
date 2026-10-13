import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getCatalogItem, updateCatalogItem } from "@/features/services";

export const GET = withErrorHandling(
  async (_request: NextRequest, context) => {
    const user = await requireAuth();
    const rawParams = await context?.params;
    const rawId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
    const numericId = parseInt(rawId, 10);

    const service = await getCatalogItem(user, numericId);

    return successResponse({
      statusCode: 200,
      message: "Service retrieved successfully.",
      data: { service },
    });
  }
);

export const PATCH = withErrorHandling(
  async (request: NextRequest, context) => {
    const user = await requireAuth();
    const rawParams = await context?.params;
    const rawId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
    const numericId = parseInt(rawId, 10);
    const body = await request.json();

    const service = await updateCatalogItem(user, numericId, body);

    return successResponse({
      statusCode: 200,
      message: "Service updated successfully.",
      data: { service },
    });
  }
);

