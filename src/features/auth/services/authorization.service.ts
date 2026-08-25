import { cookies } from "next/headers";
import { or, eq, exists, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { AppError } from "@/lib/errors/AppError";
import { logAuthzFailure } from "@/lib/logger";
import {
  users,
  leads,
  leadPartners,
  customers,
  appointments,
  followUps,
  fieldVisits,
  tasks,
  quotations,
  invoices,
  payments
} from "@/db/schema";
import { verifySession } from "./auth.service";
import type { AuthenticatedUserPayload } from "./auth.service";

/**
 * Retrieves the currently logged-in user from the session cookie
 * or returns null if unauthenticated.
 */
export const getSessionUser = async (): Promise<AuthenticatedUserPayload | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token) return null;
    return await verifySession(token);
  } catch (_error) {
    return null;
  }
};

/**
 * Ensures a user is authenticated. Throws AppError 401 if not.
 */
export const requireAuth = async (): Promise<AuthenticatedUserPayload> => {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError(
      "Authentication session token is missing. Please log in.",
      401,
      "UNAUTHORIZED"
    );
  }
  return user;
};

/**
 * Verifies that the user has the specified permission.
 * Throws AppError 403 if they do not.
 * Note: 'super_admin' bypasses all permission checks.
 */
export const checkPermission = async (
  permissionCode: string
): Promise<AuthenticatedUserPayload> => {
  const user = await requireAuth();

  if (user.role.code === "super_admin") {
    return user;
  }

  if (!user.permissions.includes(permissionCode)) {
    logAuthzFailure({
      userId: user.id,
      requiredPermission: permissionCode,
      reason: "Missing permission code",
    });
    throw new AppError(
      `Access denied. You do not have the required permission: ${permissionCode}`,
      403,
      "FORBIDDEN"
    );
  }

  return user;
};

/**
 * Verifies that the user has at least one of the specified permissions.
 * Throws AppError 403 if they do not.
 * Note: 'super_admin' bypasses all permission checks.
 */
export const checkAnyPermission = async (
  permissionCodes: string[]
): Promise<AuthenticatedUserPayload> => {
  const user = await requireAuth();

  if (user.role.code === "super_admin") {
    return user;
  }

  const hasAny = permissionCodes.some((code) => user.permissions.includes(code));
  if (!hasAny) {
    logAuthzFailure({
      userId: user.id,
      requiredPermission: permissionCodes.join(", "),
      reason: "Missing all required permission codes",
    });
    throw new AppError(
      `Access denied. You do not have any of the required permissions: ${permissionCodes.join(", ")}`,
      403,
      "FORBIDDEN"
    );
  }

  return user;
};

/**
 * Generates a Drizzle ORM filter condition for Lead visibility based on the user's role and team.
 * - 'super_admin' and 'all' visibility see all records (returns undefined).
 * - 'team' visibility filters leads owned by any member of the user's assigned team.
 * - 'own' visibility filters leads owned, created, or partnered by the user.
 */
export const getLeadVisibilityFilter = (
  userId: string,
  roleCode: string,
  dataVisibility?: string,
  teamId?: number | null
) => {
  if (roleCode === "super_admin" || dataVisibility === "all") {
    return undefined;
  }

  if (dataVisibility === "team" && teamId) {
    return or(
      eq(leads.ownerId, userId),
      eq(leads.createdById, userId),
      exists(
        db
          .select()
          .from(users)
          .where(
            and(
              eq(users.id, leads.ownerId),
              eq(users.teamId, teamId)
            )
          )
      )
    );
  }

  return or(
    eq(leads.ownerId, userId),
    eq(leads.createdById, userId),
    exists(
      db
        .select()
        .from(leadPartners)
        .where(
          and(
            eq(leadPartners.leadId, leads.id),
            eq(leadPartners.partnerId, userId),
            eq(leadPartners.status, "active")
          )
        )
    )
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Lead.
 */
export const checkLeadAccess = async (
  leadId: string,
  action: "view" | "create" | "edit" | "delete" | "assign" | "export"
): Promise<AuthenticatedUserPayload> => {
  const user = await checkPermission(`leads:${action === "delete" || action === "assign" ? "edit" : action === "export" ? "view" : action}`);

  if (user.role.code === "super_admin" || user.role.code === "sales_manager") {
    return user;
  }

  const lead = await db
    .select({
      id: leads.id,
      ownerId: leads.ownerId,
      createdById: leads.createdById,
    })
    .from(leads)
    .where(eq(leads.id, leadId))
    .get();

  if (!lead) {
    throw new AppError("Lead not found.", 404, "NOT_FOUND");
  }

  const isOwner = lead.ownerId === user.id;
  const isCreator = lead.createdById === user.id;

  const isPartner = await db
    .select()
    .from(leadPartners)
    .where(
      and(
        eq(leadPartners.leadId, leadId),
        eq(leadPartners.partnerId, user.id),
        eq(leadPartners.status, "active")
      )
    )
    .get();

  if (!isOwner && !isCreator && !isPartner) {
    throw new AppError(
      "Access denied. You do not have visibility permissions for this lead.",
      403,
      "FORBIDDEN"
    );
  }

  return user;
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Customer.
 */
export const checkCustomerAccess = async (
  customerId: string,
  _action: "view" | "edit" | "delete"
): Promise<AuthenticatedUserPayload> => {
  const user = await checkPermission("customers:view");

  if (user.role.code === "super_admin" || user.role.code === "sales_manager") {
    return user;
  }

  const customer = await db
    .select({
      id: customers.id,
      ownerId: customers.ownerId,
      leadId: customers.leadId,
    })
    .from(customers)
    .where(eq(customers.id, customerId))
    .get();

  if (!customer) {
    throw new AppError("Customer not found.", 404, "NOT_FOUND");
  }

  if (customer.ownerId === user.id) {
    return user;
  }

  if (customer.leadId) {
    try {
      await checkLeadAccess(customer.leadId, "view");
      return user;
    } catch (_e) {
      // Ignored: falls through to access denied error
    }
  }

  throw new AppError(
    "Access denied. You do not have visibility permissions for this customer.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on an Appointment.
 */
export const checkAppointmentAccess = async (
  appointmentId: string,
  action: "view" | "edit" | "delete"
): Promise<AuthenticatedUserPayload> => {
  const permCode = action === "view" ? "appointments:view" : "appointments:create";
  const user = await checkPermission(permCode);

  if (user.role.code === "super_admin" || user.role.code === "sales_manager") {
    return user;
  }

  const appointment = await db
    .select({
      id: appointments.id,
      assignedToId: appointments.assignedToId,
      createdById: appointments.createdById,
      leadId: appointments.leadId,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .get();

  if (!appointment) {
    throw new AppError("Appointment not found.", 404, "NOT_FOUND");
  }

  if (appointment.assignedToId === user.id || appointment.createdById === user.id) {
    return user;
  }

  try {
    await checkLeadAccess(appointment.leadId, "view");
    return user;
  } catch (_e) {
    // Ignored
  }

  throw new AppError(
    "Access denied. You do not have visibility permissions for this appointment.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Follow-up.
 */
export const checkFollowUpAccess = async (
  followUpId: string,
  action: "view" | "edit" | "delete"
): Promise<AuthenticatedUserPayload> => {
  const permCode = action === "view" ? "followups:view" : "followups:create";
  const user = await checkPermission(permCode);

  if (user.role.code === "super_admin" || user.role.code === "sales_manager") {
    return user;
  }

  const followUp = await db
    .select({
      id: followUps.id,
      assignedToId: followUps.assignedToId,
      createdById: followUps.createdById,
      leadId: followUps.leadId,
    })
    .from(followUps)
    .where(eq(followUps.id, followUpId))
    .get();

  if (!followUp) {
    throw new AppError("Follow-up not found.", 404, "NOT_FOUND");
  }

  if (followUp.assignedToId === user.id || followUp.createdById === user.id) {
    return user;
  }

  try {
    await checkLeadAccess(followUp.leadId, "view");
    return user;
  } catch (_e) {
    // Ignored
  }

  throw new AppError(
    "Access denied. You do not have visibility permissions for this follow-up.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Field Visit.
 */
export const checkFieldVisitAccess = async (
  fieldVisitId: string,
  action: "view" | "edit" | "delete"
): Promise<AuthenticatedUserPayload> => {
  const permCode = action === "view" ? "appointments:view" : "appointments:create";
  const user = await checkPermission(permCode);

  if (user.role.code === "super_admin" || user.role.code === "sales_manager") {
    return user;
  }

  const visit = await db
    .select({
      id: fieldVisits.id,
      assignedToId: fieldVisits.assignedToId,
      createdById: fieldVisits.createdById,
      leadId: fieldVisits.leadId,
    })
    .from(fieldVisits)
    .where(eq(fieldVisits.id, fieldVisitId))
    .get();

  if (!visit) {
    throw new AppError("Field visit not found.", 404, "NOT_FOUND");
  }

  if (visit.assignedToId === user.id || visit.createdById === user.id) {
    return user;
  }

  try {
    await checkLeadAccess(visit.leadId, "view");
    return user;
  } catch (_e) {
    // Ignored
  }

  throw new AppError(
    "Access denied. You do not have visibility permissions for this field visit.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Task.
 */
export const checkTaskAccess = async (
  taskId: string,
  action: "view" | "edit" | "delete"
): Promise<AuthenticatedUserPayload> => {
  const permCode = action === "view" ? "tasks:view" : "tasks:create";
  const user = await checkPermission(permCode);

  if (user.role.code === "super_admin" || user.role.code === "sales_manager") {
    return user;
  }

  const task = await db
    .select({
      id: tasks.id,
      assignedToId: tasks.assignedToId,
      createdById: tasks.createdById,
      leadId: tasks.leadId,
      customerId: tasks.customerId,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task) {
    throw new AppError("Task not found.", 404, "NOT_FOUND");
  }

  if (task.assignedToId === user.id || task.createdById === user.id) {
    return user;
  }

  if (task.leadId) {
    try {
      await checkLeadAccess(task.leadId, "view");
      return user;
    } catch (_e) {
      // Ignored
    }
  }

  if (task.customerId) {
    try {
      await checkCustomerAccess(task.customerId, "view");
      return user;
    } catch (_e) {
      // Ignored
    }
  }

  throw new AppError(
    "Access denied. You do not have visibility permissions for this task.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Quotation.
 */
export const checkQuotationAccess = async (
  quotationId: string,
  _action: "view" | "edit" | "delete"
): Promise<AuthenticatedUserPayload> => {
  const permCode = _action === "view" ? "quotations:view" : "quotations:create";
  const user = await checkPermission(permCode);

  if (user.role.code === "super_admin" || user.role.code === "sales_manager") {
    return user;
  }

  const quotation = await db
    .select({
      id: quotations.id,
      createdById: quotations.createdById,
      leadId: quotations.leadId,
      customerId: quotations.customerId,
    })
    .from(quotations)
    .where(eq(quotations.id, quotationId))
    .get();

  if (!quotation) {
    throw new AppError("Quotation not found.", 404, "NOT_FOUND");
  }

  if (quotation.createdById === user.id) {
    return user;
  }

  if (quotation.leadId) {
    try {
      await checkLeadAccess(quotation.leadId, "view");
      return user;
    } catch (_e) {
      // Ignored
    }
  }

  if (quotation.customerId) {
    try {
      await checkCustomerAccess(quotation.customerId, "view");
      return user;
    } catch (_e) {
      // Ignored
    }
  }

  throw new AppError(
    "Access denied. You do not have visibility permissions for this quotation.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on an Invoice.
 */
export const checkInvoiceAccess = async (
  invoiceId: string,
  _action: "view" | "edit" | "delete"
): Promise<AuthenticatedUserPayload> => {
  const user = await checkPermission("invoices:view");

  if (user.role.code === "super_admin" || user.role.code === "sales_manager") {
    return user;
  }

  const invoice = await db
    .select({
      id: invoices.id,
      createdById: invoices.createdById,
      customerId: invoices.customerId,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .get();

  if (!invoice) {
    throw new AppError("Invoice not found.", 404, "NOT_FOUND");
  }

  if (invoice.createdById === user.id) {
    return user;
  }

  if (invoice.customerId) {
    try {
      await checkCustomerAccess(invoice.customerId, "view");
      return user;
    } catch (_e) {
      // Ignored
    }
  }

  throw new AppError(
    "Access denied. You do not have visibility permissions for this invoice.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Payment.
 */
export const checkPaymentAccess = async (
  paymentId: string,
  _action: "view" | "edit" | "delete"
): Promise<AuthenticatedUserPayload> => {
  const user = await checkPermission("payments:view");

  if (user.role.code === "super_admin" || user.role.code === "sales_manager") {
    return user;
  }

  const payment = await db
    .select({
      id: payments.id,
      receivedById: payments.receivedById,
      invoiceId: payments.invoiceId,
    })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .get();

  if (!payment) {
    throw new AppError("Payment not found.", 404, "NOT_FOUND");
  }

  if (payment.receivedById === user.id) {
    return user;
  }

  if (payment.invoiceId) {
    try {
      await checkInvoiceAccess(payment.invoiceId, "view");
      return user;
    } catch (_e) {
      // Ignored
    }
  }

  throw new AppError(
    "Access denied. You do not have visibility permissions for this payment.",
    403,
    "FORBIDDEN"
  );
};
