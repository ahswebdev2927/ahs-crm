import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { logout } from "@/features/auth/services/auth.service";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    await logout(token);
  }

  // Clear session cookie
  cookieStore.delete("session_token");

  return successResponse({
    statusCode: 200,
    message: "Logout successful.",
    data: null,
  });
});
