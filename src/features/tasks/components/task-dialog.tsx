"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
import type { TaskItem, TaskPriority, TaskStatus, UserSummary } from "../types/task.types";

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  leadId: string | null;
  customerId: string | null;
  assignedToId: string | null;
  dueDate: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskToEdit?: TaskItem | null;
  teamUsers?: UserSummary[];
  availableLeads?: Array<{ id: string; name: string }>;
  availableCustomers?: Array<{ id: string; name: string }>;
  initialLeadId?: string | null;
  initialCustomerId?: string | null;
  initialStatus?: TaskStatus;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export function TaskDialog({
  open,
  onOpenChange,
  taskToEdit,
  teamUsers: propTeamUsers,
  availableLeads: propAvailableLeads,
  availableCustomers: propAvailableCustomers,
  initialLeadId,
  initialCustomerId,
  initialStatus = "pending",
  onSubmit,
}: TaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [targetType, setTargetType] = React.useState<"none" | "lead" | "customer">("none");

  // Local lookups if not passed in props
  const [localTeam, setLocalTeam] = React.useState<UserSummary[]>([]);
  const [localLeads, setLocalLeads] = React.useState<Array<{ id: string; name: string }>>([]);
  const [localCustomers, setLocalCustomers] = React.useState<Array<{ id: string; name: string }>>([]);

  const teamUsers = propTeamUsers && propTeamUsers.length > 0 ? propTeamUsers : localTeam;
  const availableLeads = propAvailableLeads && propAvailableLeads.length > 0 ? propAvailableLeads : localLeads;
  const availableCustomers = propAvailableCustomers && propAvailableCustomers.length > 0 ? propAvailableCustomers : localCustomers;

  const isEditing = Boolean(taskToEdit);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: initialStatus,
      leadId: null,
      customerId: null,
      assignedToId: null,
      dueDate: "",
    },
  });

  const selectedPriority = watch("priority");
  const selectedStatus = watch("status");
  const selectedLeadId = watch("leadId");
  const selectedCustomerId = watch("customerId");
  const selectedAssignedToId = watch("assignedToId");

  // Fetch local lookups when dialog opens if empty
  React.useEffect(() => {
    if (!open) return;

    if (!propTeamUsers || propTeamUsers.length === 0) {
      fetch("/api/team?limit=100")
        .then((r) => r.json())
        .then((data) => {
          if (data?.data?.items) {
            setLocalTeam(
              data.data.items.map((u: { id: string; name: string; email: string }) => ({
                id: u.id,
                name: u.name,
                email: u.email,
              }))
            );
          }
        })
        .catch(() => {});
    }

    if (!propAvailableLeads || propAvailableLeads.length === 0) {
      fetch("/api/leads?limit=100")
        .then((r) => r.json())
        .then((data) => {
          if (data?.data?.leads) {
            setLocalLeads(
              data.data.leads.map((l: { id: string; name?: string; contactName?: string }) => ({
                id: l.id,
                name: l.name || l.contactName || "Unnamed Lead",
              }))
            );
          }
        })
        .catch(() => {});
    }

    if (!propAvailableCustomers || propAvailableCustomers.length === 0) {
      fetch("/api/customers?limit=100")
        .then((r) => r.json())
        .then((data) => {
          if (data?.data?.customers) {
            setLocalCustomers(
              data.data.customers.map((c: { id: string; name?: string }) => ({
                id: c.id,
                name: c.name || "Unnamed Customer",
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [open, propTeamUsers, propAvailableLeads, propAvailableCustomers]);

  // Sync state when editing or opening
  React.useEffect(() => {
    if (taskToEdit) {
      reset({
        title: taskToEdit.title,
        description: taskToEdit.description || "",
        priority: taskToEdit.priority,
        status: taskToEdit.status,
        leadId: taskToEdit.leadId || null,
        customerId: taskToEdit.customerId || null,
        assignedToId: taskToEdit.assignedToId || null,
        dueDate: taskToEdit.dueDate ? format(new Date(taskToEdit.dueDate), "yyyy-MM-dd") : "",
      });

      if (taskToEdit.leadId) {
        setTargetType("lead");
      } else if (taskToEdit.customerId) {
        setTargetType("customer");
      } else {
        setTargetType("none");
      }
    } else {
      const activeLead = initialLeadId || null;
      const activeCustomer = initialCustomerId || null;

      reset({
        title: "",
        description: "",
        priority: "medium",
        status: initialStatus,
        leadId: activeLead,
        customerId: activeCustomer,
        assignedToId: null,
        dueDate: "",
      });

      if (activeLead) {
        setTargetType("lead");
      } else if (activeCustomer) {
        setTargetType("customer");
      } else {
        setTargetType("none");
      }
    }
  }, [taskToEdit, initialLeadId, initialCustomerId, initialStatus, reset, open]);

  const onFormSubmit = async (data: TaskFormData) => {
    if (!data.title.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = {
        title: data.title.trim(),
        description: data.description ? data.description.trim() : null,
        priority: data.priority,
        status: data.status,
        assignedToId: data.assignedToId || null,
        leadId: targetType === "lead" ? data.leadId || null : null,
        customerId: targetType === "customer" ? data.customerId || null : null,
        dueDate: data.dueDate ? new Date(data.dueDate).getTime() : null,
      };

      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      // Error handled by parent toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update task details, ownership, or deadlines."
              : "Define an action item, assign it to a team member, and associate with a lead or customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 pt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Task Title *</label>
            <Input
              {...register("title", { required: "Task title is required" })}
              placeholder="e.g., Follow up on signed proposal or conduct site inspection"
              className="text-xs"
              autoFocus
            />
            {errors.title && (
              <p className="text-[11px] text-rose-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
            <Textarea
              {...register("description")}
              placeholder="Additional context, action points, or requirements..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Priority</label>
              <Select
                value={selectedPriority || "medium"}
                onValueChange={(val) => {
                  if (val) setValue("priority", val as TaskPriority);
                }}
              >
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Status</label>
              <Select
                value={selectedStatus || "pending"}
                onValueChange={(val) => {
                  if (val) setValue("status", val as TaskStatus);
                }}
              >
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="deferred">Deferred</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date & Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Due Date</label>
              <Input
                type="date"
                {...register("dueDate")}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Assignee</label>
              <Select
                value={selectedAssignedToId || "unassigned"}
                onValueChange={(val) => {
                  setValue("assignedToId", !val || val === "unassigned" ? null : val);
                }}
              >
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Associate With: None / Lead / Customer */}
          <div className="space-y-2 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Associate With</label>
              <div className="flex items-center gap-1.5">
                {(["none", "lead", "customer"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setTargetType(type);
                      if (type === "none") {
                        setValue("leadId", null);
                        setValue("customerId", null);
                      } else if (type === "lead") {
                        setValue("customerId", null);
                        if (!selectedLeadId && availableLeads.length > 0) {
                          setValue("leadId", availableLeads[0].id);
                        }
                      } else if (type === "customer") {
                        setValue("leadId", null);
                        if (!selectedCustomerId && availableCustomers.length > 0) {
                          setValue("customerId", availableCustomers[0].id);
                        }
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                      targetType === type
                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type === "none" ? "General (None)" : type}
                  </button>
                ))}
              </div>
            </div>

            {targetType === "lead" && (
              <Select
                value={selectedLeadId || ""}
                onValueChange={(val) => setValue("leadId", val || null)}
              >
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="Select Lead" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {targetType === "customer" && (
              <Select
                value={selectedCustomerId || ""}
                onValueChange={(val) => setValue("customerId", val || null)}
              >
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
