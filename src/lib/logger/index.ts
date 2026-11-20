import pino from "pino";

const isProduction =
  process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
const logLevel: pino.Level =
  (process.env.LOG_LEVEL as pino.Level) || (isProduction ? "info" : "debug");

// Base sensitive keys to be redacted across all payload depths
export const SENSITIVE_KEYS = [
  // Passwords
  "password",
  "confirmPassword",
  "newPassword",
  "currentPassword",
  "oldPassword",
  // Tokens
  "token",
  "sessionToken",
  "session_token",
  "jwt",
  "refreshToken",
  "refresh_token",
  "accessToken",
  "access_token",
  "csrfToken",
  "csrf_token",
  "idToken",
  // Secrets
  "secret",
  "jwtSecret",
  "jwt_secret",
  "cronSecret",
  "cron_secret",
  // API Keys
  "apiKey",
  "api_key",
  "cloudinaryApiKey",
  "cloudinary_api_key",
  "cloudinaryApiSecret",
  "cloudinary_api_secret",
  // Database & Connection strings
  "dbUrl",
  "db_url",
  "databaseUrl",
  "database_url",
  "tursoAuthToken",
  "turso_auth_token",
  // Headers & Cookies
  "authorization",
  "cookie",
  "set-cookie",
  // Sensitive IDs & Payment details
  "creditCard",
  "cardNumber",
  "cvv",
  "panNumber",
  "aadhaarNumber",
];

// Generate multi-depth wildcard paths (depths 0 through 5) for fast-redact
export function generateSensitivePaths(keys: string[], maxDepth: number = 5): string[] {
  const paths: string[] = [];
  for (const key of keys) {
    paths.push(key);
    for (let depth = 1; depth <= maxDepth; depth++) {
      paths.push(`${"*.".repeat(depth)}${key}`);
    }
  }

  // Common explicit nested header patterns
  paths.push(
    "headers.authorization",
    "headers.cookie",
    "headers.set-cookie",
    "headers['set-cookie']",
    "req.headers.authorization",
    "req.headers.cookie",
    "req.headers.set-cookie"
  );

  return Array.from(new Set(paths));
}

export const sensitivePaths = generateSensitivePaths(SENSITIVE_KEYS, 5);

// Configure multi-stream: normal logs (debug, info, warn) -> stdout, errors (error, fatal) -> stderr
// dedupe: true ensures messages are sent to the highest matching level stream without duplication
const streams: pino.StreamEntry[] = [
  { level: logLevel, stream: process.stdout },
  { level: "error", stream: process.stderr },
];

export const pinoOptions: pino.LoggerOptions = {
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
};

export const logger =
  typeof pino.multistream === "function"
    ? pino(pinoOptions, pino.multistream(streams, { dedupe: true }))
    : pino(pinoOptions);

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

/**
 * Log general domain service errors
 */
export function logServiceError(details: {
  service: string;
  operation: string;
  error: unknown;
  context?: Record<string, unknown>;
}) {
  const errMessage = details.error instanceof Error ? details.error.message : String(details.error);
  const errStack = details.error instanceof Error ? details.error.stack : undefined;

  logger.error(
    {
      event: "SERVICE_ERROR",
      service: details.service,
      operation: details.operation,
      errorMessage: errMessage,
      stack: errStack,
      context: details.context,
    },
    `Service error [${details.service}]: ${details.operation} failed - ${errMessage}`
  );
}
