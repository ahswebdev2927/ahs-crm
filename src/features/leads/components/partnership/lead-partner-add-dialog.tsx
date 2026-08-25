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
import { Users, AlertCircle, Loader2 } from "lucide-react";
import type { LeadPartnerRole } from "../../types/lead.types";

interface LeadPartnerAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  availablePercentage: number;
  existingPartnerUserIds: string[];
  ownerUserId?: string | null;
  onPartnerAdded: () => void;
}

interface TeamMemberOption {
  id: string;
  name: string;
  email: string;
  status: string;
}

export function LeadPartnerAddDialog({
  open,
  onOpenChange,
  leadId,
  availablePercentage,
  existingPartnerUserIds,
  ownerUserId,
  onPartnerAdded,
}: LeadPartnerAddDialogProps) {
  const [partnerId, setPartnerId] = React.useState<string>("");
  const [percentage, setPercentage] = React.useState<number>(Math.min(10, availablePercentage));
  const [role, setRole] = React.useState<LeadPartnerRole>("collaborator");

  const [teamMembers, setTeamMembers] = React.useState<TeamMemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Fetch candidate team members when modal opens
  React.useEffect(() => {
    if (!open) {
      setPartnerId("");
      setPercentage(Math.min(10, availablePercentage));
      setRole("collaborator");
      setErrorMsg(null);
      return;
    }

    const fetchTeamMembers = async () => {
      setLoadingMembers(true);
      try {
        const res = await fetch("/api/team?limit=100");
        const json = await res.json();
        const rawUsers = Array.isArray(json.data?.items) ? json.data.items : Array.isArray(json.data?.users) ? json.data.users : [];
        if (rawUsers.length > 0) {
          const activeUsers: TeamMemberOption[] = rawUsers
            .filter((u: any) => u.status === "active")
            .map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              status: u.status,
            }));
          setTeamMembers(activeUsers);
        }
      } catch (_err) {
        // Fallback
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchTeamMembers();
  }, [open, availablePercentage]);

  // Candidates = active team members excluding owner and already partnered users
  const availableCandidates = teamMembers.filter(
    (m) => m.id !== ownerUserId && !existingPartnerUserIds.includes(m.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) {
      setErrorMsg("Please select a sales member to add as a partner.");
      return;
    }
    if (percentage <= 0) {
      setErrorMsg("Percentage share must be greater than 0%.");
      return;
    }
    if (percentage > availablePercentage) {
      setErrorMsg(`Percentage share cannot exceed remaining available ${availablePercentage}%.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/partners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          percentage: Number(percentage),
          role,
        }),
      });

      const json = await res.json();
      if (!res.ok || (json.status !== true && json.success !== true)) {
        throw new Error(json.message || "Failed to add lead partner.");
      }

      onPartnerAdded();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-4 w-4 text-primary" />
            Add Collaborative Partner
          </DialogTitle>
          <DialogDescription className="text-xs">
            Assign a co-sales member and specify their percentage share allocation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Select Sales Member</label>
            {loadingMembers ? (
              <div className="flex items-center justify-center h-10 border border-border rounded-md bg-muted/20 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading team members...
              </div>
            ) : (
              <Select value={partnerId} onValueChange={(val) => setPartnerId(val ?? "")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose a sales team member..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCandidates.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      No eligible active sales members available.
                    </div>
                  ) : (
                    availableCandidates.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.name} ({m.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

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
                Available: <strong className="text-foreground">{availablePercentage}%</strong>
              </span>
            </div>
            <Input
              type="number"
              min={1}
              max={availablePercentage}
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              className="h-9 text-xs"
              placeholder="e.g. 20"
            />
            <p className="text-[11px] text-muted-foreground">
              Total allocated share across all active partners and primary owner must not exceed 100%.
            </p>
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
            <Button
              type="submit"
              size="sm"
              disabled={submitting || availableCandidates.length === 0}
              className="text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Adding...
                </>
              ) : (
                "Add Partner"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
