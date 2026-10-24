import type { ActivityType, ActivityMetadata } from "../types/activity.types";

/**
 * Resolves the primary high-level category for a specific activity type.
 */
export function getCategoryForType(type: ActivityType): "communication" | "lifecycle" | "commercial" {
  switch (type) {
    case "note":
    case "call":
    case "email":
    case "meeting":
    case "whatsapp":
      return "communication";

    case "quotation_created":
    case "quotation_sent":
    case "quotation_accepted":
    case "invoice_issued":
    case "payment_received":
      return "commercial";

    case "lead_created":
    case "stage_change":
    case "follow_up":
    case "appointment":
    case "field_visit":
    case "task_created":
    case "task_completed":
    case "converted":
    default:
      return "lifecycle";
  }
}

/**
 * Returns a human-friendly display label for an activity type.
 */
export function getTypeLabel(type: ActivityType): string {
  switch (type) {
    case "note":
      return "Note";
    case "call":
      return "Phone Call";
    case "email":
      return "Email";
    case "meeting":
      return "Meeting";
    case "whatsapp":
      return "WhatsApp";
    case "lead_created":
      return "Lead Created";
    case "stage_change":
      return "Stage Changed";
    case "follow_up":
      return "Follow-up";
    case "appointment":
      return "Appointment";
    case "field_visit":
      return "Field Visit";
    case "task_created":
      return "Task Assigned";
    case "task_completed":
      return "Task Completed";
    case "task_status_changed":
      return "Task Status Changed";
    case "converted":
      return "Converted to Customer";
    case "quotation_created":
      return "Quotation Created";
    case "quotation_sent":
      return "Quotation Sent";
    case "quotation_accepted":
      return "Quotation Accepted";
    case "invoice_issued":
      return "Invoice Issued";
    case "payment_received":
      return "Payment Received";
    default:
      return "Activity";
  }
}

/**
 * Returns a human-friendly label for communication outcomes.
 */
export function getOutcomeLabel(outcome?: string | null): string {
  if (!outcome) return "";
  switch (outcome) {
    case "connected":
      return "Connected / Spoke with client";
    case "left_message":
      return "Left Voicemail / Message";
    case "no_answer":
      return "No Answer";
    case "busy":
      return "Busy / Callback requested";
    case "wrong_number":
      return "Wrong Number";
    case "held":
      return "Meeting Held";
    case "rescheduled":
      return "Rescheduled";
    case "cancelled":
      return "Cancelled";
    case "no_show":
      return "Client No-show";
    case "sent":
      return "Sent";
    case "delivered":
      return "Delivered";
    case "replied":
      return "Client Replied";
    default:
      return outcome.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Formats a Date into standard readable CRM timestamp.
 * e.g., "22 Oct 2026, 03:15 PM"
 */
export function formatActivityDate(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  const day = date.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

/**
 * Formats relative time difference ("2 hours ago", "Yesterday", "Just now").
 */
export function formatTimeAgo(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "Yesterday";
  }
  if (diffInDays < 30) {
    return `${diffInDays}d ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }

  return `${Math.floor(diffInMonths / 12)}y ago`;
}

/**
 * Standard Indian Rupee (₹ / en-IN) currency formatter for financial activity events.
 * minor units (paise) are converted to rupees.
 */
export function formatActivityCurrency(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

/**
 * Safely parses JSON metadata string from database.
 */
export function parseActivityMetadata(metadataString: string | null): ActivityMetadata | null {
  if (!metadataString) return null;
  try {
    return JSON.parse(metadataString);
  } catch {
    return null;
  }
}
