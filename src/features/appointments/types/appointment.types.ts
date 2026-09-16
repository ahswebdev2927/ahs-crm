import type { AppointmentStatus } from "../schemas/appointment.schema";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface LeadSummary {
  id: string;
  contactName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface AppointmentItem {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  status: AppointmentStatus;
  rescheduleReason: string | null;
  cancellationReason: string | null;
  leadId: string | null;
  customerId: string | null;
  createdById: string;
  assignedToId: string;
  createdAt: Date;
  updatedAt: Date;
  lead: LeadSummary | null;
  customer: CustomerSummary | null;
  createdBy: UserSummary;
  assignedTo: UserSummary;
}

export interface AppointmentMetrics {
  total: number;
  scheduled: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  rescheduled: number;
  cancelled: number;
  noShow: number;
}

export interface AppointmentListResponse {
  items: AppointmentItem[];
  metrics: AppointmentMetrics;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FieldSalesUser {
  id: string;
  name: string;
  email: string;
  roleCode: string;
}

export type CalendarEventType = "appointment" | "followup";

export interface CalendarEvent {
  id: string;
  title: string;
  eventType: CalendarEventType;
  startTime: Date;
  endTime: Date;
  status: string;
  location?: string | null;
  description?: string | null;
  leadId?: string | null;
  leadName?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  assignedToId: string;
  assignedToName: string;
}
