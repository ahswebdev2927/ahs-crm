/**
 * AHS CRM - Reports & Analytics Feature Module
 * 100% Functional Architecture with zero classes.
 */

// Types
export * from "./types/reports.types";

// Schemas
export * from "./schemas/reports-filter.schema";

// Utils
export * from "./utils/reports-date.utils";

// Authorization
export * from "./services/reports-authorization.service";

// Repositories
export * from "./repositories/sales-reports.repository";
export * from "./repositories/salesperson-reports.repository";
export * from "./repositories/manager-reports.repository";
export * from "./repositories/customer-reports.repository";
export * from "./repositories/payment-reports.repository";
export * from "./repositories/reports-filter-options.repository";

// Services
export * from "./services/reports.service";
export * from "./services/reports-export.service";

// UI Components
export * from "./components/reports-shell";
export * from "./components/tabs/sales-report-tab";
export * from "./components/tabs/salesperson-report-tab";
export * from "./components/tabs/manager-report-tab";
export * from "./components/tabs/customer-report-tab";
export * from "./components/tabs/payment-report-tab";
