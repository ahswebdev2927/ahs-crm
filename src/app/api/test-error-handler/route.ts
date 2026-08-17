import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { AppError } from "@/lib/errors/AppError";
import { z } from "zod";

const testSchema = z.object({
  email: z.string().email("Invalid email address"),
  age: z.number().min(18, "Age must be at least 18"),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get("scenario") || "success";

  switch (scenario) {
    case "success":
      return successResponse({
        statusCode: 200,
        message: "Successfully executed test scenario.",
        data: {
          test: "active",
          timestamp: new Date().toISOString(),
        },
      });

    case "app-error":
      throw new AppError(
        "Lead assignment conflict detected.",
        409,
        "CONFLICT",
        "The lead is already assigned to owner 'user-inside'."
      );

    case "validation":
      // Trigger a Zod parsing failure
      testSchema.parse({
        email: "not-an-email",
        age: 12,
      });
      // Fallback response (should never be reached)
      return successResponse({ message: "Validation passed", data: {} });

    case "unexpected":
      // Throw a standard exception
      throw new Error("Failed to connect to database client driver.");

    default:
      throw new AppError(
        `Scenario '${scenario}' not found.`,
        404,
        "NOT_FOUND"
      );
  }
});
