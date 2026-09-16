import { z } from "zod";

export const appointmentStatusEnum = z.enum([
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "rescheduled",
  "cancelled",
  "no_show",
]);

export type AppointmentStatus = z.infer<typeof appointmentStatusEnum>;

export const createAppointmentSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title is too long"),
    leadId: z.string().nullable().optional(),
    customerId: z.string().nullable().optional(),
    startTime: z.number().int("Start time must be a timestamp"),
    endTime: z.number().int("End time must be a timestamp"),
    location: z.string().max(300, "Location is too long").nullable().optional(),
    description: z.string().max(1000, "Description is too long").nullable().optional(),
    assignedToId: z.string().min(1, "Assigned Field Sales representative is required"),
  })
  .refine((data) => data.leadId || data.customerId, {
    message: "Either a Lead or a Customer must be selected",
    path: ["leadId"],
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    startTime: z.number().int().optional(),
    endTime: z.number().int().optional(),
    location: z.string().max(300).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    assignedToId: z.string().min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatusEnum,
  notes: z.string().max(500).optional(),
});

export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;

export const rescheduleAppointmentSchema = z
  .object({
    startTime: z.number().int("New start time is required"),
    endTime: z.number().int("New end time is required"),
    rescheduleReason: z.string().min(3, "Reschedule reason is required").max(500),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  cancellationReason: z.string().min(3, "Cancellation reason is required").max(500),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const appointmentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.union([appointmentStatusEnum, z.literal("all")]).optional(),
  assignedToId: z.string().optional(),
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.coerce.number().optional(),
  endDate: z.coerce.number().optional(),
  search: z.string().optional(),
});

export type AppointmentQueryInput = z.infer<typeof appointmentQuerySchema>;
