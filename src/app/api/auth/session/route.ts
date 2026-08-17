import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/features/auth/services/auth.service";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { AppError } from "@/lib/errors/AppError";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) {
    throw new AppError(
      "Authentication session token is missing.",
      401,
      "UNAUTHORIZED",
      "No 'session_token' cookie found in the request."
    );
  }

  const user = await verifySession(token);

  return successResponse({
    statusCode: 200,
    message: "Session authenticated successfully.",
    data: { user },
  });
});
