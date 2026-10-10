import { AppError } from "@/lib/errors/AppError";
import {
  checkPermission,
  assertUserPermission,
  checkCustomerAccess,
  checkLeadAccess,
  getCustomerVisibilityFilter,
} from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  findCustomers,
  findCustomerById,
  createCustomerRecord,
  updateCustomerRecord,
  convertLeadTransaction,
} from "../repositories/customer.repository";
import {
  createCustomerSchema,
  updateCustomerSchema,
  convertLeadToCustomerSchema,
  customerQuerySchema,
} from "../schemas/customer.schema";
import type {
  CustomerItem,
  CustomerDetail,
  CustomerListResponse,
  CreateCustomerInput,
  UpdateCustomerInput,
  ConvertLeadToCustomerInput,
  CustomerQueryInput,
} from "../types/customer.types";

/**
 * Customer Business Logic Service
 * Enforces server-side authentication, authorization, Zod validation,
 * and atomic lead-to-customer conversion governance.
 */

export const getCustomers = async (
  user: AuthenticatedUserPayload,
  params: CustomerQueryInput
): Promise<CustomerListResponse> => {
  // 1. Authorization check
  assertUserPermission(user, "customers:view");

  // 2. Validate query input
  const validatedParams = customerQuerySchema.parse(params);

  // 3. Resolve data visibility filter
  const visibilityFilter = getCustomerVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  // 4. Query repository
  const { items, total } = await findCustomers(visibilityFilter, validatedParams);

  const limit = validatedParams.limit ?? 10;
  const page = validatedParams.page ?? 1;
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

export const getCustomerById = async (
  user: AuthenticatedUserPayload,
  customerId: string
): Promise<CustomerDetail> => {
  // 1. Authorization & visibility check
  await checkCustomerAccess(customerId, "view", user);

  // 2. Query repository
  const customer = await findCustomerById(customerId);

  if (!customer) {
    throw new AppError("Customer not found.", 404, "NOT_FOUND");
  }

  return customer;
};

export const createCustomer = async (
  user: AuthenticatedUserPayload,
  input: CreateCustomerInput
): Promise<CustomerItem> => {
  // 1. Authorization check
  assertUserPermission(user, "customers:create");

  // 2. Validate Zod input
  const validated = createCustomerSchema.parse(input);

  // 3. Assign owner (default to current user if not provided)
  const ownerId = validated.ownerId && validated.ownerId.trim() !== "" ? validated.ownerId.trim() : user.id;

  // 4. Create customer record
  return await createCustomerRecord({
    ...validated,
    id: crypto.randomUUID(),
    ownerId,
  });
};

export const updateCustomer = async (
  user: AuthenticatedUserPayload,
  customerId: string,
  input: UpdateCustomerInput
): Promise<CustomerDetail> => {
  // 1. Authorization & visibility check
  await checkCustomerAccess(customerId, "edit", user);

  // 2. Validate Zod input
  const validated = updateCustomerSchema.parse(input);

  // 3. Verify customer exists
  const existing = await findCustomerById(customerId);
  if (!existing) {
    throw new AppError("Customer not found.", 404, "NOT_FOUND");
  }

  // 4. Execute update
  return await updateCustomerRecord(customerId, validated);
};

export const convertLeadToCustomer = async (
  user: AuthenticatedUserPayload,
  input: ConvertLeadToCustomerInput
): Promise<CustomerDetail> => {
  // 1. Validate Zod input
  const validated = convertLeadToCustomerSchema.parse(input);

  // 2. Verify permission to create customers
  assertUserPermission(user, "customers:create");

  // 3. Verify user has edit access to the lead being converted
  await checkLeadAccess(validated.leadId, "edit", user);

  // 4. Execute atomic conversion transaction
  return await convertLeadTransaction(
    validated.leadId,
    {
      name: validated.name,
      company: validated.company,
      phone: validated.phone,
      email: validated.email,
      address: validated.address,
      ownerId: validated.ownerId,
      notes: validated.notes,
    },
    user.id
  );
};
