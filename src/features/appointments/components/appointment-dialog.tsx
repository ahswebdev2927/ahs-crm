"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAppointmentSchema, type CreateAppointmentInput } from "../schemas/appointment.schema";
import type { AppointmentItem, FieldSalesUser } from "../types/appointment.types";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentToEdit?: AppointmentItem | null;
  fieldSalesUsers?: FieldSalesUser[];
  availableLeads?: Array<{ id: string; name: string }>;
  availableCustomers?: Array<{ id: string; name: string }>;
  onSubmit: (data: CreateAppointmentInput) => Promise<void>;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  appointmentToEdit,
  fieldSalesUsers: propFieldSalesUsers,
  availableLeads: propAvailableLeads,
  availableCustomers: propAvailableCustomers,
  onSubmit,
}: AppointmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [targetType, setTargetType] = React.useState<"lead" | "customer">("lead");

  // Local state for fetched lookups if props are empty
  const [localFieldSales, setLocalFieldSales] = React.useState<FieldSalesUser[]>([]);
  const [localLeads, setLocalLeads] = React.useState<Array<{ id: string; name: string }>>([]);
  const [localCustomers, setLocalCustomers] = React.useState<Array<{ id: string; name: string }>>([]);

  const fieldSalesUsers = (propFieldSalesUsers && propFieldSalesUsers.length > 0) ? propFieldSalesUsers : localFieldSales;
  const availableLeads = (propAvailableLeads && propAvailableLeads.length > 0) ? propAvailableLeads : localLeads;
  const availableCustomers = (propAvailableCustomers && propAvailableCustomers.length > 0) ? propAvailableCustomers : localCustomers;

  // Default start time: tomorrow 10:00 AM
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() + 1);
  defaultStart.setHours(10, 0, 0, 0);

  const defaultEnd = new Date(defaultStart);
  defaultEnd.setHours(11, 0, 0, 0);

  const [dateStr, setDateStr] = React.useState(format(defaultStart, "yyyy-MM-dd"));
  const [startTimeStr, setStartTimeStr] = React.useState("10:00");
  const [endTimeStr, setEndTimeStr] = React.useState("11:00");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      title: "",
      leadId: undefined,
      customerId: undefined,
      startTime: defaultStart.getTime(),
      endTime: defaultEnd.getTime(),
      location: "",
      description: "",
      assignedToId: "",
    },
  });

  const selectedLeadId = watch("leadId");
  const selectedCustomerId = watch("customerId");
  const selectedAssignedToId = watch("assignedToId");

  // Self-fetch lookups when dialog opens if empty
  React.useEffect(() => {
    if (!open) return;

    async function fetchLookups() {
      try {
        const [fsRes, leadsRes, custRes] = await Promise.all([
          fetch("/api/appointments/field-sales"),
          fetch("/api/leads?limit=100"),
          fetch("/api/customers?limit=100"),
        ]);

        if (fsRes.ok) {
          const json = await fsRes.json();
          const users = json.data?.users || [];
          setLocalFieldSales(users);
        }

        if (leadsRes.ok) {
          const json = await leadsRes.json();
          const items = json.data?.items || json.data?.leads || [];
          setLocalLeads(
            items.map((l: any) => ({
              id: l.id,
              name: `${l.name || l.contactName || "Unnamed Lead"}${l.company ? ` — ${l.company}` : ""}`,
            }))
          );
        }

        if (custRes.ok) {
          const json = await custRes.json();
          const items = json.data?.items || json.data?.customers || [];
          setLocalCustomers(items.map((c: any) => ({ id: c.id, name: c.name })));
        }
      } catch (err) {
        console.error("Failed to load dialog lookups:", err);
      }
    }

    fetchLookups();
  }, [open]);

  // Sync form values on dialog open or edit mode
  React.useEffect(() => {
    if (!open) return;

    if (appointmentToEdit) {
      const start = new Date(appointmentToEdit.startTime);
      const end = new Date(appointmentToEdit.endTime);

      setDateStr(format(start, "yyyy-MM-dd"));
      setStartTimeStr(format(start, "HH:mm"));
      setEndTimeStr(format(end, "HH:mm"));

      if (appointmentToEdit.customerId) {
        setTargetType("customer");
      } else {
        setTargetType("lead");
      }

      reset({
        title: appointmentToEdit.title,
        leadId: appointmentToEdit.leadId || undefined,
        customerId: appointmentToEdit.customerId || undefined,
        startTime: start.getTime(),
        endTime: end.getTime(),
        location: appointmentToEdit.location || "",
        description: appointmentToEdit.description || "",
        assignedToId: appointmentToEdit.assignedToId,
      });
    } else {
      setDateStr(format(defaultStart, "yyyy-MM-dd"));
      setStartTimeStr("10:00");
      setEndTimeStr("11:00");

      const defaultLead = availableLeads.length > 0 ? availableLeads[0].id : undefined;
      const defaultAssignee = fieldSalesUsers.length > 0 ? fieldSalesUsers[0].id : "";

      reset({
        title: "",
        leadId: defaultLead,
        customerId: undefined,
        startTime: defaultStart.getTime(),
        endTime: defaultEnd.getTime(),
        location: "",
        description: "",
        assignedToId: defaultAssignee,
      });
    }
  }, [appointmentToEdit, open, availableLeads.length, fieldSalesUsers.length]);

  // Combine dateStr + startTimeStr into timestamp
  const syncTimestamps = (d: string, startT: string, endT: string) => {
    try {
      const [year, month, day] = d.split("-").map(Number);
      const [startH, startM] = startT.split(":").map(Number);
      const [endH, endM] = endT.split(":").map(Number);

      const startDateObj = new Date(year, month - 1, day, startH, startM);
      const endDateObj = new Date(year, month - 1, day, endH, endM);

      setValue("startTime", startDateObj.getTime());
      setValue("endTime", endDateObj.getTime());
    } catch {
      // Ignored parsing errors
    }
  };

  const handleFormSubmit = async (data: CreateAppointmentInput) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {appointmentToEdit ? "Edit Appointment" : "Schedule New Field Appointment"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create an assessment or meeting appointment and assign a Field Sales agent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Appointment Title */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-xs font-medium text-foreground">
              Appointment Title *
            </label>
            <Input
              id="title"
              placeholder="e.g., Solar Site Inspection & Assessment"
              {...register("title")}
              className="text-xs h-9 w-full"
            />
            {errors.title && <p className="text-[11px] text-rose-500">{errors.title.message}</p>}
          </div>

          {/* Client Target Toggle & Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Associate With *</label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType("lead");
                    setValue("customerId", undefined);
                    if (availableLeads.length > 0) setValue("leadId", availableLeads[0].id);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                    targetType === "lead"
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Lead
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType("customer");
                    setValue("leadId", undefined);
                    if (availableCustomers.length > 0) setValue("customerId", availableCustomers[0].id);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                    targetType === "customer"
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Customer
                </button>
              </div>
            </div>

            {targetType === "lead" ? (
              <Select
                value={selectedLeadId || ""}
                onValueChange={(val) => {
                  if (val) setValue("leadId", val, { shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder={availableLeads.length > 0 ? "Select Lead" : "Loading leads..."} />
                </SelectTrigger>
                <SelectContent className="max-h-60 z-[100] bg-popover border border-border shadow-md">
                  {availableLeads.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">No leads found</div>
                  ) : (
                    availableLeads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={selectedCustomerId || ""}
                onValueChange={(val) => {
                  if (val) setValue("customerId", val, { shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder={availableCustomers.length > 0 ? "Select Customer" : "Loading customers..."} />
                </SelectTrigger>
                <SelectContent className="max-h-60 z-[100] bg-popover border border-border shadow-md">
                  {availableCustomers.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">No customers found</div>
                  ) : (
                    availableCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {errors.leadId && <p className="text-[11px] text-rose-500">{errors.leadId.message}</p>}
          </div>

          {/* Assignee Selection */}
          <div className="space-y-1.5">
            <label htmlFor="assignedToId" className="text-xs font-medium text-foreground">
              Assigned Field Sales Representative *
            </label>
            <Select
              value={selectedAssignedToId || ""}
              onValueChange={(val) => {
                if (val) setValue("assignedToId", val, { shouldValidate: true });
              }}
            >
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder={fieldSalesUsers.length > 0 ? "Select Field Sales Agent" : "Loading representatives..."} />
              </SelectTrigger>
              <SelectContent className="max-h-60 z-[100] bg-popover border border-border shadow-md">
                {fieldSalesUsers.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground text-center">No active representatives found</div>
                ) : (
                  fieldSalesUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.assignedToId && <p className="text-[11px] text-rose-500">{errors.assignedToId.message}</p>}
          </div>

          {/* Date & Time Pickers */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Date *</label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => {
                  setDateStr(e.target.value);
                  syncTimestamps(e.target.value, startTimeStr, endTimeStr);
                }}
                className="text-xs h-9 w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Start Time *</label>
              <Input
                type="time"
                value={startTimeStr}
                onChange={(e) => {
                  setStartTimeStr(e.target.value);
                  syncTimestamps(dateStr, e.target.value, endTimeStr);
                }}
                className="text-xs h-9 w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">End Time *</label>
              <Input
                type="time"
                value={endTimeStr}
                onChange={(e) => {
                  setEndTimeStr(e.target.value);
                  syncTimestamps(dateStr, startTimeStr, e.target.value);
                }}
                className="text-xs h-9 w-full"
              />
            </div>
          </div>
          {errors.endTime && <p className="text-[11px] text-rose-500">{errors.endTime.message}</p>}

          {/* Location */}
          <div className="space-y-1.5">
            <label htmlFor="location" className="text-xs font-medium text-foreground">
              Meeting Location / Address
            </label>
            <Input
              id="location"
              placeholder="e.g., 102 Park Avenue, Site Sector 4"
              {...register("location")}
              className="text-xs h-9 w-full"
            />
          </div>

          {/* Description / Notes */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-xs font-medium text-foreground">
              Notes / Agenda
            </label>
            <Textarea
              id="description"
              placeholder="Key objectives, site access instructions, customer preferences..."
              {...register("description")}
              rows={3}
              className="text-xs w-full"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? "Saving..." : appointmentToEdit ? "Save Changes" : "Schedule Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
