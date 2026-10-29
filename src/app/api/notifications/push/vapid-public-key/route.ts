import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";

/**
 * GET /api/notifications/push/vapid-public-key
 * Returns the configured public VAPID key to authenticated browser clients.
 */
export const GET = withErrorHandling(async () => {
  await requireAuth();

  const key = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim().replace(/^["']|["']$/g, "");

  return successResponse({
    statusCode: 200,
    message: "VAPID public key retrieved successfully.",
    data: {
      publicKey: key,
    },
  });
});
