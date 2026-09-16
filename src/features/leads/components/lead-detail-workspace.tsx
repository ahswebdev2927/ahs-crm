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
} from "lucide-react";
import type { LeadDetail, LeadPriority } from "../types/lead.types";
import { LeadPartnershipSection } from "./partnership/lead-partnership-section";
import { LeadFollowUpsTab } from "@/features/followups/components/lead-followups-tab";

interface LeadDetailWorkspaceProps {
  lead: LeadDetail;
  currentUserId?: string;
  onEditLead: () => void;
  onAssignLead: () => void;
  onChangeStage: () => void;
}

export function LeadDetailWorkspace({
  lead,
  currentUserId,
  onEditLead,
  onAssignLead,
  onChangeStage,
}: LeadDetailWorkspaceProps) {
  // Edit permission check: User can edit ONLY if owner, creator, or active partner!
  const canUserEdit =
    !currentUserId ||
    lead.ownerId === currentUserId ||
    lead.createdById === currentUserId ||
    (lead.partners && lead.partners.some((p) => p.partnerId === currentUserId));

  const getPriorityBadge = (priority: LeadPriority) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive" className="bg-red-600 text-white">Critical Priority</Badge>;
      case "high":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">High Priority</Badge>;
      case "medium":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Medium Priority</Badge>;
      case "low":
      default:
        return <Badge variant="secondary">Low Priority</Badge>;
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

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {/* Top Header Navigation */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/sales/leads" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{lead.name}</h1>
            {!canUserEdit && (
              <Badge variant="outline" className="text-xs text-muted-foreground ml-2">
                <Lock className="h-3 w-3 mr-1" /> View Only
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground ml-10">
            {lead.company && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{lead.company}</span>
              </div>
            )}
            <span>•</span>
            <div className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              <span>Source: {lead.source || "Direct"}</span>
            </div>
            <span>•</span>
            <div>Created: {formatDate(lead.createdAt)}</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {canUserEdit ? (
            <>
              <Button variant="outline" size="sm" onClick={onEditLead} className="h-8 text-xs">
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Edit Lead
              </Button>
              <Button variant="outline" size="sm" onClick={onChangeStage} className="h-8 text-xs">
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                Change Stage
              </Button>
              <Button size="sm" onClick={onAssignLead} className="h-8 text-xs">
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                Reassign Owner
              </Button>
            </>
          ) : (
            <div className="text-xs text-muted-foreground italic flex items-center gap-1 border border-border px-3 py-1 rounded-lg bg-muted/20">
              <Lock className="h-3.5 w-3.5" /> Read-Only View (Owned by {lead.owner ? lead.owner.name : "another user"})
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Left 2 Columns: Main Tabs Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* Key Stage & Priority Header Card */}
          <Card className="border border-border shadow-xs bg-card">
            <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
              {/* Stage Pill */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Pipeline Stage</div>
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
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</div>
                <div>{getPriorityBadge(lead.priority)}</div>
              </div>

              {/* Lead Status */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</div>
                <Badge variant={lead.status === "active" ? "outline" : "secondary"} className="capitalize">
                  {lead.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Workspace Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-muted/40 p-1 border border-border rounded-xl">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Stage History ({lead.stageHistory.length})</TabsTrigger>
              <TabsTrigger value="activities" className="text-xs">Notes & Activities</TabsTrigger>
              <TabsTrigger value="partners" className="text-xs">Partners ({lead.partners.length})</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 pt-4">
              {/* Requirements & Description */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
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
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
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
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
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

            {/* TAB 3: ACTIVITIES & FOLLOW-UPS */}
            <TabsContent value="activities" className="pt-4">
              <LeadFollowUpsTab leadId={lead.id} leadName={lead.name} canEdit={canUserEdit} />
            </TabsContent>

            {/* TAB 4: PARTNERS */}
            <TabsContent value="partners" className="pt-4">
              <LeadPartnershipSection leadId={lead.id} leadOwner={lead.owner} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right 1 Column: Side Info Panel */}
        <div className="space-y-6">
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
              <CardTitle className="text-sm font-semibold">Ownership & Audit Metadata</CardTitle>
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

              {/* Creator */}
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
    </div>
  );
}
