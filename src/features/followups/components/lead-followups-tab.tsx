"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PhoneCall, Calendar, Plus, Clock } from "lucide-react";
import { FollowUpList } from "./followup-list";
import { FollowUpDialog } from "./followup-dialog";
import { CompleteFollowUpDialog } from "./complete-followup-dialog";
import { LogCallDialog } from "./log-call-dialog";
import type { FollowUpItem } from "../types/followup.types";

interface LeadFollowUpsTabProps {
  leadId: string;
  leadName: string;
  canEdit?: boolean;
}

export function LeadFollowUpsTab({
  leadId,
  leadName,
  canEdit = true,
}: LeadFollowUpsTabProps) {
  const [items, setItems] = React.useState<FollowUpItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = React.useState(false);
  const [logCallDialogOpen, setLogCallDialogOpen] = React.useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = React.useState<FollowUpItem | null>(null);

  const fetchFollowUps = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/follow-ups?leadId=${leadId}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.data?.items || []);
      }
    } catch {
      // Ignore network errors
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  React.useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const handleScheduleSubmit = async (payload: any) => {
    const res = await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Failed to schedule follow-up");
    }
    fetchFollowUps();
  };

  const handleCompleteSubmit = async (id: string, payload: any) => {
    const res = await fetch(`/api/follow-ups/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Failed to complete follow-up");
    }
    fetchFollowUps();
  };

  const handleLogCallSubmit = async (payload: any) => {
    // 1. Create completed call record
    const createRes = await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: payload.leadId,
        type: "call",
        scheduledAt: new Date(),
        assignedToId: "current", // Service sets user.id
        notes: "Phone Call",
      }),
    });

    if (!createRes.ok) {
      const errData = await createRes.json();
      throw new Error(errData.message || "Failed to log call");
    }

    const createData = await createRes.json();
    const createdId = createData.data?.followUp?.id;

    if (createdId) {
      // 2. Mark complete immediately
      await handleCompleteSubmit(createdId, {
        outcome: payload.outcome,
        nextFollowUp: payload.nextFollowUp,
      });
    }
  };

  const handleCancel = async (followUp: FollowUpItem) => {
    if (!confirm("Are you sure you want to cancel this follow-up?")) return;
    try {
      const res = await fetch(`/api/follow-ups/${followUp.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchFollowUps();
      }
    } catch {
      // Handled
    }
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Lead Follow-up Schedule
          </CardTitle>
          <CardDescription>
            Scheduled calls, meetings, and sales follow-up activities for {leadName}.
          </CardDescription>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLogCallDialogOpen(true)}
              className="h-8 text-xs"
            >
              <PhoneCall className="h-3.5 w-3.5 mr-1" /> Log Call
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedFollowUp(null);
                setScheduleDialogOpen(true);
              }}
              className="h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Follow-up
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <FollowUpList
          items={items}
          isLoading={isLoading}
          onComplete={(item) => {
            setSelectedFollowUp(item);
            setCompleteDialogOpen(true);
          }}
          onReschedule={(item) => {
            setSelectedFollowUp(item);
            setScheduleDialogOpen(true);
          }}
          onCancel={handleCancel}
          onScheduleNew={() => {
            setSelectedFollowUp(null);
            setScheduleDialogOpen(true);
          }}
          showEntityLink={false}
        />

        {/* Dialog Modals */}
        <FollowUpDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          initialData={selectedFollowUp}
          leadId={leadId}
          leadName={leadName}
          onSubmit={handleScheduleSubmit}
        />

        <CompleteFollowUpDialog
          open={completeDialogOpen}
          onOpenChange={setCompleteDialogOpen}
          followUp={selectedFollowUp}
          onSubmit={handleCompleteSubmit}
        />

        <LogCallDialog
          open={logCallDialogOpen}
          onOpenChange={setLogCallDialogOpen}
          leadId={leadId}
          leadName={leadName}
          currentUserId=""
          onSubmit={handleLogCallSubmit}
        />
      </CardContent>
    </Card>
  );
}
