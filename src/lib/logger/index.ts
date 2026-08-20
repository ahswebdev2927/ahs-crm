import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

const sensitivePaths = [
  "password",
  "confirmPassword",
  "newPassword",
  "currentPassword",
  "oldPassword",
  "token",
  "jwt",
  "refreshToken",
  "accessToken",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "dbUrl",
  "*.password",
  "*.confirmPassword",
  "*.newPassword",
  "*.token",
  "*.jwt",
  "*.refreshToken",
  "*.accessToken",
  "*.secret",
  "*.apiKey",
  "*.authorization",
  "*.cookie",
  "*.dbUrl",
  "headers.authorization",
  "headers.cookie",
  "headers.set-cookie",
  "req.headers.authorization",
  "req.headers.cookie",
];

// Configure multi-stream: normal logs -> stdout, error/fatal -> stderr
const streams: pino.StreamEntry[] = [
  { level: "info", stream: process.stdout },
  { level: "error", stream: process.stderr },
];

export const logger = pino(
  {
    level: logLevel,
    base: {
      env: process.env.NODE_ENV || "development",
      service: "ahs-salescrm",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: sensitivePaths,
      censor: "[REDACTED]",
    },
  },
  pino.multistream(streams)
);

// --- Domain Observability Helpers ---

/**
 * Log authentication failure events
 */
export function logAuthFailure(details: {
  email?: string;
  ip?: string | null;
  reason: string;
  userAgent?: string | null;
}) {
  logger.warn(
    {
      event: "AUTH_FAILURE",
      email: details.email,
      ip: details.ip || "unknown",
      reason: details.reason,
      userAgent: details.userAgent || undefined,
    },
    `Authentication failed: ${details.reason}`
  );
}

/**
 * Log authorization / permission failure events
 */
export function logAuthzFailure(details: {
  userId?: string;
  requiredPermission?: string;
  scope?: string;
  action?: string;
  resource?: string;
  reason?: string;
}) {
  logger.warn(
    {
      event: "AUTHZ_FAILURE",
      userId: details.userId || "anonymous",
      requiredPermission: details.requiredPermission,
      scope: details.scope,
      action: details.action,
      resource: details.resource,
      reason: details.reason || "Permission denied",
    },
    `Authorization failed for user ${details.userId || "anonymous"}`
  );
}

/**
 * Log rate limit violation events
 */
export function logRateLimitViolation(details: {
  key: string;
  ip?: string | null;
  limit: number;
  windowMs?: number;
}) {
  logger.warn(
    {
      event: "RATE_LIMIT_VIOLATION",
      key: details.key,
      ip: details.ip || "unknown",
      limit: details.limit,
      windowMs: details.windowMs,
    },
    `Rate limit exceeded for key: ${details.key} from IP: ${details.ip || "unknown"}`
  );
}

/**
 * Log important business mutations (e.g. ownership transfer, stage changes, payments)
 */
export function logBusinessMutation(details: {
  action: string;
  entity: string;
  entityId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}) {
  logger.info(
    {
      event: "BUSINESS_MUTATION",
      action: details.action,
      entity: details.entity,
      entityId: details.entityId,
      actorId: details.actorId || "system",
      metadata: details.metadata,
    },
    `Business mutation: ${details.action} on ${details.entity} (${details.entityId || "N/A"}) by ${details.actorId || "system"}`
  );
}

/**
 * Log external service failures (Cloudinary, Turso DB, External APIs)
 */
export function logExternalServiceFailure(details: {
  service: string;
  operation: string;
  error: unknown;
  context?: Record<string, unknown>;
}) {
  const errMessage = details.error instanceof Error ? details.error.message : String(details.error);
  const errStack = details.error instanceof Error ? details.error.stack : undefined;

  logger.error(
    {
      event: "EXTERNAL_SERVICE_FAILURE",
      service: details.service,
      operation: details.operation,
      errorMessage: errMessage,
      stack: errStack,
      context: details.context,
    },
    `External service failure [${details.service}]: ${details.operation} failed - ${errMessage}`
  );
}
