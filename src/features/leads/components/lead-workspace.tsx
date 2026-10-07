"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  UserCheck,
  ArrowRightLeft,
  Building2,
  Phone,
  Mail,
  Calendar,
  User,
  History,
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Briefcase,
  Users,
  Lock,
  ExternalLink,
  X,
  Loader2,
  AlertTriangle,
  Activity,
  CalendarDays,
  PhoneCall,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadDetail, LeadPriority, LeadStageItem, UserSummary } from "../types/lead.types";
import { LeadPartnershipSection } from "./partnership/lead-partnership-section";
import { LeadFollowUpsTab } from "@/features/followups/components/lead-followups-tab";
import { LeadAppointmentsTab } from "@/features/appointments/components/lead-appointments-tab";
import { LeadActivityTimeline } from "./lead-activity-timeline";
import { LeadDialog } from "./lead-dialog";
import { LeadStageDialog } from "./lead-stage-dialog";
import { LeadAssignDialog } from "./lead-assign-dialog";

export interface LeadWorkspaceProps {
  leadId: string;
  mode?: "page" | "drawer";
  onClose?: () => void;
  onLeadUpdated?: () => void;
  className?: string;
}

export function LeadWorkspace({
  leadId,
  mode = "page",
  onClose,
  onLeadUpdated,
  className,
}: LeadWorkspaceProps) {
  const [lead, setLead] = React.useState<LeadDetail | null>(null);
  const [stages, setStages] = React.useState<LeadStageItem[]>([]);
  const [teamUsers, setTeamUsers] = React.useState<UserSummary[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Mutation Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState<boolean>(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState<boolean>(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = React.useState<boolean>(false);

  // Fetch session user
  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.user?.id) {
          setCurrentUserId(data.data.user.id);
        }
      })
      .catch(() => {});
  }, []);

  const fetchLeadDetails = React.useCallback(async () => {
    if (!leadId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load lead details.");
      }
      setLead(data.data.lead);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred loading lead workspace.");
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  const fetchStages = React.useCallback(async () => {
    try {
      const res = await fetch("/api/leads/stages");
      const data = await res.json();
      if (res.ok && data?.data?.stages) {
        setStages(data.data.stages);
      }
    } catch (_err) {}
  }, []);

  const fetchTeamUsers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/team?limit=100");
      const data = await res.json();
      if (res.ok && data?.data?.items) {
        setTeamUsers(data.data.items);
      }
    } catch (_err) {}
  }, []);

  React.useEffect(() => {
    fetchLeadDetails();
    fetchStages();
    fetchTeamUsers();
  }, [fetchLeadDetails, fetchStages, fetchTeamUsers]);

  const handleMutationSuccess = React.useCallback(() => {
    fetchLeadDetails();
    onLeadUpdated?.();
  }, [fetchLeadDetails, onLeadUpdated]);

  // Edit permission check: User can edit ONLY if owner, creator, or active partner
  const canUserEdit = React.useMemo(() => {
    if (!lead || !currentUserId) return true;
    const isOwner = lead.ownerId === currentUserId;
    const isCreator = lead.createdById === currentUserId;
    const isPartner =
      lead.partners &&
      Array.isArray(lead.partners) &&
      lead.partners.some((p) => p.partnerId === currentUserId);
    return isOwner || isCreator || isPartner;
  }, [lead, currentUserId]);

  const getPriorityBadge = (priority: LeadPriority) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive" className="bg-red-600 text-white font-medium">Critical</Badge>;
      case "high":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium">High</Badge>;
      case "medium":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-medium">Medium</Badge>;
      case "low":
      default:
        return <Badge variant="secondary" className="font-medium">Low</Badge>;
    }
  };

  const formatDate = (dateInput: Date | string | null) => {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-[50vh] space-y-3 p-8", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading Lead Workspace...</p>
      </div>
    );
  }

  if (errorMsg || !lead) {
    return (
      <div className={cn("p-6 max-w-4xl mx-auto w-full", className)}>
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4 shadow-xs">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Lead Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {errorMsg || "The lead record you requested could not be found or you may not have authorization to view it."}
          </p>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose} className="mt-2">
              Close Workspace
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isDrawer = mode === "drawer";

  return (
    <div className={cn("space-y-4 sm:space-y-5 pb-8 w-full", className)}>
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-border pb-4 sticky top-0 bg-background/95 backdrop-blur-xs z-10">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {mode === "page" ? (
              <Link
                href="/sales/leads"
                className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Back to Leads list"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : null}

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {lead.name}
            </h1>

            {!canUserEdit && (
              <Badge variant="outline" className="text-xs text-muted-foreground ml-1 shrink-0">
                <Lock className="h-3 w-3 mr-1" /> View Only
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {lead.company && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{lead.company}</span>
              </div>
            )}
            {lead.company && <span>•</span>}
            <div className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              <span>Source: {lead.source || "Direct"}</span>
            </div>
            <span>•</span>
            <div>Created: {formatDate(lead.createdAt)}</div>
          </div>
        </div>

        {/* Action Controls & Window Navigation */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          {canUserEdit ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="h-8 text-xs cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Edit Lead
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStageDialogOpen(true)}
                className="h-8 text-xs cursor-pointer"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                Change Stage
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAssignDialogOpen(true)}
                className="h-8 text-xs cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                Reassign Owner
              </Button>
            </>
          ) : (
            <div className="text-xs text-muted-foreground italic flex items-center gap-1 border border-border px-2.5 py-1 rounded-lg bg-muted/20">
              <Lock className="h-3.5 w-3.5" /> Read-Only
            </div>
          )}

          {/* Drawer Specific Navigation Actions */}
          {isDrawer && (
            <div className="flex items-center gap-1 pl-1 border-l border-border/80 ml-1">
              <Link
                href={`/sales/leads/${lead.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-2.5 py-1 rounded-md transition-colors border border-border/60"
                title="Open this lead in full page view"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open Full Page</span>
              </Link>

              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Close lead drawer"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className={cn("grid grid-cols-1 gap-4 lg:gap-5", isDrawer ? "xl:grid-cols-3" : "lg:grid-cols-3")}>
        {/* Left Column: Stage Strip + Workspace Tabs */}
        <div className={cn("space-y-4 sm:space-y-5", isDrawer ? "xl:col-span-2" : "lg:col-span-2")}>
          {/* Key Stage & Priority Header Card */}
          <Card className="border border-border shadow-xs bg-card">
            <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              {/* Stage Pill */}
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Current Pipeline Stage
                </div>
                {lead.stage ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border border-border/80 bg-muted/40">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: lead.stage.color }} />
                    <span>{lead.stage.name}</span>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">—</span>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Priority
                </div>
                <div>{getPriorityBadge(lead.priority)}</div>
              </div>

              {/* Lead Status */}
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </div>
                <Badge variant={lead.status === "active" ? "outline" : "secondary"} className="capitalize">
                  {lead.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Unified Workspace Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full bg-muted/40 p-1 border border-border rounded-xl h-auto">
              <TabsTrigger value="overview" className="text-xs py-1.5">Overview</TabsTrigger>
              <TabsTrigger value="history" className="text-xs py-1.5">
                History ({lead.stageHistory.length})
              </TabsTrigger>
              <TabsTrigger value="followups" className="text-xs py-1.5">Follow-ups</TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs py-1.5">Appointments</TabsTrigger>
              <TabsTrigger value="partners" className="text-xs py-1.5">
                Partners ({lead.partners.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs py-1.5">Activities</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 pt-4">
              {/* Requirements & Description */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Customer Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                  {lead.requirements || (
                    <span className="text-muted-foreground italic">No specific requirements noted yet.</span>
                  )}
                </CardContent>
              </Card>

              {/* Internal Notes */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Internal Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                  {lead.notes || <span className="text-muted-foreground italic">No internal notes added.</span>}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: STAGE HISTORY */}
            <TabsContent value="history" className="pt-4">
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Pipeline Transition Timeline
                  </CardTitle>
                  <CardDescription>Auditable log of stage movements for this deal.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {lead.stageHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-6">
                      No stage transitions recorded yet. The lead is in its initial stage.
                    </p>
                  ) : (
                    <div className="relative border-l-2 border-border ml-3 space-y-6 py-2">
                      {lead.stageHistory.map((item) => (
                        <div key={item.id} className="relative pl-6">
                          <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          </div>

                          <div className="space-y-1 bg-muted/20 p-3.5 rounded-lg border border-border">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 font-semibold">
                                <span>{item.fromStage ? item.fromStage.name : "Initial Creation"}</span>
                                <span>→</span>
                                <span className="text-primary font-bold">{item.toStage ? item.toStage.name : "Next Stage"}</span>
                              </div>
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(item.createdAt)}
                              </span>
                            </div>

                            {item.reason && (
                              <p className="text-xs text-foreground/80 mt-1 italic">
                                &quot;{item.reason}&quot;
                              </p>
                            )}

                            {item.changedBy && (
                              <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>Changed by {item.changedBy.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: FOLLOW-UPS */}
            <TabsContent value="followups" className="pt-4">
              <LeadFollowUpsTab leadId={lead.id} leadName={lead.name} canEdit={canUserEdit} />
            </TabsContent>

            {/* TAB 4: APPOINTMENTS */}
            <TabsContent value="appointments" className="pt-4">
              <LeadAppointmentsTab leadId={lead.id} leadName={lead.name} fieldSalesUsers={[]} />
            </TabsContent>

            {/* TAB 5: PARTNERS */}
            <TabsContent value="partners" className="pt-4">
              <LeadPartnershipSection leadId={lead.id} leadOwner={lead.owner} />
            </TabsContent>

            {/* TAB 6: ACTIVITY TIMELINE */}
            <TabsContent value="timeline" className="pt-4">
              <LeadActivityTimeline
                leadId={lead.id}
                activities={lead.activities || []}
                stageHistory={lead.stageHistory || []}
                canUserEdit={canUserEdit}
                onActivityAdded={handleMutationSuccess}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Side Info Panel */}
        <div className="space-y-4 sm:space-y-6">
          {/* Contact Details Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-muted-foreground">Phone</div>
                  <div className="font-semibold text-foreground">{lead.phone || "Not provided"}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="overflow-hidden">
                  <div className="font-medium text-muted-foreground">Email</div>
                  <div className="font-semibold text-foreground truncate">{lead.email || "Not provided"}</div>
                </div>
              </div>

              {lead.company && (
                <div className="flex items-start gap-2.5">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-muted-foreground">Company</div>
                    <div className="font-semibold text-foreground">{lead.company}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ownership & System Info Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Ownership & Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Owner */}
              <div className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg border border-border">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                  {lead.owner ? lead.owner.name.charAt(0) : "U"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Assigned Owner</div>
                  <div className="font-bold text-foreground truncate">{lead.owner ? lead.owner.name : "Unassigned"}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{lead.owner?.email}</div>
                </div>
              </div>

              {/* Creator & Timestamps */}
              <div className="space-y-2 pt-1 border-t border-border">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Created By:
                  </span>
                  <span className="font-medium text-foreground">{lead.createdBy ? lead.createdBy.name : "System"}</span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Created On:
                  </span>
                  <span className="font-medium text-foreground">{formatDate(lead.createdAt)}</span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Lead ID:
                  </span>
                  <span className="font-mono text-[10px] text-foreground">{lead.id.substring(0, 8)}...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Internal Modals for Mutations */}
      <React.Fragment>
        <LeadDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          leadToEdit={lead}
          stages={stages}
          teamUsers={teamUsers}
          onSuccess={handleMutationSuccess}
        />

        <LeadStageDialog
          open={isStageDialogOpen}
          onOpenChange={setIsStageDialogOpen}
          lead={lead}
          stages={stages}
          onSuccess={handleMutationSuccess}
        />

        <LeadAssignDialog
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          lead={lead}
          teamUsers={teamUsers}
          onSuccess={handleMutationSuccess}
        />
      </React.Fragment>
    </div>
  );
}
