import { NextResponse } from "next/server";
import { ApiSuccessResponse, ApiErrorResponse } from "./types";

export function successResponse<T>({
  statusCode = 200,
  message,
  data,
}: {
  statusCode?: number;
  message: string;
  data: T;
}): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      status: true,
      statusCode: statusCode,
      message,
      data,
    },
    { status: statusCode }
  );
}

export function errorResponse({
  statusCode,
  message,
  errorCode,
  devMessage,
  errors,
}: {
  statusCode: number;
  message: string;
  errorCode?: string;
  devMessage?: string;
  errors?: Record<string, string[]>;
}): NextResponse<ApiErrorResponse> {
  const isProduction = process.env.APP_ENV === "production";

  const payload: ApiErrorResponse = {
    status: false,
    statusCode: statusCode,
    message,
    data: null,
  };

  if (errorCode) {
    payload.errorCode = errorCode;
  }

  if (errors) {
    payload.errors = errors;
  }

  if (devMessage && !isProduction) {
    payload.devMessage = devMessage;
  }

  return NextResponse.json(payload, { status: statusCode });
}
