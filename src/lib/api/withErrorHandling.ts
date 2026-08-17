import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { errorResponse } from "./response";

type RouteHandler = (
  request: NextRequest,
  context: any
) => Promise<NextResponse> | NextResponse;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // 1. Handle AppError (anticipated domain-level errors)
      if (error instanceof AppError) {
        return errorResponse({
          statusCode: error.statusCode,
          message: error.message,
          errorCode: error.errorCode,
          devMessage: error.devMessage || error.stack,
          errors: error.validationErrors,
        });
      }

      // 2. Handle Zod validation errors
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path].push(err.message);
        });

        return errorResponse({
          statusCode: 400,
          message: "Validation failed",
          errorCode: "VALIDATION_ERROR",
          errors: fieldErrors,
          devMessage: error.message,
        });
      }

      // 3. Handle unexpected errors (500 Internal Server Error)
      const errMessage = error instanceof Error ? error.message : "Unknown error";
      const errStack = error instanceof Error ? error.stack : undefined;

      // Log server-side (Pino logging will refine this in Phase 08)
      console.error("[Unexpected Error]:", {
        message: errMessage,
        stack: errStack,
        url: request.url,
        method: request.method,
      });

      return errorResponse({
        statusCode: 500,
        message: "Something went wrong",
        errorCode: "INTERNAL_SERVER_ERROR",
        devMessage: errMessage,
      });
    }
  };
}
