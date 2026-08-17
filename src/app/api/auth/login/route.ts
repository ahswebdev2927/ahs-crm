import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { login } from "@/features/auth/services/auth.service";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const credentials = loginSchema.parse(body);

  const userAgent = request.headers.get("user-agent");
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");

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
