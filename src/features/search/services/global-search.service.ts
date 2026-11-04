import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  getLeadVisibilityFilter,
  getCustomerVisibilityFilter,
  getTaskVisibilityFilter,
} from "@/features/auth/services/authorization.service";
import { findLeads } from "@/features/leads/repositories/lead.repository";
import { findCustomers } from "@/features/customers/repositories/customer.repository";
import { findAppointments } from "@/features/appointments/repositories/appointment.repository";
import { findTasks } from "@/features/tasks/repositories/task.repository";
import { findQuotations } from "@/features/quotations/repositories/quotation.repository";
import { findInvoices } from "@/features/invoices/repositories/invoice.repository";
import { findPayments } from "@/features/payments/repositories/payment.repository";
import { globalSearchQuerySchema } from "../schemas/global-search.schema";
import type {
  GlobalSearchResponse,
  GlobalSearchResultItem,
  CategorizedSearchResults,
} from "../types/global-search.types";

/**
 * Searches across all 7 core CRM entities concurrently respecting
 * caller authentication, authorization, and data visibility rules.
 */
export async function searchGlobalEntities(
  user: AuthenticatedUserPayload,
  rawParams: unknown
): Promise<GlobalSearchResponse> {
  const { q, limit } = globalSearchQuerySchema.parse(rawParams);

  // Compute visibility filters for each domain
  const leadVisibility = getLeadVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  const customerVisibility = getCustomerVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  const taskVisibility = getTaskVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  const isFinancialUnrestricted =
    user.role.code === "super_admin" || user.role.code === "sales_manager";

  // Execute all entity queries in parallel using Promise.allSettled
  const [
    leadsResult,
    customersResult,
    appointmentsResult,
    tasksResult,
    quotationsResult,
    invoicesResult,
    paymentsResult,
  ] = await Promise.allSettled([
    // 1. Leads
    findLeads(leadVisibility, {
      search: q,
      limit,
      page: 1,
      status: "active",
      sortBy: "createdAt",
      sortOrder: "desc",
    }),

    // 2. Customers
    findCustomers(customerVisibility, {
      search: q,
      limit,
      page: 1,
      status: "all",
      origin: "all",
      sortBy: "createdAt",
      sortOrder: "desc",
    }),

    // 3. Appointments
    findAppointments(leadVisibility, {
      search: q,
      limit,
      page: 1,
      status: "all",
    }),

    // 4. Tasks
    findTasks(taskVisibility, {
      search: q,
      limit,
      page: 1,
      status: "all",
      priority: "all",
      assignedToId: "all",
      sortBy: "createdAt",
      sortOrder: "desc",
    }),

    // 5. Quotations
    findQuotations(
      {
        search: q,
        limit,
        page: 1,
      },
      {
        isUnrestricted: isFinancialUnrestricted,
      }
    ),

    // 6. Invoices
    findInvoices(
      {
        search: q,
        limit,
        page: 1,
      },
      {
        isUnrestricted: isFinancialUnrestricted,
      }
    ),

    // 7. Payments
    findPayments(
      {
        search: q,
        limit,
        page: 1,
      },
      {
        isUnrestricted: isFinancialUnrestricted,
        userId: user.id,
      }
    ),
  ]);

  // Format Leads
  const formattedLeads: GlobalSearchResultItem[] =
    leadsResult.status === "fulfilled"
      ? leadsResult.value.items.slice(0, limit).map((lead) => ({
          id: lead.id,
          category: "leads",
          title: lead.name,
          subtitle: lead.company || lead.email || lead.phone || "Lead",
          badge: lead.stage?.name || lead.status,
          badgeVariant: lead.priority === "critical" || lead.priority === "high" ? "destructive" : "secondary",
          href: `/sales/leads?lead=${lead.id}`,
        }))
      : [];

  // Format Customers
  const formattedCustomers: GlobalSearchResultItem[] =
    customersResult.status === "fulfilled"
      ? customersResult.value.items.slice(0, limit).map((customer) => ({
          id: customer.id,
          category: "customers",
          title: customer.name,
          subtitle: customer.company || customer.email || customer.phone || "Customer",
          badge: customer.status === "active" ? "Active" : "Inactive",
          badgeVariant: customer.status === "active" ? "default" : "secondary",
          href: `/customers/customers?id=${customer.id}`,
        }))
      : [];

  // Format Appointments
  const formattedAppointments: GlobalSearchResultItem[] =
    appointmentsResult.status === "fulfilled"
      ? appointmentsResult.value.items.slice(0, limit).map((app) => ({
          id: app.id,
          category: "appointments",
          title: app.title,
          subtitle:
            app.customer?.name || app.lead?.contactName || app.location || "Scheduled appointment",
          badge: app.status.replace("_", " "),
          badgeVariant: "outline",
          href: `/sales/field-sales?appointmentId=${app.id}`,
        }))
      : [];

  // Format Tasks
  const formattedTasks: GlobalSearchResultItem[] =
    tasksResult.status === "fulfilled"
      ? tasksResult.value.tasks.slice(0, limit).map((task) => ({
          id: task.id,
          category: "tasks",
          title: task.title,
          subtitle: task.assignedTo?.name ? `Assigned to ${task.assignedTo.name}` : "Task",
          badge: task.priority,
          badgeVariant: task.priority === "critical" || task.priority === "high" ? "destructive" : "secondary",
          href: `/tasks?taskId=${task.id}`,
        }))
      : [];

  // Format Quotations
  const formattedQuotations: GlobalSearchResultItem[] =
    quotationsResult.status === "fulfilled"
      ? quotationsResult.value.items.slice(0, limit).map((quote) => ({
          id: quote.id,
          category: "quotations",
          title: quote.quoteNumber,
          subtitle: quote.customer?.name || quote.lead?.name || "Quotation",
          badge: `₹${(quote.total / 100).toLocaleString("en-IN")}`,
          badgeVariant: quote.status === "accepted" ? "default" : "outline",
          href: `/customers/quotations?quote=${quote.id}`,
        }))
      : [];

  // Format Invoices
  const formattedInvoices: GlobalSearchResultItem[] =
    invoicesResult.status === "fulfilled"
      ? invoicesResult.value.items.slice(0, limit).map((inv) => ({
          id: inv.id,
          category: "invoices",
          title: inv.invoiceNumber,
          subtitle: inv.customer?.name || "Invoice",
          badge: inv.status.replace("_", " "),
          badgeVariant: inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "outline",
          href: `/customers/invoices?invoice=${inv.id}`,
        }))
      : [];

  // Format Payments
  const formattedPayments: GlobalSearchResultItem[] =
    paymentsResult.status === "fulfilled"
      ? paymentsResult.value.items.slice(0, limit).map((payment) => ({
          id: payment.id,
          category: "payments",
          title: payment.transactionReference || `Receipt #${payment.id.slice(0, 8)}`,
          subtitle: `${payment.paymentMethod.replace("_", " ").toUpperCase()}${
            payment.invoice?.invoiceNumber ? ` • ${payment.invoice.invoiceNumber}` : ""
          }`,
          badge: `₹${(payment.amount / 100).toLocaleString("en-IN")}`,
          badgeVariant: "default",
          href: `/customers/payments?payment=${payment.id}`,
        }))
      : [];

  const categories: CategorizedSearchResults = {
    leads: formattedLeads,
    customers: formattedCustomers,
    appointments: formattedAppointments,
    tasks: formattedTasks,
    quotations: formattedQuotations,
    invoices: formattedInvoices,
    payments: formattedPayments,
  };

  const totalCount =
    formattedLeads.length +
    formattedCustomers.length +
    formattedAppointments.length +
    formattedTasks.length +
    formattedQuotations.length +
    formattedInvoices.length +
    formattedPayments.length;

  return {
    query: q,
    totalCount,
    categories,
  };
}
