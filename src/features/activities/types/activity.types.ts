export type ActivityCategory = "all" | "communication" | "lifecycle" | "commercial";

export type ActivityCommunicationType =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "whatsapp";

export type ActivityLifecycleType =
  | "lead_created"
  | "stage_change"
  | "follow_up"
  | "appointment"
  | "field_visit"
  | "task_created"
  | "task_completed"
  | "task_status_changed"
  | "converted";

export type ActivityCommercialType =
  | "quotation_created"
  | "quotation_sent"
  | "quotation_accepted"
  | "invoice_issued"
  | "payment_received";

export type ActivityType =
  | ActivityCommunicationType
  | ActivityLifecycleType
  | ActivityCommercialType;

export type CallOutcome =
  | "connected"
  | "left_message"
  | "no_answer"
  | "busy"
  | "wrong_number";

export type MeetingOutcome =
  | "held"
  | "rescheduled"
  | "cancelled"
  | "no_show";

export type CommunicationOutcome =
  | CallOutcome
  | MeetingOutcome
  | "sent"
  | "delivered"
  | "replied";

export interface ActivityUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface ActivityMetadata {
  fromStageName?: string;
  toStageName?: string;
  fromStageColor?: string;
  toStageColor?: string;
  stageReason?: string;
  amountPaise?: number; // In paise (minor units)
  formattedAmount?: string; // Formatted in INR (₹)
  quoteNumber?: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  paymentReference?: string;
  appointmentTitle?: string;
  appointmentLocation?: string;
  taskTitle?: string;
  taskPriority?: string;
  leadStageName?: string; // For converted customers
  channelOutcome?: string;
  [key: string]: unknown;
}

export interface ActivityItem {
  id: string;
  leadId: string | null;
  customerId: string | null;
  userId: string;
  category: "communication" | "lifecycle" | "commercial";
  type: ActivityType;
  subject: string;
  description: string | null;
  outcome: string | null;
  metadata: ActivityMetadata | null;
  createdAt: Date;
  updatedAt: Date;
  user: ActivityUserSummary | null;
  isLeadPhase?: boolean; // Flag if event happened during lead stage before customer conversion
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface ActivityCategoryCounts {
  all: number;
  communication: number;
  lifecycle: number;
  commercial: number;
}

export interface ActivityFeedResponse {
  items: ActivityItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: ActivityCategoryCounts;
}
