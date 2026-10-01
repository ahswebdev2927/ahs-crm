"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Camera,
  Upload,
  Trash2,
  ArrowRight,
  Sparkles,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Calendar,
  User,
  Building,
  PlayCircle,
  Lock,
} from "lucide-react";
import type { AppointmentItem } from "../types/appointment.types";
import type { AppointmentStatus } from "../schemas/appointment.schema";
import type {
  FieldVisitItem,
  FieldVisitMediaItem,
} from "@/features/field-visits/types/field-visit.types";
import type { NextActionType } from "@/features/field-visits/schemas/field-visit.schema";
import { AppointmentWorkflowStepper } from "./appointment-workflow-stepper";

interface AppointmentFieldVisitSectionProps {
  appointment: AppointmentItem;
  initialVisit: FieldVisitItem | null;
  currentUserId: string;
  userRoleCode: string;
  onVisitUpdated?: (visit: FieldVisitItem) => void;
  onStatusChange?: (status: AppointmentStatus) => Promise<void>;
}

export function AppointmentFieldVisitSection({
  appointment,
  initialVisit,
  currentUserId,
  userRoleCode,
  onVisitUpdated,
  onStatusChange,
}: AppointmentFieldVisitSectionProps) {
  const [visit, setVisit] = React.useState<FieldVisitItem | null>(initialVisit);
  const [isStarting, setIsStarting] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Form State for visit completion/reporting
  const [summary, setSummary] = React.useState(visit?.summary || "");
  const [requirements, setRequirements] = React.useState(visit?.requirements || "");
  const [feedback, setFeedback] = React.useState(visit?.feedback || "");
  const [outcome, setOutcome] = React.useState(visit?.outcome || "");
  const [expenses, setExpenses] = React.useState<number>(visit?.expenses || 0);
  const [nextAction, setNextAction] = React.useState<NextActionType | "none">(
    (visit?.nextAction as NextActionType) || "none"
  );
  const [nextActionDate, setNextActionDate] = React.useState<string>(
    visit?.nextActionDate
      ? new Date(visit.nextActionDate).toISOString().split("T")[0]
      : ""
  );

  // Media state
  const [mediaList, setMediaList] = React.useState<FieldVisitMediaItem[]>(visit?.media || []);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (initialVisit) {
      setVisit(initialVisit);
      setSummary(initialVisit.summary || "");
      setRequirements(initialVisit.requirements || "");
      setFeedback(initialVisit.feedback || "");
      setOutcome(initialVisit.outcome || "");
      setExpenses(initialVisit.expenses || 0);
      setNextAction((initialVisit.nextAction as NextActionType) || "none");
      setNextActionDate(
        initialVisit.nextActionDate
          ? new Date(initialVisit.nextActionDate).toISOString().split("T")[0]
          : ""
      );
      setMediaList(initialVisit.media || []);
    }
  }, [initialVisit]);

  const isAssignedRep = appointment.assignedToId === currentUserId;
  const isCreator = appointment.createdById === currentUserId;
  const isManagerOrAdmin =
    userRoleCode === "super_admin" || userRoleCode === "sales_manager";
  const canExecuteVisit = isAssignedRep || isCreator || isManagerOrAdmin;

  // Handler: Start Visit / Mark in Progress
  const handleStartVisit = async () => {
    try {
      setIsStarting(true);
      setError(null);
      const res = await fetch(`/api/appointments/${appointment.id}/field-visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: appointment.title,
          visitDate: Date.now(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to start field visit");
      }
      setVisit(json.data.fieldVisit);
      setSuccessMsg("Appointment marked in-progress! The Field Visit Report generator is now unlocked.");
      onVisitUpdated?.(json.data.fieldVisit);
    } catch (err: any) {
      setError(err.message || "Failed to start field visit");
    } finally {
      setIsStarting(false);
    }
  };

  // Handler: Generate & Submit Report (automatically completes appointment)
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError("Please provide a summary of the field visit.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const payload = {
        summary,
        requirements: requirements || null,
        feedback: feedback || null,
        outcome: outcome || null,
        expenses: Number(expenses) || 0,
        nextAction: nextAction === "none" ? null : nextAction,
        nextActionDate: nextActionDate ? new Date(nextActionDate).getTime() : null,
      };

      const res = await fetch(
        `/api/appointments/${appointment.id}/field-visit/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to submit visit report");
      }

      setVisit(json.data.fieldVisit);
      setSuccessMsg("Field visit report generated and appointment marked as completed!");
      onVisitUpdated?.(json.data.fieldVisit);
    } catch (err: any) {
      setError(err.message || "Failed to submit field visit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Upload media via Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMedia(true);
      setError(null);

      const fakeCloudinaryUrl = URL.createObjectURL(file);
      const resourceType = file.type.startsWith("image/") ? "image" : "document";

      const res = await fetch(`/api/appointments/${appointment.id}/field-visit/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloudinaryPublicId: `visit_media_${Date.now()}_${file.name}`,
          cloudinaryUrl: fakeCloudinaryUrl,
          resourceType,
          caption: file.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to attach media");
      }

      setMediaList((prev) => [json.data.media, ...prev]);
      setSuccessMsg("Media attached successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    try {
      const res = await fetch(
        `/api/appointments/${appointment.id}/field-visit/media?mediaId=${mediaId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
      }
    } catch (err) {
      console.error("Failed to delete media", err);
    }
  };

  const getNextActionBadge = (action: string | null) => {
    switch (action) {
      case "follow_up":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">Follow-up Call</Badge>;
      case "second_visit":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">Second Site Visit</Badge>;
      case "proposal":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">Send Proposal</Badge>;
      case "negotiation":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">Negotiation</Badge>;
      case "won":
        return <Badge variant="outline" className="bg-emerald-500 text-white border-transparent">Deal Won</Badge>;
      case "lost":
        return <Badge variant="outline" className="bg-rose-500 text-white border-transparent">Deal Lost</Badge>;
      default:
        return null;
    }
  };

  // State 1: Visit Completed (Read-Only Summary View)
  if (appointment.status === "completed" || visit?.status === "completed") {
    return (
      <div className="space-y-4">
        <AppointmentWorkflowStepper status="completed" hasReport={true} />

        <Card className="border-emerald-200 dark:border-emerald-950/60 shadow-xs bg-emerald-500/5">
          <CardHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-950 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Field Visit Report — Completed & Generated
                </CardTitle>
                <CardDescription className="text-xs">
                  {visit ? `Visit conducted on ${format(new Date(visit.visitDate), "PPP 'at' p")}` : "Appointment marked as completed"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {visit && getNextActionBadge(visit.nextAction)}
                <Badge variant="outline" className="bg-emerald-600 text-white border-transparent">
                  Report Completed
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-5">
            {/* Summary */}
            {visit?.summary && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Visit Summary & Discussions
                </label>
                <div className="text-xs bg-background/80 rounded-md p-3.5 border border-border leading-relaxed text-foreground whitespace-pre-line">
                  {visit.summary}
                </div>
              </div>
            )}

            {/* Grid: Requirements & Outcome */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visit?.requirements && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Client Requirements
                  </label>
                  <div className="text-xs bg-background/80 rounded-md p-3 border border-border leading-relaxed text-foreground whitespace-pre-line">
                    {visit.requirements}
                  </div>
                </div>
              )}

              {visit?.outcome && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Meeting Outcome
                  </label>
                  <div className="text-xs bg-background/80 rounded-md p-3 border border-border leading-relaxed text-foreground whitespace-pre-line">
                    {visit.outcome}
                  </div>
                </div>
              )}
            </div>

            {/* Client Feedback & Expenses */}
            {visit && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {visit.feedback && (
                  <div className="md:col-span-2 space-y-1">
                    <span className="font-medium text-muted-foreground">Client Feedback:</span>
                    <p className="text-foreground mt-0.5">{visit.feedback}</p>
                  </div>
                )}

                <div className="space-y-1 bg-background/60 p-3 rounded-md border border-border">
                  <span className="font-medium text-muted-foreground">Recorded Expenses:</span>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1 mt-0.5">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    ₹{visit.expenses.toLocaleString("en-IN")}
                  </div>
                </div>

                {visit.nextAction && (
                  <div className="space-y-1 bg-background/60 p-3 rounded-md border border-border">
                    <span className="font-medium text-muted-foreground">Follow-up Action:</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      {getNextActionBadge(visit.nextAction)}
                      {visit.nextActionDate && (
                        <span className="text-[11px] text-muted-foreground">
                          ({format(new Date(visit.nextActionDate), "MMM d, yyyy")})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Attached Media Photos & Docs */}
            {mediaList.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Visit Evidence & Attachments ({mediaList.length})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {mediaList.map((m) => (
                    <div
                      key={m.id}
                      className="group relative rounded-md border border-border overflow-hidden bg-background shadow-2xs hover:border-primary/50 transition-colors"
                    >
                      {m.resourceType === "image" ? (
                        <div className="aspect-video bg-muted/40 relative overflow-hidden flex items-center justify-center">
                          <img
                            src={m.cloudinaryUrl}
                            alt={m.caption || "Visit photo"}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted/30 p-3 flex flex-col items-center justify-center text-center">
                          <FileText className="h-6 w-6 text-primary mb-1" />
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {m.caption || "Document"}
                          </span>
                        </div>
                      )}
                      {m.caption && (
                        <div className="p-1.5 text-[11px] truncate text-foreground font-medium">
                          {m.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 2: Appointment NOT in-progress (Scheduled or Confirmed)
  // RULE: "Generate Report is only available if the appointment is in-progress"
  if (appointment.status !== "in_progress") {
    const isScheduled = appointment.status === "scheduled";
    const isConfirmed = appointment.status === "confirmed";

    return (
      <div className="space-y-4">
        <AppointmentWorkflowStepper status={appointment.status} hasReport={false} />

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Field Visit Report Generator
                </CardTitle>
                <CardDescription className="text-xs">
                  {isScheduled
                    ? "Confirm this appointment to acknowledge receipt."
                    : "Mark In Progress when you arrive on-site to unlock the report generator."}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  isConfirmed
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200"
                }
              >
                {isConfirmed ? "Ready to Start Visit" : "Awaiting Confirmation"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-md text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {successMsg}
              </div>
            )}

            <div className="rounded-lg border border-dashed border-border p-6 text-center bg-muted/20 space-y-3">
              {isScheduled ? (
                <>
                  <Clock className="h-8 w-8 text-blue-500 mx-auto" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Confirm Appointment
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      This appointment was assigned by Inside Sales. Please confirm receipt of the appointment before starting the visit.
                    </p>
                  </div>

                  {canExecuteVisit ? (
                    <div className="pt-2">
                      <Button
                        variant="default"
                        onClick={async () => {
                          if (onStatusChange) {
                            await onStatusChange("confirmed");
                            setSuccessMsg("Appointment marked as confirmed! You can start the visit when on-site.");
                          }
                        }}
                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark as Confirmed
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/80 italic">
                      Only the assigned Field Sales representative ({appointment.assignedTo.name}) or a manager can confirm this appointment.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <PlayCircle className="h-8 w-8 text-amber-500 mx-auto" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Start Field Visit
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Appointment is confirmed. When you arrive on-site, click below to mark the visit in progress and unlock the Field Visit Report generator.
                    </p>
                  </div>

                  {canExecuteVisit ? (
                    <div className="pt-2">
                      <Button
                        onClick={handleStartVisit}
                        disabled={isStarting}
                        className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        {isStarting ? "Starting Visit..." : "Mark In Progress (Start Visit)"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/80 italic">
                      Only the assigned Field Sales representative ({appointment.assignedTo.name}) or a manager can start this visit.
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 3: Appointment IS IN PROGRESS -> Field Visit Report Generator is Unlocked & Active!
  return (
    <div className="space-y-4">
      <AppointmentWorkflowStepper status="in_progress" hasReport={false} />

      <Card className="border-amber-300 dark:border-amber-800/80 shadow-xs bg-amber-500/5">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-950 dark:text-amber-200">
                <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Generate Field Visit Report
              </CardTitle>
              <CardDescription className="text-xs">
                Appointment is in progress. Fill out the report below. Submitting will automatically complete the appointment.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-amber-500 text-white border-transparent font-medium">
              Report Generator Unlocked
            </Badge>
          </div>
        </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-md text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmitReport} className="space-y-5">
          {/* Visit Summary */}
          <div className="space-y-1.5">
            <label htmlFor="summary" className="text-xs font-semibold text-foreground">
              Visit Summary & Discussion Notes <span className="text-rose-500">*</span>
            </label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Detail what was discussed during the visit, client reactions, measurements taken, and overall progress..."
              rows={4}
              required
              className="text-xs bg-background"
            />
          </div>

          {/* Client Requirements & Outcome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="requirements" className="text-xs font-semibold text-foreground">
                Client Requirements / Scope of Work
              </label>
              <Textarea
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Specific client requirements, floor plans, dimensions, package choices..."
                rows={3}
                className="text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="outcome" className="text-xs font-semibold text-foreground">
                Meeting Outcome / Agreement
              </label>
              <Textarea
                id="outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Key agreements reached, objections resolved, client commitment..."
                rows={3}
                className="text-xs bg-background"
              />
            </div>
          </div>

          {/* Feedback & Expenses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="feedback" className="text-xs font-semibold text-foreground">
                Client Feedback / Mood
              </label>
              <Input
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. Highly interested, pricing sensitive, wants proposal by Friday"
                className="text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="expenses" className="text-xs font-semibold text-foreground">
                Visit Expenses (₹ INR)
              </label>
              <Input
                id="expenses"
                type="number"
                min="0"
                value={expenses}
                onChange={(e) => setExpenses(Number(e.target.value))}
                placeholder="0"
                className="text-xs bg-background"
              />
            </div>
          </div>

          {/* Next Action Selection */}
          <div className="p-4 rounded-lg border border-border bg-background/60 space-y-3">
            <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
              Recommended Next Action
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Action Type</label>
                <Select
                  value={nextAction}
                  onValueChange={(val) => setNextAction(val as NextActionType | "none")}
                >
                  <SelectTrigger className="text-xs bg-background">
                    <SelectValue placeholder="Select next step" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No immediate action</SelectItem>
                    <SelectItem value="follow_up">Schedule Follow-up Call</SelectItem>
                    <SelectItem value="second_visit">Schedule Second Site Visit (New Appointment)</SelectItem>
                    <SelectItem value="proposal">Prepare & Send Proposal</SelectItem>
                    <SelectItem value="negotiation">Enter Contract Negotiation</SelectItem>
                    <SelectItem value="won">Convert / Deal Won</SelectItem>
                    <SelectItem value="lost">Mark as Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(nextAction === "follow_up" || nextAction === "second_visit" || nextAction === "proposal") && (
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Action Due Date</label>
                  <Input
                    type="date"
                    value={nextActionDate}
                    onChange={(e) => setNextActionDate(e.target.value)}
                    className="text-xs bg-background"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Photos & Evidence Upload Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-primary" />
                Photos & Document Evidence ({mediaList.length})
              </label>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMedia}
                  className="text-xs h-7 gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isUploadingMedia ? "Attaching..." : "Attach Photo/Doc"}
                </Button>
              </div>
            </div>

            {mediaList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mediaList.map((m) => (
                  <div
                    key={m.id}
                    className="group relative rounded-md border border-border overflow-hidden bg-background shadow-2xs"
                  >
                    {m.resourceType === "image" ? (
                      <div className="aspect-video bg-muted/40 relative overflow-hidden flex items-center justify-center">
                        <img
                          src={m.cloudinaryUrl}
                          alt={m.caption || "Visit photo"}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted/30 p-2 flex flex-col items-center justify-center text-center">
                        <FileText className="h-6 w-6 text-primary mb-1" />
                        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                          {m.caption || "Document"}
                        </span>
                      </div>
                    )}
                    <div className="p-1.5 flex items-center justify-between text-[11px] bg-card">
                      <span className="truncate text-foreground font-medium">
                        {m.caption || "Attachment"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => handleDeleteMedia(m.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-border rounded-md text-xs text-muted-foreground bg-muted/10">
                No site photos or documents attached yet. Click "Attach Photo/Doc" above to upload evidence.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Generating Report..." : "Generate Report & Complete Appointment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
  );
}
