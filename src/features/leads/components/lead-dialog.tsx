"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { createLeadSchema, updateLeadSchema } from "../schemas/lead.schema";
import type { LeadItem, LeadStageItem, UserSummary } from "../types/lead.types";

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadToEdit?: LeadItem | null;
  stages: LeadStageItem[];
  teamUsers: UserSummary[];
  onSuccess: () => void;
}

export function LeadDialog({
  open,
  onOpenChange,
  leadToEdit,
  stages,
  teamUsers,
  onSuccess,
}: LeadDialogProps) {
  const isEditing = Boolean(leadToEdit);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const form = useForm<any>({
    resolver: zodResolver(isEditing ? updateLeadSchema : createLeadSchema) as any,
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      email: "",
      source: "Inside Sales",
      priority: "medium",
      stageId: stages[0]?.id ?? 1,
      ownerId: "",
      requirements: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      setErrorMsg(null);
      if (leadToEdit) {
        form.reset({
          name: leadToEdit.name,
          company: leadToEdit.company || "",
          phone: leadToEdit.phone || "",
          email: leadToEdit.email || "",
          source: leadToEdit.source || "Inside Sales",
          priority: leadToEdit.priority,
          stageId: leadToEdit.stageId,
          ownerId: leadToEdit.ownerId || "",
          requirements: leadToEdit.requirements || "",
          notes: leadToEdit.notes || "",
        });
      } else {
        form.reset({
          name: "",
          company: "",
          phone: "",
          email: "",
          source: "Inside Sales",
          priority: "medium",
          stageId: stages[0]?.id ?? 1,
          ownerId: "",
          requirements: "",
          notes: "",
        });
      }
    }
  }, [open, leadToEdit, stages, form]);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const url = isEditing ? `/api/leads/${leadToEdit?.id}` : "/api/leads";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save lead.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving the lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Lead Details" : "Create New Lead"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update prospect details, contact info, or stage positioning."
              : "Capture a new prospect lead in the sales pipeline."}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lead Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead / Deal Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Logistics Facility Upgrade" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company */}
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company / Organization</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Corporation" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 000-0000" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@company.com" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Priority</FormLabel>
                    <Select value={field.value || "medium"} onValueChange={(val) => field.onChange(val || "medium")}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="critical">Critical Priority</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stage */}
              <FormField
                control={form.control}
                name="stageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Stage *</FormLabel>
                    <Select
                      value={field.value ? field.value.toString() : ""}
                      onValueChange={(v) => field.onChange(v ? parseInt(v, 10) : 1)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pipeline stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              <span>{stage.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source</FormLabel>
                    <Select value={field.value || "Inside Sales"} onValueChange={(val) => field.onChange(val || "Inside Sales")}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Campaign">Campaign</SelectItem>
                        <SelectItem value="Inside Sales">Inside Sales</SelectItem>
                        <SelectItem value="Field Sales">Field Sales</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assigned Owner */}
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Owner</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || "")}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Assign lead owner (Default: Creator)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teamUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Requirements */}
            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Requirements</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what services or products the lead is looking for..."
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes for sales representatives..."
                      rows={2}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
