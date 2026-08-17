export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode?: string;
  public readonly devMessage?: string;
  public readonly validationErrors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number = 400,
    errorCode?: string,
    devMessage?: string,
    validationErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.devMessage = devMessage;
    this.validationErrors = validationErrors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
