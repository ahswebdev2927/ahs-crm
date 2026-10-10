import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ConvertLeadToCustomerInput,
  CustomerQueryInput,
  CustomerQueryOutput,
} from "../schemas/customer.schema";

export type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ConvertLeadToCustomerInput,
  CustomerQueryInput,
  CustomerQueryOutput,
};

export type CustomerStatus = "active" | "inactive";
export type CustomerOrigin = "direct" | "converted";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface CustomerItem {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: CustomerStatus;
  leadId: string | null;
  ownerId: string | null;
  owner?: UserSummary | null;
  origin: CustomerOrigin;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CustomerStats {
  totalAppointments: number;
  totalFollowUps: number;
  totalFieldVisits: number;
  totalQuotations: number;
  totalCustomerServices: number;
  totalInvoices: number;
  totalPaidCents: number;
  totalOutstandingCents: number;
}

export interface CustomerDetail extends CustomerItem {
  lead?: {
    id: string;
    name: string;
    company: string | null;
    stageName?: string | null;
    status: string;
  } | null;
  stats: CustomerStats;
}

export interface CustomerListResponse {
  items: CustomerItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
