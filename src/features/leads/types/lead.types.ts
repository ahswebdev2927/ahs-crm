import type {
  CreateLeadInput,
  UpdateLeadInput,
  AssignLeadInput,
  UpdateLeadStageInput,
  CreateLeadStageInput,
  ReorderLeadStagesInput,
  LeadQueryInput,
  MoveLeadStageInput,
  ReorderStageLeadsInput,
} from "../schemas/lead.schema";
import type {
  AddLeadPartnerInput,
  UpdateLeadPartnerInput,
  RemoveLeadPartnerInput,
  LeadPartnerRole,
  LeadPartnerStatus,
} from "../schemas/lead-partner.schema";

export type {
  CreateLeadInput,
  UpdateLeadInput,
  AssignLeadInput,
  UpdateLeadStageInput,
  CreateLeadStageInput,
  ReorderLeadStagesInput,
  LeadQueryInput,
  MoveLeadStageInput,
  ReorderStageLeadsInput,
  AddLeadPartnerInput,
  UpdateLeadPartnerInput,
  RemoveLeadPartnerInput,
  LeadPartnerRole,
  LeadPartnerStatus,
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
  position: number;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  stage?: LeadStageItem | null;
  owner?: UserSummary | null;
  createdBy?: UserSummary | null;
  partners?: LeadPartnerItem[];
}

export interface PipelineStageColumn extends LeadStageItem {
  leads: LeadItem[];
  totalCount: number;
}

export interface PipelineBoardData {
  stages: PipelineStageColumn[];
  totalLeads: number;
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
  id: string;
  leadId: string;
  partnerId: string;
  percentage: number;
  role: string;
  status: LeadPartnerStatus;
  addedById: string | null;
  removedById: string | null;
  removalReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  removedAt: Date | null;
  partner?: UserSummary | null;
  addedBy?: UserSummary | null;
  removedBy?: UserSummary | null;
}

export interface LeadPartnershipSummary {
  totalPartnerPercentage: number;
  availablePercentage: number;
  ownerPercentage: number;
  activePartners: LeadPartnerItem[];
  historicalPartners: LeadPartnerItem[];
}

export interface LeadDetail extends LeadItem {
  stageHistory: LeadStageHistoryItem[];
  partners: LeadPartnerItem[];
  partnershipSummary?: LeadPartnershipSummary;
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
