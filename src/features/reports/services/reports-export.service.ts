import { format } from "date-fns";
import type { ReportsResponseData } from "../types/reports.types";

/**
 * Escapes a cell value for RFC 4180 CSV compliance.
 */
const escapeCsvCell = (val: string | number | boolean | null | undefined): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
};

/**
 * Builds a CSV row from array of cell values.
 */
const toCsvRow = (cells: Array<string | number | boolean | null | undefined>): string => {
  return cells.map(escapeCsvCell).join(",");
};

/**
 * Functional CSV generator for Report datasets.
 * Formats report rows, dates, and currency into standardized CSV strings.
 */
export const generateReportCsv = (
  report: ReportsResponseData
): { filename: string; csv: string } => {
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");
  const filename = `ahs-${report.tab}-report-${timestamp}.csv`;
  const lines: string[] = [];

  switch (report.tab) {
    case "sales": {
      const data = report.data;
      lines.push(toCsvRow(["AHS CRM - Sales Performance Report"]));
      lines.push(toCsvRow(["Exported At", new Date().toISOString()]));
      lines.push("");

      // KPIs
      lines.push(toCsvRow(["Metric", "Value"]));
      lines.push(toCsvRow(["Total Leads Created", data.kpis.leadsCreated]));
      lines.push(toCsvRow(["Deals Won", data.kpis.dealsWon]));
      lines.push(toCsvRow(["Deals Lost", data.kpis.dealsLost]));
      lines.push(toCsvRow(["Conversion Rate", `${data.kpis.conversionRate}%`]));
      lines.push(toCsvRow(["Total Revenue (INR)", (data.kpis.totalRevenuePaise / 100).toFixed(2)]));
      lines.push(toCsvRow(["Average Deal Value (INR)", (data.kpis.averageDealValuePaise / 100).toFixed(2)]));
      lines.push("");

      // Pipeline Stage Distribution
      lines.push(toCsvRow(["Stage Name", "Order", "Lead Count", "Conversion To Next Stage"]));
      for (const s of data.pipelineStageDistribution) {
        lines.push(toCsvRow([s.stageName, s.order, s.leadCount, s.conversionRateToNext ? `${s.conversionRateToNext}%` : "N/A"]));
      }
      lines.push("");

      // Leads by Source
      lines.push(toCsvRow(["Lead Source", "Lead Count", "Won Count", "Conversion Rate"]));
      for (const src of data.leadsBySource) {
        lines.push(toCsvRow([src.source, src.count, src.wonCount, `${src.conversionRate}%`]));
      }
      break;
    }

    case "salesperson": {
      const data = report.data;
      lines.push(toCsvRow(["AHS CRM - Salesperson Performance Leaderboard"]));
      lines.push(toCsvRow(["Exported At", new Date().toISOString()]));
      lines.push("");

      lines.push(toCsvRow([
        "Sales Representative",
        "Email",
        "Role",
        "Leads Assigned",
        "Won Deals",
        "Lost Deals",
        "Conversion Rate",
        "Revenue Generated (INR)",
        "Collections (INR)",
        "Follow-ups Done",
        "Appointments Done",
        "Field Visits Done",
      ]));

      for (const rep of data.leaderboard) {
        lines.push(toCsvRow([
          rep.name,
          rep.email,
          rep.roleName,
          rep.leadsCount,
          rep.wonCount,
          rep.lostCount,
          `${rep.conversionRate}%`,
          (rep.revenuePaise / 100).toFixed(2),
          (rep.collectionsPaise / 100).toFixed(2),
          rep.followupsCompleted,
          rep.appointmentsCompleted,
          rep.fieldVisitsCompleted,
        ]));
      }
      break;
    }

    case "manager": {
      const data = report.data;
      lines.push(toCsvRow(["AHS CRM - Manager & Team Performance Report"]));
      lines.push(toCsvRow(["Team Name", data.teamSummary.teamName]));
      lines.push(toCsvRow(["Exported At", new Date().toISOString()]));
      lines.push("");

      lines.push(toCsvRow(["Team Summary Metric", "Value"]));
      lines.push(toCsvRow(["Active Team Members", data.teamSummary.membersCount]));
      lines.push(toCsvRow(["Total Team Leads", data.teamSummary.totalLeads]));
      lines.push(toCsvRow(["Team Won Leads", data.teamSummary.wonLeads]));
      lines.push(toCsvRow(["Team Conversion Rate", `${data.teamSummary.conversionRate}%`]));
      lines.push(toCsvRow(["Team Revenue (INR)", (data.teamSummary.totalRevenuePaise / 100).toFixed(2)]));
      lines.push(toCsvRow(["Team Collections (INR)", (data.teamSummary.totalCollectionsPaise / 100).toFixed(2)]));
      lines.push("");

      lines.push(toCsvRow([
        "Team Member",
        "Leads Assigned",
        "Calls & Follow-ups",
        "Meetings & Appts",
        "Site Field Visits",
        "Tasks Completed",
        "Revenue Attributed (INR)",
      ]));

      for (const m of data.memberActivityMatrix) {
        lines.push(toCsvRow([
          m.name,
          m.leads,
          m.calls,
          m.meetings,
          m.visits,
          m.tasksDone,
          (m.revenuePaise / 100).toFixed(2),
        ]));
      }
      break;
    }

    case "customer": {
      const data = report.data;
      lines.push(toCsvRow(["AHS CRM - Customer Growth & Services Report"]));
      lines.push(toCsvRow(["Exported At", new Date().toISOString()]));
      lines.push("");

      lines.push(toCsvRow(["Metric", "Value"]));
      lines.push(toCsvRow(["Total Customer Accounts", data.kpis.totalCustomers]));
      lines.push(toCsvRow(["New Customers in Period", data.kpis.newCustomersInPeriod]));
      lines.push(toCsvRow(["Active Service Contracts", data.kpis.activeContractsCount]));
      lines.push(toCsvRow(["Average Revenue per Customer (INR)", (data.kpis.averageCustomerRevenuePaise / 100).toFixed(2)]));
      lines.push("");

      lines.push(toCsvRow([
        "Service Name",
        "Category",
        "Adoption Count",
        "Total Revenue (INR)",
      ]));

      for (const s of data.topServicesPurchased) {
        lines.push(toCsvRow([
          s.serviceName,
          s.category,
          s.adoptionCount,
          (s.totalRevenuePaise / 100).toFixed(2),
        ]));
      }
      break;
    }

    case "payments": {
      const data = report.data;
      lines.push(toCsvRow(["AHS CRM - Payments & Collections Report"]));
      lines.push(toCsvRow(["Exported At", new Date().toISOString()]));
      lines.push("");

      lines.push(toCsvRow(["Metric", "Value (INR)"]));
      lines.push(toCsvRow(["Total Invoiced (Billed)", (data.kpis.totalBilledPaise / 100).toFixed(2)]));
      lines.push(toCsvRow(["Total Collected", (data.kpis.totalCollectedPaise / 100).toFixed(2)]));
      lines.push(toCsvRow(["Total Outstanding", (data.kpis.outstandingPaise / 100).toFixed(2)]));
      lines.push(toCsvRow(["Total Overdue", (data.kpis.overduePaise / 100).toFixed(2)]));
      lines.push(toCsvRow(["Collection Efficiency Rate", `${data.kpis.collectionEfficiencyRate}%`]));
      lines.push("");

      lines.push(toCsvRow(["Aging Bucket", "Invoices Count", "Amount (INR)"]));
      for (const b of data.agingBuckets) {
        lines.push(toCsvRow([b.range, b.invoiceCount, (b.amountPaise / 100).toFixed(2)]));
      }
      lines.push("");

      lines.push(toCsvRow([
        "Receipt / Ref",
        "Invoice Number",
        "Customer Name",
        "Amount (INR)",
        "Payment Method",
        "Payment Date",
        "Received By",
      ]));

      for (const p of data.recentPaymentsSummary) {
        lines.push(toCsvRow([
          p.paymentNumber,
          p.invoiceNumber,
          p.customerName,
          (p.amountPaise / 100).toFixed(2),
          p.paymentMethod,
          p.paymentDate,
          p.receivedByName,
        ]));
      }
      break;
    }
  }

  return {
    filename,
    csv: lines.join("\r\n"),
  };
};
