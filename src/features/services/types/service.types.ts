import type { Service, CustomerService } from "@/db/schema";

export type BillingModel = "monthly" | "one_time";
export type ServiceStatus = "active" | "inactive";
export type CustomerServiceStatus = "active" | "suspended" | "cancelled" | "expired";

export interface CatalogServiceItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
  categoryKey: string;
  serviceType: string;
  plan: string;
  billingModel: BillingModel;
  billingText: string | null;
  price: number; // In paise / minor units
  priceText: string | null;
  features: string[]; // Parsed array of deliverable strings
  rawFeatures?: string[];
  note: string | null;
  isPopular: boolean;
  externalSourceId: string | null;
  lastSyncedAt: Date | null;
  sortOrder: number;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerServiceSubscriptionItem {
  id: string;
  customerId: string;
  customerName?: string;
  customerCompany?: string | null;
  serviceId: number;
  // Historical Snapshots
  serviceNameSnapshot: string;
  categorySnapshot: string;
  serviceTypeSnapshot: string;
  planSnapshot: string;
  catalogPriceSnapshot: number; // In paise / minor units
  billingModel: BillingModel;
  billingText: string | null;
  quantity: number;
  price: number; // Agreed unit price in paise
  totalPrice: number; // price * quantity in paise
  notes: string | null;
  status: CustomerServiceStatus;
  startDate: Date | null;
  endDate: Date | null;
  createdById: string | null;
  createdByName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceKpis {
  totalCatalogPlans: number;
  activeCatalogPlans: number;
  activeSubscriptionsCount: number;
  monthlyRecurringRevenue: number; // In paise
  oneTimeProjectRevenue: number; // In paise
  lastSyncedAt: Date | null;
}

export interface SyncCatalogItemInput {
  externalId: string;
  code: string;
  name: string;
  category: string;
  categoryKey: string;
  serviceType: string;
  plan: string;
  billingModel: BillingModel;
  billingText: string;
  priceMinorUnits: number;
  priceText: string;
  features: string[];
  rawFeatures?: string[];
  note?: string;
  isPopular: boolean;
  sortOrder: number;
}

export interface SyncResult {
  success: boolean;
  syncedAt: string;
  source: string;
  totalReceived: number;
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
}
