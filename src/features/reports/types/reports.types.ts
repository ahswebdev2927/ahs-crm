export type ReportTab = "sales" | "salesperson" | "manager" | "customer" | "payments";

export type ReportDatePreset = 
  | "today" 
  | "7d" 
  | "30d" 
  | "this_month" 
  | "last_month" 
  | "this_quarter" 
  | "this_year" 
  | "custom";

export interface ReportFilterParams {
  tab: ReportTab;
  preset: ReportDatePreset;
  fromDate?: string; // ISO string
  toDate?: string;   // ISO string
  teamId?: number;
  userId?: string;
}

export interface ReportsScopeContext {
  scope: "all" | "team" | "own";
  userId: string;
  roleCode: string;
  teamId?: number | null;
  targetUserId?: string | null;
  targetTeamId?: number | null;
}

export interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
  startMs: number;
  endMs: number;
}

// Sales Report Types
export interface SalesReportData {
  kpis: {
    leadsCreated: number;
    dealsWon: number;
    dealsLost: number;
    conversionRate: number; // percentage (e.g. 18.5)
    totalRevenuePaise: number;
    averageDealValuePaise: number;
  };
  leadsAndRevenueTrend: Array<{
    date: string;
    leadsCreated: number;
    dealsWon: number;
    revenuePaise: number;
  }>;
  pipelineStageDistribution: Array<{
    stageId: number;
    stageName: string;
    stageColor: string;
    order: number;
    leadCount: number;
    totalValuePaise: number;
    conversionRateToNext?: number;
  }>;
  leadsBySource: Array<{
    source: string;
    count: number;
    wonCount: number;
    conversionRate: number;
  }>;
}

// Salesperson Report Types
export interface SalespersonPerformanceItem {
  userId: string;
  name: string;
  email: string;
  roleName: string;
  leadsCount: number;
  wonCount: number;
  lostCount: number;
  conversionRate: number;
  revenuePaise: number;
  followupsCompleted: number;
  appointmentsCompleted: number;
  fieldVisitsCompleted: number;
  collectionsPaise: number;
}

export interface SalespersonReportData {
  leaderboard: SalespersonPerformanceItem[];
  selectedSalespersonDetails?: {
    user: { id: string; name: string; email: string; roleName: string };
    activityBreakdown: {
      followupsTotal: number;
      followupsCompleted: number;
      appointmentsTotal: number;
      appointmentsCompleted: number;
      fieldVisitsTotal: number;
      fieldVisitsCompleted: number;
    };
    recentWonDeals: Array<{
      leadId: string;
      leadTitle: string;
      customerName: string;
      valuePaise: number;
      wonAt: string;
    }>;
  };
}

// Manager / Team Report Types
export interface ManagerReportData {
  teamSummary: {
    teamId: number;
    teamName: string;
    membersCount: number;
    totalLeads: number;
    wonLeads: number;
    conversionRate: number;
    totalRevenuePaise: number;
    totalCollectionsPaise: number;
  };
  teamComparativeTrend: Array<{
    period: string;
    teamName: string;
    leads: number;
    won: number;
    revenuePaise: number;
  }>;
  memberActivityMatrix: Array<{
    userId: string;
    name: string;
    leads: number;
    calls: number;
    meetings: number;
    visits: number;
    tasksDone: number;
    revenuePaise: number;
  }>;
}

// Customer Report Types
export interface CustomerReportData {
  kpis: {
    totalCustomers: number;
    newCustomersInPeriod: number;
    activeContractsCount: number;
    averageCustomerRevenuePaise: number;
  };
  customerGrowthTrend: Array<{
    date: string;
    newCustomers: number;
    cumulativeCustomers: number;
  }>;
  topServicesPurchased: Array<{
    serviceId: number;
    serviceName: string;
    category: string;
    adoptionCount: number;
    totalRevenuePaise: number;
  }>;
}

// Payment Report Types
export interface PaymentAgingBucket {
  range: "Current (0-30d)" | "31-60d" | "61-90d" | "90+d";
  invoiceCount: number;
  amountPaise: number;
}

export interface PaymentReportData {
  kpis: {
    totalBilledPaise: number;
    totalCollectedPaise: number;
    outstandingPaise: number;
    overduePaise: number;
    collectionEfficiencyRate: number; // (collected / billed) * 100
  };
  billedVsCollectedTrend: Array<{
    date: string;
    billedPaise: number;
    collectedPaise: number;
  }>;
  agingBuckets: PaymentAgingBucket[];
  recentPaymentsSummary: Array<{
    id: string;
    paymentNumber: string;
    invoiceNumber: string;
    customerName: string;
    amountPaise: number;
    paymentMethod: string;
    paymentDate: string;
    receivedByName: string;
  }>;
}

export interface ReportsFilterOptions {
  teams: Array<{ id: number; name: string }>;
  users: Array<{ id: string; name: string; roleName: string; teamId: number | null }>;
}

export type ReportsResponseData = 
  | { tab: "sales"; data: SalesReportData; filterOptions: ReportsFilterOptions }
  | { tab: "salesperson"; data: SalespersonReportData; filterOptions: ReportsFilterOptions }
  | { tab: "manager"; data: ManagerReportData; filterOptions: ReportsFilterOptions }
  | { tab: "customer"; data: CustomerReportData; filterOptions: ReportsFilterOptions }
  | { tab: "payments"; data: PaymentReportData; filterOptions: ReportsFilterOptions };
