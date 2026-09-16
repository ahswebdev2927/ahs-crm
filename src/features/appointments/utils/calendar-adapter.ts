import type { AppointmentItem, CalendarEvent } from "../types/appointment.types";
import type { FollowUpItem } from "@/features/followups/types/followup.types";

/**
 * Normalizes an Appointment item into a standard CalendarEvent model.
 */
export function adaptAppointmentToCalendarEvent(apt: AppointmentItem): CalendarEvent {
  const leadName = apt.lead ? (apt.lead.companyName ? `${apt.lead.contactName} (${apt.lead.companyName})` : apt.lead.contactName) : null;
  const customerName = apt.customer ? apt.customer.name : null;

  return {
    id: apt.id,
    title: apt.title,
    eventType: "appointment",
    startTime: new Date(apt.startTime),
    endTime: new Date(apt.endTime),
    status: apt.status,
    location: apt.location,
    description: apt.description,
    leadId: apt.leadId,
    leadName,
    customerId: apt.customerId,
    customerName,
    assignedToId: apt.assignedToId,
    assignedToName: apt.assignedTo?.name ?? "Unassigned",
  };
}

/**
 * Normalizes a FollowUp item into a standard CalendarEvent model.
 */
export function adaptFollowUpToCalendarEvent(fu: FollowUpItem): CalendarEvent {
  const start = new Date(fu.scheduledAt);
  // Default follow-up block duration: 30 minutes
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const leadName = fu.lead ? (fu.lead.company ? `${fu.lead.name} (${fu.lead.company})` : fu.lead.name) : null;
  const customerName = fu.customer ? fu.customer.name : null;

  return {
    id: fu.id,
    title: `Follow-up (${fu.type}): ${leadName || customerName || 'Client'}`,
    eventType: "followup",
    startTime: start,
    endTime: end,
    status: fu.status,
    location: null,
    description: fu.notes,
    leadId: fu.leadId,
    leadName,
    customerId: fu.customerId,
    customerName,
    assignedToId: fu.assignedToId,
    assignedToName: fu.assignedTo?.name ?? "Unassigned",
  };
}

/**
 * Combines and sorts appointments and follow-ups into a unified chronological array of CalendarEvents.
 */
export function adaptToCalendarEvents(
  appointments: AppointmentItem[],
  followUps: FollowUpItem[] = []
): CalendarEvent[] {
  const appointmentEvents = appointments.map(adaptAppointmentToCalendarEvent);
  const followUpEvents = followUps.map(adaptFollowUpToCalendarEvent);

  const combined = [...appointmentEvents, ...followUpEvents];

  return combined.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
