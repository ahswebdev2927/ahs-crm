export type DashboardScope = "business" | "team" | "personal";

export type DashboardDateRange =
  | "today"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "3m"
  | "6m"
  | "12m";

export interface DashboardKpiMetric {
  id: string;
  title: string;
  value: string | number;
  rawNumericValue: number;
  changePercent?: number;
  changeLabel?: string;
  description?: string;
  status?: "neutral" | "positive" | "negative" | "warning";
}

export interface DashboardRevenueTrendPoint {
  date: string; // e.g. "2026-08-01" or "Aug 01"
  revenue: number;
  collected: number;
  pending: number;
}

export interface DashboardLeadConversionStage {
  stage: string;
  count: number;
  percentage: number;
}

export interface DashboardPipelineDistributionStage {
  stageId: string;
  stageName: string;
  count: number;
  totalValue: number;
}

export interface DashboardTeamMemberPerformance {
  userId: string;
  name: string;
  avatarUrl?: string;
  leadsCount: number;
  wonCount: number;
  revenue: number;
  conversionRate: number;
}

export interface DashboardLeadSourcePoint {
  source: string;
  count: number;
  percentage: number;
}

export interface DashboardCustomerGrowthPoint {
  date: string;
  newCustomers: number;
  totalCustomers: number;
}

export interface DashboardPaymentCollectionSummary {
  totalBilled: number;
  totalCollected: number;
  outstanding: number;
  overdue: number;
}

export interface DashboardFollowupSummary {
  today: number;
  overdue: number;
  upcoming: number;
  completed: number;
}

export interface DashboardAppointmentSummary {
  upcoming: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface DashboardOperationalItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  priority?: "high" | "medium" | "low";
  type: "lead" | "followup" | "appointment" | "task" | "collection" | "visit";
  status?: string;
  href?: string;
}

export interface DashboardDataResponse {
  scope: DashboardScope;
  dateRange: DashboardDateRange;
  kpis: DashboardKpiMetric[];
  revenueTrend: DashboardRevenueTrendPoint[];
  leadConversion: DashboardLeadConversionStage[];
  pipelineDistribution: DashboardPipelineDistributionStage[];
  leadSources: DashboardLeadSourcePoint[];
  teamPerformance?: DashboardTeamMemberPerformance[];
  customerGrowth: DashboardCustomerGrowthPoint[];
  paymentCollections: DashboardPaymentCollectionSummary;
  followups: DashboardFollowupSummary;
  appointments: DashboardAppointmentSummary;
  priorityItems: DashboardOperationalItem[];
}
