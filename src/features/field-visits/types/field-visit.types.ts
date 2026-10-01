import { FieldVisitStatus, NextActionType } from "../schemas/field-visit.schema";

export interface FieldVisitItem {
  id: string;
  leadId: string | null;
  customerId: string | null;
  appointmentId: string | null;
  visitDate: number;
  purpose: string;
  summary: string | null;
  outcome: string | null;
  feedback: string | null;
  requirements: string | null;
  nextAction: NextActionType | null;
  nextActionDate: number | null;
  expenses: number;
  status: FieldVisitStatus;
  createdById: string;
  assignedToId: string;
  createdAt: number;
  updatedAt: number;
  lead?: {
    id: string;
    name: string;
    company: string | null;
    phone: string | null;
    email: string | null;
    requirements: string | null;
  } | null;
  customer?: {
    id: string;
    name: string;
    company: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  appointment?: {
    id: string;
    title: string;
    startTime: number;
    endTime: number;
    location: string | null;
  } | null;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface FieldVisitMetrics {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  totalExpenses: number;
  nextActionsBreakdown: Record<NextActionType, number>;
}

export interface FieldVisitListResponse {
  items: FieldVisitItem[];
  metrics: FieldVisitMetrics;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
