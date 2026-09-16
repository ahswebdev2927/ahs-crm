import type { FollowUpType, FollowUpStatus } from "../schemas/followup.schema";

export interface FollowUpItem {
  id: string;
  leadId?: string | null;
  customerId?: string | null;
  scheduledAt: Date;
  type: FollowUpType;
  notes?: string | null;
  outcome?: string | null;
  status: FollowUpStatus;
  completedAt?: Date | null;
  createdById: string;
  assignedToId: string;
  createdAt: Date;
  updatedAt: Date;
  lead?: {
    id: string;
    name: string;
    company?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  customer?: {
    id: string;
    name: string;
    company?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface FollowUpMetrics {
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
  completedTodayCount: number;
  totalPendingCount: number;
}

export interface FollowUpListResponse {
  items: FollowUpItem[];
  metrics: FollowUpMetrics;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
