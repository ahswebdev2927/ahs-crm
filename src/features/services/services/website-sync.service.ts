import { AppError } from "@/lib/errors/AppError";
import { logger } from "@/lib/logger";
import { assertUserPermission } from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import { upsertCatalogItemsFromSync } from "../repositories/service.repository";
import { websiteSyncResponseSchema } from "../schemas/service.schema";
import type { SyncResult } from "../types/service.types";

/**
 * Normalizes the base website URL by stripping trailing slashes.
 */
export const resolveWebsiteSyncUrl = (): string => {
  const rawUrl =
    process.env.AHS_WEBSITE_URL ||
    process.env.AHS_WEBSITE_API_URL ||
    "http://localhost:3001";
  const baseUrl = rawUrl.trim().replace(/\/+$/, "");
  return `${baseUrl}/api/crm/services`;
};

/**
 * Triggers on-demand synchronization of the service catalog from the
 * AHS Public Website's authenticated read-only API endpoint.
 *
 * Requirements enforced:
 * - Server-side RBAC: Only 'services:edit' (Admin / Sales Manager)
 * - Trailing slash sanitization on AHS_WEBSITE_URL
 * - Shared Bearer / x-crm-api-key authentication
 * - Strict Zod schema verification of incoming catalog structure
 * - Transactional upsert by SKU code (never altering historical customer_services)
 */
export const syncServicesFromWebsite = async (
  user: AuthenticatedUserPayload
): Promise<SyncResult> => {
  assertUserPermission(user, "services:edit");

  const syncApiKey = process.env.CRM_SYNC_API_KEY;
  if (!syncApiKey || syncApiKey.trim().length < 16) {
    logger.error("CRM_SYNC_API_KEY is not configured or too short.");
    throw new AppError(
      "Service sync is not configured on the CRM server (missing CRM_SYNC_API_KEY).",
      503,
      "SERVICE_UNAVAILABLE"
    );
  }

  const endpointUrl = resolveWebsiteSyncUrl();
  logger.info({ endpointUrl }, "Initiating service catalog sync from AHS Public Website");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${syncApiKey.trim()}`,
        "x-crm-api-key": syncApiKey.trim(),
        "User-Agent": "AHS-SalesCRM-SyncClient/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const isAbort = (error as Error)?.name === "AbortError";
    logger.error({ err: error, isAbort, endpointUrl }, "Failed to connect to AHS Public Website sync endpoint");
    throw new AppError(
      isAbort
        ? "Connection to AHS Public Website timed out. Please verify that the website server is running."
        : `Could not reach AHS Public Website at ${endpointUrl}. Verify the network connection and URL.`,
      502,
      "BAD_GATEWAY"
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorStatus = response.status;
    let errorMessage = `Public website API returned HTTP ${errorStatus}`;
    try {
      const errJson = await response.json();
      if (errJson?.message) errorMessage = errJson.message;
    } catch {
      // Non-json response
    }

    logger.warn({ status: errorStatus, errorMessage }, "Public website sync API rejected request");

    if (errorStatus === 401 || errorStatus === 403) {
      throw new AppError(
        "Website sync authentication failed. Verify that CRM_SYNC_API_KEY matches on both sites.",
        401,
        "UNAUTHORIZED"
      );
    }

    throw new AppError(
      `Failed to fetch service catalog from public website: ${errorMessage}`,
      502,
      "BAD_GATEWAY"
    );
  }

  let rawData: unknown;
  try {
    rawData = await response.json();
  } catch (jsonErr) {
    logger.error({ err: jsonErr }, "Malformed JSON response from public website API");
    throw new AppError("Invalid JSON returned by public website API.", 502, "BAD_GATEWAY");
  }

  const parseResult = websiteSyncResponseSchema.safeParse(rawData);
  if (!parseResult.success) {
    logger.error({ errors: parseResult.error.format() }, "Website sync schema validation failed");
    throw new AppError(
      "Public website response did not match the required CRM catalog schema.",
      422,
      "UNPROCESSABLE_ENTITY"
    );
  }

  const { catalogItems } = parseResult.data.data;
  const syncResult = await upsertCatalogItemsFromSync(catalogItems);

  logger.info(
    {
      total: syncResult.totalReceived,
      added: syncResult.addedCount,
      updated: syncResult.updatedCount,
    },
    "Successfully synchronized service catalog from AHS Public Website"
  );

  return syncResult;
};
