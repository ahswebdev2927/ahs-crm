import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { logout } from "@/features/auth/services/auth.service";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export const POST = withErrorHandling(async (_request: NextRequest) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    await logout(token);
  }

  // Clear session cookie
  cookieStore.delete("session_token");

  logger.info({ event: "LOGOUT_SUCCESS" }, "User logged out successfully");

  return successResponse({
    statusCode: 200,
    message: "Logout successful.",
    data: null,
  });
});

