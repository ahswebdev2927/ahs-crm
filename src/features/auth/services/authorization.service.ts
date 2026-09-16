import { cookies } from "next/headers";
import { or, eq, exists, and, isNotNull } from "drizzle-orm";
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
 * Generates a Drizzle ORM filter condition for Lead visibility based strictly on user role:
 * - Admin (super_admin): Sees ALL leads across the company.
 * - Manager (sales_manager): Sees leads in Manager's team (teamId) + own/created/partnered.
 * - Other members (inside_sales, field_sales, etc.): Sees ONLY their OWN leads (owner/creator) & co-partnered leads.
 */
export const getLeadVisibilityFilter = (
  userId: string,
  roleCode: string,
  dataVisibility?: string,
  teamId?: number | null
) => {
  // 1. If dataVisibility is 'own', 'shared', or 'partnered', restrict strictly to own & partnered leads
  if (dataVisibility === "own" || dataVisibility === "shared" || dataVisibility === "partnered") {
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
  }

  // 2. Super Admin with 'all' visibility sees all leads
  if (roleCode === "super_admin" && (dataVisibility === "all" || !dataVisibility)) {
    return undefined;
  }

  // 3. Sales Manager with 'team' visibility sees team leads + own/created/partnered
  if (roleCode === "sales_manager" && (dataVisibility === "team" || !dataVisibility) && teamId) {
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
      ),
      exists(
        db
          .select()
          .from(users)
          .where(
            and(
              isNotNull(leads.ownerId),
              eq(users.id, leads.ownerId!),
              eq(users.teamId, teamId)
            )
          )
      )
    );
  }

  // 4. Default fallback: ONLY own & partnered/shared leads
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
 * BUSINESS RULE ENFORCED:
 * - VIEW: Admin sees all; Manager sees team + own/partnered; Members see own + partnered.
 * - EDIT / MUTATION (edit, delete, assign): Admin, Manager, and Members can ONLY edit leads
 *   where they are the Owner, Creator, or an active Partner!
 */
export const checkLeadAccess = async (
  leadId: string,
  action: "view" | "create" | "edit" | "delete" | "assign" | "export"
): Promise<AuthenticatedUserPayload> => {
  const user = await checkPermission(
    `leads:${action === "delete" || action === "assign" ? "edit" : action === "export" ? "view" : action}`
  );

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

  const partnerRecord = await db
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

  const isDirectlyRelated = isOwner || isCreator || Boolean(partnerRecord);

  // VIEW Action Checks
  if (action === "view" || action === "export") {
    if (user.role.code === "super_admin") {
      return user; // SuperAdmin views all
    }

    if (user.role.code === "sales_manager" && user.teamId) {
      if (isDirectlyRelated) return user;

      const isTeamLead = lead.ownerId
        ? await db
            .select()
            .from(users)
            .where(
              and(
                eq(users.id, lead.ownerId),
                eq(users.teamId, user.teamId)
              )
            )
            .get()
        : null;

      if (isTeamLead) return user;
    }

    if (isDirectlyRelated) {
      return user;
    }

    throw new AppError(
      "Access denied. You do not have visibility permissions for this lead.",
      403,
      "FORBIDDEN"
    );
  }

  // MUTATION Actions (edit, delete, assign)
  // Enforce strict rule: Admin, Manager, and Reps can ONLY edit leads they own or co-partner on!
  if (!isDirectlyRelated) {
    throw new AppError(
      "Access denied. You can only edit, reassign, or archive leads that you own or co-partner on.",
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
      // Ignored
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
    if (followUp.leadId) {
      await checkLeadAccess(followUp.leadId, "view");
      return user;
    }
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
