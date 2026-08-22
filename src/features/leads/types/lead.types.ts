import type {
  CreateLeadInput,
  UpdateLeadInput,
  AssignLeadInput,
  UpdateLeadStageInput,
  CreateLeadStageInput,
  ReorderLeadStagesInput,
  LeadQueryInput,
} from "../schemas/lead.schema";

export type {
  CreateLeadInput,
  UpdateLeadInput,
  AssignLeadInput,
  UpdateLeadStageInput,
  CreateLeadStageInput,
  ReorderLeadStagesInput,
  LeadQueryInput,
};

export type LeadPriority = "low" | "medium" | "high" | "critical";
export type LeadStatus = "active" | "archived" | "deleted";

export interface LeadStageItem {
  id: number;
  name: string;
  code: string;
  color: string;
  order: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface LeadItem {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  requirements: string | null;
  notes: string | null;
  priority: LeadPriority;
  ownerId: string | null;
  createdById: string;
  stageId: number;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  stage?: LeadStageItem | null;
  owner?: UserSummary | null;
  createdBy?: UserSummary | null;
}

export interface LeadStageHistoryItem {
  id: string;
  leadId: string;
  fromStageId: number | null;
  toStageId: number;
  changedById: string;
  reason: string | null;
  createdAt: Date;
  fromStage?: LeadStageItem | null;
  toStage?: LeadStageItem | null;
  changedBy?: UserSummary | null;
}

export interface LeadPartnerItem {
  leadId: string;
  partnerId: string;
  role: string;
  createdAt: Date;
  partner?: UserSummary | null;
}

export interface LeadDetail extends LeadItem {
  stageHistory: LeadStageHistoryItem[];
  partners: LeadPartnerItem[];
}

export interface LeadListResponse {
  items: LeadItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LeadMetrics {
  totalLeads: number;
  activeLeads: number;
  stageBreakdown: Array<{
    stageId: number;
    stageName: string;
    stageCode: string;
    stageColor: string;
    count: number;
  }>;
  priorityBreakdown: Array<{
    priority: LeadPriority;
    count: number;
  }>;
}
