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
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../schemas/customer.schema";
import type { CustomerItem, UserSummary } from "../types/customer.types";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerToEdit?: CustomerItem | null;
  teamUsers: UserSummary[];
  onSuccess: () => void;
}

export function CustomerDialog({
  open,
  onOpenChange,
  customerToEdit,
  teamUsers,
  onSuccess,
}: CustomerDialogProps) {
  const isEditing = Boolean(customerToEdit);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const form = useForm<any>({
    resolver: zodResolver(
      (isEditing ? updateCustomerSchema : createCustomerSchema) as any
    ),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      email: "",
      address: "",
      status: "active",
      ownerId: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      setErrorMsg(null);
      if (customerToEdit) {
        form.reset({
          name: customerToEdit.name,
          company: customerToEdit.company || "",
          phone: customerToEdit.phone || "",
          email: customerToEdit.email || "",
          address: customerToEdit.address || "",
          status: customerToEdit.status,
          ownerId: customerToEdit.ownerId || "",
          notes: "",
        });
      } else {
        form.reset({
          name: "",
          company: "",
          phone: "",
          email: "",
          address: "",
          status: "active",
          ownerId: "",
          notes: "",
        });
      }
    }
  }, [open, customerToEdit, form]);

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const url = isEditing
        ? `/api/customers/${customerToEdit?.id}`
        : "/api/customers";
      const method = isEditing ? "PATCH" : "POST";

      const payload = {
        name: values.name.trim(),
        company: values.company?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
        status: values.status,
        ownerId: values.ownerId?.trim() || null,
        notes: values.notes?.trim() || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save customer account.");
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            {!isEditing && (
              <div className="h-7 w-7 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
            )}
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {isEditing ? "Edit Customer Account" : "Add Direct Customer"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Update profile, contact details, or assigned owner for this customer account."
              : "Directly onboard an external customer without creating a sales lead first."}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Customer / Client Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Acme Corporation or John Smith" {...field} className="h-9 text-xs" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Company & Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Company Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Group" {...field} className="h-9 text-xs" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Account Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active Client</SelectItem>
                        <SelectItem value="inactive">Inactive / Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone & Email Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 555-0100" {...field} className="h-9 text-xs" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="client@company.com" {...field} className="h-9 text-xs" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Physical / Billing Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Physical / Billing Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Street address, city, state, postal code..."
                      {...field}
                      className="min-h-[64px] text-xs resize-none"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Assigned Sales Owner */}
            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Account Owner</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val || "")}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Assign account owner (Default: Current user)" />
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
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Initial Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Key client requirements, background context, or notes..."
                        {...field}
                        className="min-h-[60px] text-xs resize-none"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Customer Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
