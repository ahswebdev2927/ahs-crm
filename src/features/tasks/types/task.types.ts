import type { TaskPriority, TaskStatus } from "../schemas/task.schema";

export type { TaskPriority, TaskStatus };

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface LeadSummary {
  id: string;
  contactName: string;
  companyName: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  leadId: string | null;
  customerId: string | null;
  assignedToId: string | null;
  createdById: string;
  dueDate: Date | null;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  lead: LeadSummary | null;
  customer: CustomerSummary | null;
  assignedTo: UserSummary | null;
  createdBy: UserSummary;
}

export interface TaskMetrics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  highPriority: number;
}

export interface TaskListResponse {
  tasks: TaskItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type TaskViewMode = "list" | "kanban";

export interface TaskFilterValues {
  search: string;
  status: string;
  priority: string;
  assignedToId: string;
  dueDatePreset: "all" | "today" | "week" | "overdue";
  viewMode: TaskViewMode;
}

export interface TaskKanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: TaskItem[];
}
