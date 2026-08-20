import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { errorResponse } from "./response";
import { logger } from "../logger";

type RouteHandlerContext = {
  params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]>;
};

type RouteHandler = (
  request: NextRequest,
  context: RouteHandlerContext
) => Promise<NextResponse> | NextResponse;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context: RouteHandlerContext) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // 1. Handle AppError (anticipated domain-level errors)
      if (error instanceof AppError) {
        if (error.statusCode >= 500) {
          logger.error(
            {
              event: "APP_ERROR_SERVER",
              statusCode: error.statusCode,
              errorCode: error.errorCode,
              url: request.url,
              method: request.method,
              stack: error.stack,
            },
            `Server AppError (${error.statusCode}): ${error.message}`
          );
        } else {
          logger.warn(
            {
              event: "APP_ERROR_CLIENT",
              statusCode: error.statusCode,
              errorCode: error.errorCode,
              url: request.url,
              method: request.method,
            },
            `Client AppError (${error.statusCode}): ${error.message}`
          );
        }

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

        logger.warn(
          {
            event: "VALIDATION_FAILURE",
            url: request.url,
            method: request.method,
            errors: fieldErrors,
          },
          `Validation failed for ${request.method} ${request.url}`
        );

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

      logger.error(
        {
          event: "UNEXPECTED_EXCEPTION",
          url: request.url,
          method: request.method,
          errorMessage: errMessage,
          stack: errStack,
        },
        `Unexpected exception handling ${request.method} ${request.url}: ${errMessage}`
      );

      return errorResponse({
        statusCode: 500,
        message: "Something went wrong",
        errorCode: "INTERNAL_SERVER_ERROR",
        devMessage: errMessage,
      });
    }
  };
}

