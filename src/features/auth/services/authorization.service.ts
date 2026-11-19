import { cookies } from "next/headers";
import { or, eq, exists, and, isNotNull, isNull } from "drizzle-orm";
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
  } catch {
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
  permissionCodes: string[],
  providedUser?: AuthenticatedUserPayload
): Promise<AuthenticatedUserPayload> => {
  const user = providedUser || (await requireAuth());

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
 * Asserts that the provided authenticated user object has the required permission.
 * Throws AppError 403 if they do not.
 */
export const assertUserPermission = (
  user: AuthenticatedUserPayload,
  permissionCode: string
): void => {
  if (user.role.code === "super_admin") {
    return;
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
 * Builds the data visibility SQL WHERE filter for Customers based on user role and data visibility level.
 * - Admin (super_admin): Sees ALL customers across the company.
 * - Manager (sales_manager): Sees customers owned by their team members (teamId) + own customers + customers converted from own/team leads.
 * - Sales Reps: Sees customers they own (ownerId) OR customers converted from leads they owned/created/partnered on.
 */
export const getCustomerVisibilityFilter = (
  userId: string,
  roleCode: string,
  dataVisibility?: string,
  teamId?: number | null
) => {
  // 1. Super Admin with 'all' visibility sees all customers
  if (roleCode === "super_admin" && (dataVisibility === "all" || !dataVisibility)) {
    return undefined;
  }

  // 2. Sales Manager with 'team' visibility sees team customers + own customers + customers from team leads
  if (roleCode === "sales_manager" && (dataVisibility === "team" || !dataVisibility) && teamId) {
    return or(
      eq(customers.ownerId, userId),
      exists(
        db
          .select()
          .from(users)
          .where(
            and(
              isNotNull(customers.ownerId),
              eq(users.id, customers.ownerId!),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select()
          .from(leads)
          .where(
            and(
              isNotNull(customers.leadId),
              eq(leads.id, customers.leadId!),
              or(
                eq(leads.ownerId, userId),
                eq(leads.createdById, userId),
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
              )
            )
          )
      )
    );
  }

  // 3. Sales Reps / fallback: own customers OR customers converted from own/partnered leads
  return or(
    eq(customers.ownerId, userId),
    exists(
      db
        .select()
        .from(leads)
        .where(
          and(
            isNotNull(customers.leadId),
            eq(leads.id, customers.leadId!),
            or(
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
            )
          )
        )
    )
  );
};

/**
 * Builds the data visibility SQL WHERE filter for Tasks based on user role and data visibility level.
 * - Admin (super_admin): Sees ALL tasks across the company (when dataVisibility == 'all' or undefined).
 * - Manager (sales_manager): Sees tasks assigned to team members, created by team members, or linked to leads/customers owned by team members.
 * - Sales Reps: Sees tasks assigned to them, created by them, or attached to leads they own/partner on, or customers they own.
 * - When dataVisibility is 'own': Strictly restricted to tasks assigned to or created by the user.
 */
export const getTaskVisibilityFilter = (
  userId: string,
  roleCode: string,
  dataVisibility?: string,
  teamId?: number | null
) => {
  // 1. If dataVisibility is 'own', restrict strictly to tasks assigned to or created by the user
  if (dataVisibility === "own") {
    return or(
      eq(tasks.assignedToId, userId),
      eq(tasks.createdById, userId)
    );
  }

  // 2. Super Admin with 'all' visibility sees all tasks
  if (roleCode === "super_admin" && (dataVisibility === "all" || !dataVisibility)) {
    return undefined;
  }

  // 3. Sales Manager with 'team' visibility sees team tasks + own/created
  if (roleCode === "sales_manager" && (dataVisibility === "team" || !dataVisibility) && teamId) {
    return or(
      eq(tasks.assignedToId, userId),
      eq(tasks.createdById, userId),
      // Assigned to a team member
      exists(
        db
          .select()
          .from(users)
          .where(
            and(
              isNotNull(tasks.assignedToId),
              eq(users.id, tasks.assignedToId!),
              eq(users.teamId, teamId)
            )
          )
      ),
      // Created by a team member
      exists(
        db
          .select()
          .from(users)
          .where(
            and(
              eq(users.id, tasks.createdById),
              eq(users.teamId, teamId)
            )
          )
      ),
      // Linked to a lead owned by a team member
      exists(
        db
          .select()
          .from(leads)
          .innerJoin(users, eq(users.id, leads.ownerId))
          .where(
            and(
              isNotNull(tasks.leadId),
              eq(leads.id, tasks.leadId!),
              eq(users.teamId, teamId)
            )
          )
      ),
      // Linked to a customer owned by a team member
      exists(
        db
          .select()
          .from(customers)
          .innerJoin(users, eq(users.id, customers.ownerId))
          .where(
            and(
              isNotNull(tasks.customerId),
              eq(customers.id, tasks.customerId!),
              eq(users.teamId, teamId)
            )
          )
      )
    );
  }

  // 4. Standard Reps / fallback: own tasks (assigned/created) OR tasks linked to own/partnered leads or own customers
  return or(
    eq(tasks.assignedToId, userId),
    eq(tasks.createdById, userId),
    // Linked to a lead owned, created, or partnered by user
    exists(
      db
        .select()
        .from(leads)
        .where(
          and(
            isNotNull(tasks.leadId),
            eq(leads.id, tasks.leadId!),
            or(
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
            )
          )
        )
    ),
    // Linked to a customer owned by user
    exists(
      db
        .select()
        .from(customers)
        .where(
          and(
            isNotNull(tasks.customerId),
            eq(customers.id, tasks.customerId!),
            eq(customers.ownerId, userId)
          )
        )
    )
  );
};

/**
 * Builds the data visibility SQL WHERE filter for Appointments.
 * - Admin (super_admin): Sees ALL appointments across the company.
 * - Manager (sales_manager): Sees appointments assigned to or created by team members, or linked to team leads/customers.
 * - Sales Reps: Sees appointments assigned to them, created by them, or linked to their own/partnered leads or own customers.
 */
export const getAppointmentVisibilityFilter = (
  userId: string,
  roleCode: string,
  dataVisibility?: string,
  teamId?: number | null
) => {
  // 1. If dataVisibility is 'own', restrict strictly to appointments assigned to or created by the user
  if (dataVisibility === "own") {
    return or(
      eq(appointments.assignedToId, userId),
      eq(appointments.createdById, userId)
    );
  }

  // 2. Super Admin with 'all' visibility sees all appointments
  if (roleCode === "super_admin" && (dataVisibility === "all" || !dataVisibility)) {
    return undefined;
  }

  // 3. Sales Manager with 'team' visibility
  if (roleCode === "sales_manager" && (dataVisibility === "team" || !dataVisibility) && teamId) {
    return or(
      eq(appointments.assignedToId, userId),
      eq(appointments.createdById, userId),
      // Assigned to a team member
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              isNotNull(appointments.assignedToId),
              eq(users.id, appointments.assignedToId),
              eq(users.teamId, teamId)
            )
          )
      ),
      // Created by a team member
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, appointments.createdById),
              eq(users.teamId, teamId)
            )
          )
      ),
      // Linked to a lead owned by a team member
      exists(
        db
          .select({ id: leads.id })
          .from(leads)
          .innerJoin(users, eq(users.id, leads.ownerId))
          .where(
            and(
              isNotNull(appointments.leadId),
              eq(leads.id, appointments.leadId!),
              eq(users.teamId, teamId)
            )
          )
      ),
      // Linked to a customer owned by a team member
      exists(
        db
          .select({ id: customers.id })
          .from(customers)
          .innerJoin(users, eq(users.id, customers.ownerId))
          .where(
            and(
              isNotNull(appointments.customerId),
              eq(customers.id, appointments.customerId!),
              eq(users.teamId, teamId)
            )
          )
      )
    );
  }

  // 4. Sales Reps / fallback: own assigned/created OR on own/partnered leads OR own customers
  return or(
    eq(appointments.assignedToId, userId),
    eq(appointments.createdById, userId),
    exists(
      db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            isNotNull(appointments.leadId),
            eq(leads.id, appointments.leadId!),
            or(
              eq(leads.ownerId, userId),
              eq(leads.createdById, userId),
              exists(
                db
                  .select({ id: leadPartners.id })
                  .from(leadPartners)
                  .where(
                    and(
                      eq(leadPartners.leadId, leads.id),
                      eq(leadPartners.partnerId, userId),
                      eq(leadPartners.status, "active")
                    )
                  )
              )
            )
          )
        )
    ),
    exists(
      db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            isNotNull(appointments.customerId),
            eq(customers.id, appointments.customerId!),
            eq(customers.ownerId, userId)
          )
        )
    )
  );
};

/**
 * Builds the data visibility SQL WHERE filter for Follow-ups.
 */
export const getFollowUpVisibilityFilter = (
  userId: string,
  roleCode: string,
  dataVisibility?: string,
  teamId?: number | null
) => {
  if (dataVisibility === "own") {
    return or(
      eq(followUps.assignedToId, userId),
      eq(followUps.createdById, userId)
    );
  }

  if (roleCode === "super_admin" && (dataVisibility === "all" || !dataVisibility)) {
    return undefined;
  }

  if (roleCode === "sales_manager" && (dataVisibility === "team" || !dataVisibility) && teamId) {
    return or(
      eq(followUps.assignedToId, userId),
      eq(followUps.createdById, userId),
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              isNotNull(followUps.assignedToId),
              eq(users.id, followUps.assignedToId),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, followUps.createdById),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select({ id: leads.id })
          .from(leads)
          .innerJoin(users, eq(users.id, leads.ownerId))
          .where(
            and(
              isNotNull(followUps.leadId),
              eq(leads.id, followUps.leadId!),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select({ id: customers.id })
          .from(customers)
          .innerJoin(users, eq(users.id, customers.ownerId))
          .where(
            and(
              isNotNull(followUps.customerId),
              eq(customers.id, followUps.customerId!),
              eq(users.teamId, teamId)
            )
          )
      )
    );
  }

  return or(
    eq(followUps.assignedToId, userId),
    eq(followUps.createdById, userId),
    exists(
      db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            isNotNull(followUps.leadId),
            eq(leads.id, followUps.leadId!),
            or(
              eq(leads.ownerId, userId),
              eq(leads.createdById, userId),
              exists(
                db
                  .select({ id: leadPartners.id })
                  .from(leadPartners)
                  .where(
                    and(
                      eq(leadPartners.leadId, leads.id),
                      eq(leadPartners.partnerId, userId),
                      eq(leadPartners.status, "active")
                    )
                  )
              )
            )
          )
        )
    ),
    exists(
      db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            isNotNull(followUps.customerId),
            eq(customers.id, followUps.customerId!),
            eq(customers.ownerId, userId)
          )
        )
    )
  );
};

/**
 * Builds the data visibility SQL WHERE filter for Field Visits.
 */
export const getFieldVisitVisibilityFilter = (
  userId: string,
  roleCode: string,
  dataVisibility?: string,
  teamId?: number | null
) => {
  if (dataVisibility === "own") {
    return or(
      eq(fieldVisits.assignedToId, userId),
      eq(fieldVisits.createdById, userId)
    );
  }

  if (roleCode === "super_admin" && (dataVisibility === "all" || !dataVisibility)) {
    return undefined;
  }

  if (roleCode === "sales_manager" && (dataVisibility === "team" || !dataVisibility) && teamId) {
    return or(
      eq(fieldVisits.assignedToId, userId),
      eq(fieldVisits.createdById, userId),
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              isNotNull(fieldVisits.assignedToId),
              eq(users.id, fieldVisits.assignedToId),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, fieldVisits.createdById),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select({ id: leads.id })
          .from(leads)
          .innerJoin(users, eq(users.id, leads.ownerId))
          .where(
            and(
              isNotNull(fieldVisits.leadId),
              eq(leads.id, fieldVisits.leadId!),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select({ id: customers.id })
          .from(customers)
          .innerJoin(users, eq(users.id, customers.ownerId))
          .where(
            and(
              isNotNull(fieldVisits.customerId),
              eq(customers.id, fieldVisits.customerId!),
              eq(users.teamId, teamId)
            )
          )
      )
    );
  }

  return or(
    eq(fieldVisits.assignedToId, userId),
    eq(fieldVisits.createdById, userId),
    exists(
      db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            isNotNull(fieldVisits.leadId),
            eq(leads.id, fieldVisits.leadId!),
            or(
              eq(leads.ownerId, userId),
              eq(leads.createdById, userId),
              exists(
                db
                  .select({ id: leadPartners.id })
                  .from(leadPartners)
                  .where(
                    and(
                      eq(leadPartners.leadId, leads.id),
                      eq(leadPartners.partnerId, userId),
                      eq(leadPartners.status, "active")
                    )
                  )
              )
            )
          )
        )
    ),
    exists(
      db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            isNotNull(fieldVisits.customerId),
            eq(customers.id, fieldVisits.customerId!),
            eq(customers.ownerId, userId)
          )
        )
    )
  );
};

/**
 * Builds the data visibility SQL WHERE filter for Quotations.
 * Strictly scopes Sales Managers to their assigned team members (and self).
 */
export const getQuotationVisibilityFilter = (
  userId: string,
  roleCode: string,
  teamId?: number | null
) => {
  if (roleCode === "super_admin") {
    return undefined;
  }

  if (roleCode === "sales_manager" && teamId) {
    return or(
      eq(quotations.createdById, userId),
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, quotations.createdById),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select({ id: leads.id })
          .from(leads)
          .innerJoin(users, eq(users.id, leads.ownerId))
          .where(
            and(
              isNotNull(quotations.leadId),
              eq(leads.id, quotations.leadId!),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select({ id: customers.id })
          .from(customers)
          .innerJoin(users, eq(users.id, customers.ownerId))
          .where(
            and(
              isNotNull(quotations.customerId),
              eq(customers.id, quotations.customerId!),
              eq(users.teamId, teamId)
            )
          )
      )
    );
  }

  return or(
    eq(quotations.createdById, userId),
    exists(
      db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            isNotNull(quotations.leadId),
            eq(leads.id, quotations.leadId!),
            or(
              eq(leads.ownerId, userId),
              eq(leads.createdById, userId),
              exists(
                db
                  .select({ id: leadPartners.id })
                  .from(leadPartners)
                  .where(
                    and(
                      eq(leadPartners.leadId, leads.id),
                      eq(leadPartners.partnerId, userId),
                      eq(leadPartners.status, "active")
                    )
                  )
              )
            )
          )
        )
    ),
    exists(
      db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            isNotNull(quotations.customerId),
            eq(customers.id, quotations.customerId!),
            eq(customers.ownerId, userId)
          )
        )
    )
  );
};

/**
 * Builds the data visibility SQL WHERE filter for Invoices.
 * Strictly scopes Sales Managers to invoices created by team members or for team customers.
 */
export const getInvoiceVisibilityFilter = (
  userId: string,
  roleCode: string,
  teamId?: number | null
) => {
  if (roleCode === "super_admin") {
    return undefined;
  }

  if (roleCode === "sales_manager" && teamId) {
    return or(
      eq(invoices.createdById, userId),
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, invoices.createdById),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select({ id: customers.id })
          .from(customers)
          .innerJoin(users, eq(users.id, customers.ownerId))
          .where(
            and(
              eq(customers.id, invoices.customerId),
              eq(users.teamId, teamId)
            )
          )
      )
    );
  }

  return or(
    eq(invoices.createdById, userId),
    exists(
      db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, invoices.customerId),
            eq(customers.ownerId, userId)
          )
        )
    )
  );
};

/**
 * Builds the data visibility SQL WHERE filter for Payments.
 * Strictly scopes Sales Managers to payments received by team members or for team customers.
 */
export const getPaymentVisibilityFilter = (
  userId: string,
  roleCode: string,
  teamId?: number | null
) => {
  if (roleCode === "super_admin") {
    return undefined;
  }

  if (roleCode === "sales_manager" && teamId) {
    return or(
      eq(payments.receivedById, userId),
      exists(
        db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, payments.receivedById),
              eq(users.teamId, teamId)
            )
          )
      ),
      exists(
        db
          .select({ id: customers.id })
          .from(customers)
          .innerJoin(users, eq(users.id, customers.ownerId))
          .where(
            and(
              isNotNull(payments.customerId),
              eq(customers.id, payments.customerId!),
              eq(users.teamId, teamId)
            )
          )
      )
    );
  }

  return or(
    eq(payments.receivedById, userId),
    exists(
      db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            isNotNull(payments.customerId),
            eq(customers.id, payments.customerId!),
            eq(customers.ownerId, userId)
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
  action: "view" | "create" | "edit" | "delete" | "assign" | "export",
  providedUser?: AuthenticatedUserPayload
): Promise<AuthenticatedUserPayload> => {
  const permCode = `leads:${action === "delete" || action === "assign" ? "edit" : action === "export" ? "view" : action}`;
  const user = providedUser || (await checkPermission(permCode));
  if (providedUser) {
    assertUserPermission(providedUser, permCode);
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

    logAuthzFailure({
      userId: user.id,
      requiredPermission: permCode,
      reason: `User ${user.id} does not have visibility permissions for lead ${leadId}`,
    });
    throw new AppError(
      "Access denied. You do not have visibility permissions for this lead.",
      403,
      "FORBIDDEN"
    );
  }

  // MUTATION Actions (edit, delete, assign)
  // Enforce strict rule: Admin, Manager, and Reps can ONLY edit leads they own or co-partner on!
  if (!isDirectlyRelated) {
    logAuthzFailure({
      userId: user.id,
      requiredPermission: permCode,
      reason: `User ${user.id} attempted unauthorized mutation on lead ${leadId}`,
    });
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
 * Strictly scopes Sales Managers to their assigned team members.
 */
export const checkCustomerAccess = async (
  customerId: string,
  action: "view" | "edit" | "delete",
  providedUser?: AuthenticatedUserPayload
): Promise<AuthenticatedUserPayload> => {
  const permCode = action === "view" ? "customers:view" : "customers:edit";
  const user = providedUser || (await checkPermission(permCode));
  if (providedUser) {
    assertUserPermission(providedUser, permCode);
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

  // SuperAdmin has company-wide access
  if (user.role.code === "super_admin") {
    return user;
  }

  // Direct owner access
  if (customer.ownerId === user.id) {
    return user;
  }

  // Sales Manager with team scope: check if customer owner belongs to manager's team
  if (user.role.code === "sales_manager" && user.teamId) {
    if (customer.ownerId) {
      const isTeamCustomer = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, customer.ownerId),
            eq(users.teamId, user.teamId)
          )
        )
        .get();

      if (isTeamCustomer) return user;
    }

    // Or check if customer's originating lead belonged to the manager's team
    if (customer.leadId) {
      try {
        await checkLeadAccess(customer.leadId, "view", user);
        return user;
      } catch {
        // Continue
      }
    }
  }

  // Sales Rep / fallback: check if converted from an owned/partnered lead
  if (customer.leadId) {
    try {
      await checkLeadAccess(customer.leadId, action === "view" ? "view" : "edit", user);
      return user;
    } catch {
      // Ignored
    }
  }

  logAuthzFailure({
    userId: user.id,
    requiredPermission: permCode,
    reason: `User ${user.id} does not have permissions for customer ${customerId}`,
  });
  throw new AppError(
    "Access denied. You do not have permissions for this customer.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on an Appointment.
 * Strictly scopes Sales Managers to their assigned team members.
 */
export const checkAppointmentAccess = async (
  appointmentId: string,
  action: "view" | "edit" | "delete",
  providedUser?: AuthenticatedUserPayload
): Promise<AuthenticatedUserPayload> => {
  const permCode = action === "view" ? "appointments:view" : "appointments:create";
  const user = providedUser || (await checkPermission(permCode));
  if (providedUser) {
    assertUserPermission(providedUser, permCode);
  }

  const appointment = await db
    .select({
      id: appointments.id,
      assignedToId: appointments.assignedToId,
      createdById: appointments.createdById,
      leadId: appointments.leadId,
      customerId: appointments.customerId,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .get();

  if (!appointment) {
    throw new AppError("Appointment not found.", 404, "NOT_FOUND");
  }

  // SuperAdmin has company-wide access
  if (user.role.code === "super_admin") {
    return user;
  }

  // Direct assignee or creator access
  if (appointment.assignedToId === user.id || appointment.createdById === user.id) {
    return user;
  }

  // Sales Manager with team scope: check if assigned to or created by a team member
  if (user.role.code === "sales_manager" && user.teamId) {
    const isTeamAppointment = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          or(
            eq(users.id, appointment.assignedToId),
            eq(users.id, appointment.createdById)
          ),
          eq(users.teamId, user.teamId)
        )
      )
      .get();

    if (isTeamAppointment) return user;
  }

  // Check associated Lead access
  if (appointment.leadId) {
    try {
      await checkLeadAccess(appointment.leadId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  // Check associated Customer access
  if (appointment.customerId) {
    try {
      await checkCustomerAccess(appointment.customerId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  logAuthzFailure({
    userId: user.id,
    requiredPermission: permCode,
    reason: `User ${user.id} does not have visibility permissions for appointment ${appointmentId}`,
  });
  throw new AppError(
    "Access denied. You do not have visibility permissions for this appointment.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Follow-up.
 * Strictly scopes Sales Managers to their assigned team members.
 */
export const checkFollowUpAccess = async (
  followUpId: string,
  action: "view" | "edit" | "delete",
  providedUser?: AuthenticatedUserPayload
): Promise<AuthenticatedUserPayload> => {
  const permCode = action === "view" ? "followups:view" : "followups:create";
  const user = providedUser || (await checkPermission(permCode));
  if (providedUser) {
    assertUserPermission(providedUser, permCode);
  }

  const followUp = await db
    .select({
      id: followUps.id,
      assignedToId: followUps.assignedToId,
      createdById: followUps.createdById,
      leadId: followUps.leadId,
      customerId: followUps.customerId,
    })
    .from(followUps)
    .where(eq(followUps.id, followUpId))
    .get();

  if (!followUp) {
    throw new AppError("Follow-up not found.", 404, "NOT_FOUND");
  }

  if (user.role.code === "super_admin") {
    return user;
  }

  if (followUp.assignedToId === user.id || followUp.createdById === user.id) {
    return user;
  }

  if (user.role.code === "sales_manager" && user.teamId) {
    const isTeamFollowUp = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          or(
            eq(users.id, followUp.assignedToId),
            eq(users.id, followUp.createdById)
          ),
          eq(users.teamId, user.teamId)
        )
      )
      .get();

    if (isTeamFollowUp) return user;
  }

  if (followUp.leadId) {
    try {
      await checkLeadAccess(followUp.leadId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  if (followUp.customerId) {
    try {
      await checkCustomerAccess(followUp.customerId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  logAuthzFailure({
    userId: user.id,
    requiredPermission: permCode,
    reason: `User ${user.id} does not have visibility permissions for follow-up ${followUpId}`,
  });
  throw new AppError(
    "Access denied. You do not have visibility permissions for this follow-up.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Field Visit.
 * Strictly scopes Sales Managers to their assigned team members.
 */
export const checkFieldVisitAccess = async (
  fieldVisitId: string,
  action: "view" | "edit" | "delete",
  providedUser?: AuthenticatedUserPayload
): Promise<AuthenticatedUserPayload> => {
  const permCode = action === "view" ? "appointments:view" : "appointments:create";
  const user = providedUser || (await checkPermission(permCode));
  if (providedUser) {
    assertUserPermission(providedUser, permCode);
  }

  const visit = await db
    .select({
      id: fieldVisits.id,
      assignedToId: fieldVisits.assignedToId,
      createdById: fieldVisits.createdById,
      leadId: fieldVisits.leadId,
      customerId: fieldVisits.customerId,
      appointmentId: fieldVisits.appointmentId,
    })
    .from(fieldVisits)
    .where(eq(fieldVisits.id, fieldVisitId))
    .get();

  if (!visit) {
    throw new AppError("Field visit not found.", 404, "NOT_FOUND");
  }

  if (user.role.code === "super_admin") {
    return user;
  }

  if (visit.assignedToId === user.id || visit.createdById === user.id) {
    return user;
  }

  if (user.role.code === "sales_manager" && user.teamId) {
    const isTeamVisit = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          or(
            eq(users.id, visit.assignedToId),
            eq(users.id, visit.createdById)
          ),
          eq(users.teamId, user.teamId)
        )
      )
      .get();

    if (isTeamVisit) return user;
  }

  if (visit.appointmentId) {
    try {
      await checkAppointmentAccess(visit.appointmentId, action, user);
      return user;
    } catch {
      // Continue to check lead/customer
    }
  }

  if (visit.leadId) {
    try {
      await checkLeadAccess(visit.leadId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  if (visit.customerId) {
    try {
      await checkCustomerAccess(visit.customerId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  logAuthzFailure({
    userId: user.id,
    requiredPermission: permCode,
    reason: `User ${user.id} does not have visibility permissions for field visit ${fieldVisitId}`,
  });
  throw new AppError(
    "Access denied. You do not have visibility permissions for this field visit.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Task.
 * Strictly scopes Sales Managers to their assigned team members.
 */
export const checkTaskAccess = async (
  taskId: string,
  action: "view" | "edit" | "delete",
  providedUser?: AuthenticatedUserPayload
): Promise<AuthenticatedUserPayload> => {
  const permCode = action === "view" ? "tasks:view" : "tasks:create";
  const user = providedUser || (await checkPermission(permCode));
  if (providedUser) {
    assertUserPermission(providedUser, permCode);
  }

  const task = await db
    .select({
      id: tasks.id,
      assignedToId: tasks.assignedToId,
      createdById: tasks.createdById,
      leadId: tasks.leadId,
      customerId: tasks.customerId,
      deletedAt: tasks.deletedAt,
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .get();

  if (!task) {
    throw new AppError("Task not found.", 404, "NOT_FOUND");
  }

  if (user.role.code === "super_admin") {
    return user;
  }

  if (task.assignedToId === user.id || task.createdById === user.id) {
    return user;
  }

  if (user.role.code === "sales_manager" && user.teamId) {
    const isTeamTask = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          task.assignedToId
            ? or(
                eq(users.id, task.assignedToId),
                eq(users.id, task.createdById)
              )
            : eq(users.id, task.createdById),
          eq(users.teamId, user.teamId)
        )
      )
      .get();

    if (isTeamTask) return user;
  }

  if (task.leadId) {
    try {
      await checkLeadAccess(task.leadId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  if (task.customerId) {
    try {
      await checkCustomerAccess(task.customerId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  logAuthzFailure({
    userId: user.id,
    requiredPermission: permCode,
    reason: `User ${user.id} does not have visibility permissions for task ${taskId}`,
  });
  throw new AppError(
    "Access denied. You do not have visibility permissions for this task.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Quotation.
 * Strictly scopes Sales Managers to their assigned team members.
 */
export const checkQuotationAccess = async (
  quotationId: string,
  _action: "view" | "edit" | "delete",
  providedUser?: AuthenticatedUserPayload
): Promise<AuthenticatedUserPayload> => {
  const permCode = _action === "view" ? "quotations:view" : "quotations:create";
  const user = providedUser || (await checkPermission(permCode));
  if (providedUser) {
    assertUserPermission(providedUser, permCode);
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

  if (user.role.code === "super_admin") {
    return user;
  }

  if (quotation.createdById === user.id) {
    return user;
  }

  if (user.role.code === "sales_manager" && user.teamId) {
    const isTeamQuote = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, quotation.createdById),
          eq(users.teamId, user.teamId)
        )
      )
      .get();

    if (isTeamQuote) return user;
  }

  if (quotation.leadId) {
    try {
      await checkLeadAccess(quotation.leadId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  if (quotation.customerId) {
    try {
      await checkCustomerAccess(quotation.customerId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  logAuthzFailure({
    userId: user.id,
    requiredPermission: permCode,
    reason: `User ${user.id} does not have visibility permissions for quotation ${quotationId}`,
  });
  throw new AppError(
    "Access denied. You do not have visibility permissions for this quotation.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on an Invoice.
 * Strictly scopes Sales Managers to their assigned team members.
 */
export const checkInvoiceAccess = async (
  invoiceId: string,
  _action: "view" | "edit" | "delete",
  providedUser?: AuthenticatedUserPayload
): Promise<AuthenticatedUserPayload> => {
  const permCode = _action === "view" ? "invoices:view" : "invoices:create";
  const user = providedUser || (await checkPermission(permCode));
  if (providedUser) {
    assertUserPermission(providedUser, permCode);
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

  if (user.role.code === "super_admin") {
    return user;
  }

  if (invoice.createdById === user.id) {
    return user;
  }

  if (user.role.code === "sales_manager" && user.teamId) {
    const isTeamInvoice = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, invoice.createdById),
          eq(users.teamId, user.teamId)
        )
      )
      .get();

    if (isTeamInvoice) return user;
  }

  if (invoice.customerId) {
    try {
      await checkCustomerAccess(invoice.customerId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  logAuthzFailure({
    userId: user.id,
    requiredPermission: permCode,
    reason: `User ${user.id} does not have visibility permissions for invoice ${invoiceId}`,
  });
  throw new AppError(
    "Access denied. You do not have visibility permissions for this invoice.",
    403,
    "FORBIDDEN"
  );
};

/**
 * Checks if the user has permission and visibility to perform the requested action on a Payment.
 * Strictly scopes Sales Managers to their assigned team members.
 */
export const checkPaymentAccess = async (
  paymentId: string,
  _action: "view" | "edit" | "delete",
  providedUser?: AuthenticatedUserPayload
): Promise<AuthenticatedUserPayload> => {
  const permCode = _action === "view" ? "payments:view" : "payments:create";
  const user = providedUser || (await checkPermission(permCode));
  if (providedUser) {
    assertUserPermission(providedUser, permCode);
  }

  const payment = await db
    .select({
      id: payments.id,
      receivedById: payments.receivedById,
      invoiceId: payments.invoiceId,
      customerId: payments.customerId,
    })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .get();

  if (!payment) {
    throw new AppError("Payment not found.", 404, "NOT_FOUND");
  }

  if (user.role.code === "super_admin") {
    return user;
  }

  if (payment.receivedById === user.id) {
    return user;
  }

  if (user.role.code === "sales_manager" && user.teamId) {
    const isTeamPayment = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, payment.receivedById),
          eq(users.teamId, user.teamId)
        )
      )
      .get();

    if (isTeamPayment) return user;
  }

  if (payment.invoiceId) {
    try {
      await checkInvoiceAccess(payment.invoiceId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  if (payment.customerId) {
    try {
      await checkCustomerAccess(payment.customerId, "view", user);
      return user;
    } catch {
      // Continue
    }
  }

  logAuthzFailure({
    userId: user.id,
    requiredPermission: permCode,
    reason: `User ${user.id} does not have visibility permissions for payment ${paymentId}`,
  });
  throw new AppError(
    "Access denied. You do not have visibility permissions for this payment.",
    403,
    "FORBIDDEN"
  );
};
