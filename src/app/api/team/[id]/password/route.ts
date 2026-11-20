import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { resetMemberPassword } from "@/features/users/services/users.service";
import { resetUserPasswordSchema } from "@/features/users/schemas/user.schema";
import { getClientIp, checkRateLimit } from "@/lib/security/rate-limit";

export const PATCH = withErrorHandling(
  async (request: NextRequest, context) => {
    const rawParams = await context?.params;
    const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
    const body = await request.json();

    const clientIp = await getClientIp();
    await checkRateLimit({
      key: "reset-password",
      identifier: clientIp,
      limit: 10,
      windowMs: 15 * 60 * 1000,
      message: "Too many password reset requests. Please try again in 15 minutes.",
    });

    const validatedInput = resetUserPasswordSchema.parse(body);
    const result = await resetMemberPassword(id, validatedInput);

    return successResponse({
      statusCode: 200,
      message: result.message,
      data: result,
    });
  }
);
