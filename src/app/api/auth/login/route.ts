import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { login } from "@/features/auth/services/auth.service";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { getClientIp, checkRateLimit } from "@/lib/security/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const credentials = loginSchema.parse(body);

  const userAgent = request.headers.get("user-agent");
  const ipAddress = await getClientIp();

  // Enforce rate limiting: 5 attempts per 15 minutes per IP
  await checkRateLimit({
    key: "login",
    identifier: ipAddress,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  const { user, token } = await login(
    credentials.email,
    credentials.password,
    userAgent,
    ipAddress
  );

  const cookieStore = await cookies();
  cookieStore.set({
    name: "session_token",
    value: token,
    httpOnly: true,
    secure: process.env.APP_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  });

  return successResponse({
    statusCode: 200,
    message: "Login successful.",
    data: { user },
  });
});
