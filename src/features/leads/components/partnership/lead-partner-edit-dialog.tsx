"use client";

import * as React from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, AlertCircle, Loader2 } from "lucide-react";
import type { LeadPartnerItem, LeadPartnerRole } from "../../types/lead.types";

interface LeadPartnerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  partner: LeadPartnerItem | null;
  maxAvailablePercentage: number;
  onPartnerUpdated: () => void;
}

export function LeadPartnerEditDialog({
  open,
  onOpenChange,
  leadId,
  partner,
  maxAvailablePercentage,
  onPartnerUpdated,
}: LeadPartnerEditDialogProps) {
  const [percentage, setPercentage] = React.useState<number>(0);
  const [role, setRole] = React.useState<LeadPartnerRole>("collaborator");

  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (partner && open) {
      setPercentage(partner.percentage);
      setRole((partner.role as LeadPartnerRole) || "collaborator");
      setErrorMsg(null);
    }
  }, [partner, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;

    if (percentage <= 0) {
      setErrorMsg("Percentage share must be greater than 0%.");
      return;
    }
    if (percentage > maxAvailablePercentage) {
      setErrorMsg(`Percentage share cannot exceed maximum available ${maxAvailablePercentage}%.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percentage: Number(percentage),
          role,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update lead partner.");
      }

      onPartnerUpdated();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!partner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Edit2 className="h-4 w-4 text-primary" />
            Edit Partner Share & Role
          </DialogTitle>
          <DialogDescription className="text-xs">
            Modify percentage allocation or role for <strong className="text-foreground">{partner.partner?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Partner Role</label>
            <Select value={role} onValueChange={(val) => setRole(val as LeadPartnerRole)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select partner role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collaborator" className="text-xs">Collaborator (Standard)</SelectItem>
                <SelectItem value="co_owner" className="text-xs">Co-Owner (Primary Collaboration)</SelectItem>
                <SelectItem value="referral" className="text-xs">Referral Sales</SelectItem>
                <SelectItem value="technical_sales" className="text-xs">Technical Sales / Solutions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Percentage Allocation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-foreground">Percentage Share (%)</label>
              <span className="text-muted-foreground">
                Max Allowed: <strong className="text-foreground">{maxAvailablePercentage}%</strong>
              </span>
            </div>
            <Input
              type="number"
              min={1}
              max={maxAvailablePercentage}
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="text-xs">
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
