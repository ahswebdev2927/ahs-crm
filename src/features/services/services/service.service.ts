import { randomUUID } from "crypto";
import { AppError } from "@/lib/errors/AppError";
import {
  assertUserPermission,
  checkCustomerAccess,
} from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  findCatalogServices,
  findCatalogServiceById,
  findCatalogServiceByCode,
  createCatalogServiceRecord,
  updateCatalogServiceRecord,
  findCustomerServices,
  findCustomerServiceById,
  assignServiceToCustomerRecord,
  updateCustomerServiceRecord,
  getServicesKpis,
} from "../repositories/service.repository";
import {
  catalogServiceSchema,
  updateCatalogServiceSchema,
  assignCustomerServiceSchema,
  updateCustomerServiceSchema,
  serviceQuerySchema,
  type CatalogServiceInput,
  type UpdateCatalogServiceInput,
  type AssignCustomerServiceInput,
  type UpdateCustomerServiceInput,
  type ServiceQueryInput,
} from "../schemas/service.schema";
import type {
  CatalogServiceItem,
  CustomerServiceSubscriptionItem,
  ServiceKpis,
  BillingModel,
} from "../types/service.types";

/**
 * Service Catalog Business Logic
 * Enforces server-side authentication, authorization, Zod validation,
 * price integrity, and immutable customer subscription snapshots.
 */

export const getCatalog = async (
  user: AuthenticatedUserPayload,
  params: ServiceQueryInput
): Promise<{ items: CatalogServiceItem[]; total: number }> => {
  assertUserPermission(user, "services:view");
  const validatedParams = serviceQuerySchema.parse(params);
  return findCatalogServices(validatedParams);
};

export const getCatalogItem = async (
  user: AuthenticatedUserPayload,
  id: number
): Promise<CatalogServiceItem> => {
  assertUserPermission(user, "services:view");
  const item = await findCatalogServiceById(id);
  if (!item) {
    throw new AppError("Service not found in catalog.", 404, "NOT_FOUND");
  }
  return item;
};

export const createCatalogItem = async (
  user: AuthenticatedUserPayload,
  input: CatalogServiceInput
): Promise<CatalogServiceItem> => {
  assertUserPermission(user, "services:create");
  const validated = catalogServiceSchema.parse(input);

  const existing = await findCatalogServiceByCode(validated.code);
  if (existing) {
    throw new AppError(
      `Service with code "${validated.code}" already exists.`,
      409,
      "CONFLICT"
    );
  }

  return createCatalogServiceRecord(validated);
};

export const updateCatalogItem = async (
  user: AuthenticatedUserPayload,
  id: number,
  input: UpdateCatalogServiceInput
): Promise<CatalogServiceItem> => {
  assertUserPermission(user, "services:edit");
  const validated = updateCatalogServiceSchema.parse(input);

  const existing = await findCatalogServiceById(id);
  if (!existing) {
    throw new AppError("Service not found in catalog.", 404, "NOT_FOUND");
  }

  if (validated.code && validated.code !== existing.code) {
    const codeConflict = await findCatalogServiceByCode(validated.code);
    if (codeConflict && codeConflict.id !== id) {
      throw new AppError(
        `Service with code "${validated.code}" already exists.`,
        409,
        "CONFLICT"
      );
    }
  }

  const updated = await updateCatalogServiceRecord(id, validated);
  if (!updated) {
    throw new AppError("Failed to update service.", 500, "INTERNAL_ERROR");
  }

  return updated;
};

export const getCustomerSubscriptions = async (
  user: AuthenticatedUserPayload,
  customerId: string
): Promise<CustomerServiceSubscriptionItem[]> => {
  assertUserPermission(user, "customers:view");
  await checkCustomerAccess(customerId, "view", user);
  return findCustomerServices(customerId);
};

export const assignService = async (
  user: AuthenticatedUserPayload,
  input: AssignCustomerServiceInput
): Promise<CustomerServiceSubscriptionItem> => {
  assertUserPermission(user, "customers:edit");
  const validated = assignCustomerServiceSchema.parse(input);

  // Verify access to target customer
  await checkCustomerAccess(validated.customerId, "edit", user);

  // Retrieve source catalog service
  const catalogService = await findCatalogServiceById(validated.serviceId);
  if (!catalogService) {
    throw new AppError("Catalog service not found.", 404, "NOT_FOUND");
  }

  if (catalogService.status !== "active") {
    throw new AppError("Cannot assign an inactive service plan.", 400, "BAD_REQUEST");
  }

  const quantity = validated.quantity ?? 1;
  const unitPrice = validated.price;
  const totalPrice = unitPrice * quantity;
  const subscriptionId = randomUUID();

  // Immutable historical snapshots (PRD FR-12 / Architecture §25)
  return assignServiceToCustomerRecord({
    id: subscriptionId,
    customerId: validated.customerId,
    serviceId: catalogService.id,
    serviceNameSnapshot: catalogService.name,
    categorySnapshot: catalogService.category,
    serviceTypeSnapshot: catalogService.serviceType,
    planSnapshot: catalogService.plan,
    catalogPriceSnapshot: catalogService.price,
    billingModel: catalogService.billingModel,
    billingText: catalogService.billingText,
    quantity,
    price: unitPrice,
    totalPrice,
    notes: validated.notes ?? null,
    status: validated.status ?? "active",
    startDate: validated.startDate,
    endDate: validated.endDate ?? null,
    createdById: user.id,
  });
};

export const updateSubscription = async (
  user: AuthenticatedUserPayload,
  assignmentId: string,
  input: UpdateCustomerServiceInput
): Promise<CustomerServiceSubscriptionItem> => {
  assertUserPermission(user, "customers:edit");
  const validated = updateCustomerServiceSchema.parse(input);

  const existing = await findCustomerServiceById(assignmentId);
  if (!existing) {
    throw new AppError("Customer subscription not found.", 404, "NOT_FOUND");
  }

  await checkCustomerAccess(existing.customerId, "edit", user);

  const quantity = validated.quantity !== undefined ? validated.quantity : existing.quantity;
  const price = validated.price !== undefined ? validated.price : existing.price;
  const totalPrice = price * quantity;

  const updated = await updateCustomerServiceRecord(assignmentId, {
    quantity,
    price,
    totalPrice,
    status: validated.status,
    startDate: validated.startDate,
    endDate: validated.endDate,
    notes: validated.notes,
  });

  if (!updated) {
    throw new AppError("Failed to update subscription.", 500, "INTERNAL_ERROR");
  }

  return updated;
};

export const getServiceKpis = async (
  user: AuthenticatedUserPayload,
  customerId?: string
): Promise<ServiceKpis> => {
  assertUserPermission(user, "services:view");
  if (customerId) {
    await checkCustomerAccess(customerId, "view", user);
  }
  return getServicesKpis(customerId);
};
