import { cookies } from "next/headers";
import { logout } from "@/features/auth/services/auth.service";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export const POST = withErrorHandling(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    await logout(token);
  }

  const isProduction =
    process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

  // Thoroughly expire and clear session cookie across all browser variants
  cookieStore.set({
    name: "session_token",
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  cookieStore.delete("session_token");

  logger.info({ event: "LOGOUT_SUCCESS" }, "User logged out successfully");

  return successResponse({
    statusCode: 200,
    message: "Logout successful.",
    data: null,
  });
});

