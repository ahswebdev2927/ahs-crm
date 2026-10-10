"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  UserCheck,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  CheckCircle2,
  Calendar,
  PhoneCall,
  FileText,
} from "lucide-react";
import { convertLeadToCustomerSchema } from "../schemas/customer.schema";
import type { LeadDetail } from "@/features/leads/types/lead.types";

interface CustomerConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadDetail;
  onSuccess: (newCustomerId: string) => void;
}

export function CustomerConvertDialog({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: CustomerConvertDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const form = useForm<any>({
    resolver: zodResolver(convertLeadToCustomerSchema as any),
    defaultValues: {
      leadId: lead.id,
      name: lead.name,
      company: lead.company || "",
      phone: lead.phone || "",
      email: lead.email || "",
      address: "",
      notes: "Converted from sales lead pipeline",
    },
  });

  React.useEffect(() => {
    if (open) {
      setErrorMsg(null);
      form.reset({
        leadId: lead.id,
        name: lead.name,
        company: lead.company || "",
        phone: lead.phone || "",
        email: lead.email || "",
        address: "",
        notes: "Converted from sales lead pipeline",
      });
    }
  }, [open, lead, form]);

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/customers/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          name: values.name.trim(),
          company: values.company?.trim() || null,
          phone: values.phone?.trim() || null,
          email: values.email?.trim() || null,
          address: values.address?.trim() || null,
          notes: values.notes?.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to convert lead to customer.");
      }

      const newCustomerId = data.data.customer.id;
      onOpenChange(false);
      onSuccess(newCustomerId);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during conversion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Convert Lead to Customer
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Promotes this sales lead into an active, permanent customer account while preserving all historical records.
          </DialogDescription>
        </DialogHeader>

        {/* Transition Summary Information Strip */}
        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Preserved History & Re-linked Records</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
              <span>All appointments & visits</span>
            </div>
            <div className="flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
              <span>All scheduled follow-ups</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
              <span>Quotations & documents</span>
            </div>
            <div className="flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
              <span>Original lead link preserved</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
            {/* Customer Account Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Customer Account Name *</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-9 text-xs" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Company */}
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Company Name (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-9 text-xs" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Contact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-9 text-xs" />
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
                      <Input {...field} className="h-9 text-xs" />
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
                  <FormLabel className="text-xs font-medium">Billing / Site Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add customer physical or billing address..."
                      {...field}
                      className="min-h-[58px] text-xs resize-none"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Conversion Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Conversion Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Converted after deal win approval"
                      {...field}
                      className="h-9 text-xs"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

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
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & Convert to Customer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
