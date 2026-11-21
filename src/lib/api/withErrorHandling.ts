import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { errorResponse } from "./response";
import { logger } from "../logger";

type RouteHandlerContext = {
  params: Promise<Record<string, string | string[]>>;
};

type RouteHandler = (
  request: NextRequest,
  context: RouteHandlerContext
) => Promise<NextResponse> | NextResponse;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context: RouteHandlerContext) => {
    const startTime = performance.now();
    logger.debug(
      {
        event: "API_REQUEST_START",
        method: request.method,
        url: request.url,
      },
      `API request started: ${request.method} ${request.url}`
    );

    try {
      const response = await handler(request, context);
      const durationMs = Math.round(performance.now() - startTime);

      if (durationMs > 1000) {
        logger.warn(
          {
            event: "SLOW_API_REQUEST",
            method: request.method,
            url: request.url,
            statusCode: response.status,
            durationMs,
          },
          `Slow API request: ${request.method} ${request.url} took ${durationMs}ms (status: ${response.status})`
        );
      } else {
        logger.debug(
          {
            event: "API_REQUEST_END",
            method: request.method,
            url: request.url,
            statusCode: response.status,
            durationMs,
          },
          `API request completed: ${request.method} ${request.url} (${response.status}) in ${durationMs}ms`
        );
      }

      return response;
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
      const errorObj = error as { cause?: { message?: string } | string } | undefined;
      const errCause =
        typeof errorObj?.cause === "object"
          ? errorObj.cause?.message
          : typeof errorObj?.cause === "string"
          ? errorObj.cause
          : undefined;

      logger.error(
        {
          event: "UNEXPECTED_EXCEPTION",
          url: request.url,
          method: request.method,
          errorMessage: errMessage,
          errorCause: errCause,
          stack: errStack,
        },
        `Unexpected exception handling ${request.method} ${request.url}: ${errMessage}${
          errCause ? ` | Cause: ${errCause}` : ""
        }`
      );

      return errorResponse({
        statusCode: 500,
        message: "Something went wrong",
        errorCode: "INTERNAL_SERVER_ERROR",
        devMessage: errCause ? `${errMessage} (Cause: ${errCause})` : errMessage,
      });
    }
  };
}

