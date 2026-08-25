"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  MoreVertical,
  Edit2,
  UserMinus,
  Percent,
  Clock,
  User,
  History,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  PieChart,
} from "lucide-react";
import type { LeadPartnershipSummary, LeadPartnerItem, UserSummary } from "../../types/lead.types";
import { LeadPartnerAddDialog } from "./lead-partner-add-dialog";
import { LeadPartnerEditDialog } from "./lead-partner-edit-dialog";
import { LeadPartnerRemoveDialog } from "./lead-partner-remove-dialog";

interface LeadPartnershipSectionProps {
  leadId: string;
  leadOwner?: UserSummary | null;
}

export function LeadPartnershipSection({
  leadId,
  leadOwner,
}: LeadPartnershipSectionProps) {
  const [summary, setSummary] = React.useState<LeadPartnershipSummary | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog States
  const [addOpen, setAddOpen] = React.useState<boolean>(false);
  const [editOpen, setEditOpen] = React.useState<boolean>(false);
  const [removeOpen, setRemoveOpen] = React.useState<boolean>(false);

  const [selectedPartner, setSelectedPartner] = React.useState<LeadPartnerItem | null>(null);
  const [showHistory, setShowHistory] = React.useState<boolean>(false);

  const fetchPartnershipData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/partners`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load partnership data.");
      }
      setSummary(json.data.partnershipSummary);
    } catch (err: any) {
      setError(err.message || "Failed to load lead partners.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  React.useEffect(() => {
    fetchPartnershipData();
  }, [fetchPartnershipData]);

  const formatDate = (dateInput: Date | string | null) => {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRoleBadge = (roleCode: string) => {
    switch (roleCode) {
      case "co_owner":
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-[10px]">Co-Owner</Badge>;
      case "referral":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]">Referral Sales</Badge>;
      case "technical_sales":
        return <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px]">Technical Sales</Badge>;
      case "collaborator":
      default:
        return <Badge variant="outline" className="text-[10px]">Collaborator</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="border-border shadow-xs">
        <CardContent className="flex items-center justify-center py-12 text-xs text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
          Loading partnership details...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border shadow-xs">
        <CardContent className="flex items-center gap-2 p-6 text-xs text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <Button variant="link" size="sm" onClick={fetchPartnershipData} className="ml-auto text-xs">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activePartners = summary?.activePartners || [];
  const historicalPartners = summary?.historicalPartners || [];
  const totalPartnerPercentage = summary?.totalPartnerPercentage || 0;
  const availablePercentage = summary?.availablePercentage ?? 100;
  const ownerPercentage = summary?.ownerPercentage ?? 100;

  const existingPartnerUserIds = activePartners.map((p) => p.partnerId);

  return (
    <div className="space-y-6">
      {/* Overview & Distribution Card */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Partnership & Revenue Split Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Visual breakdown of primary ownership and collaborative partner shares.
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="h-8 text-xs font-medium"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Add Partner
          </Button>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          {/* Progress Bar Split */}
          <div className="space-y-2">
            <div className="h-3.5 w-full bg-muted/60 rounded-full overflow-hidden flex p-0.5 border border-border">
              {/* Primary Owner Segment */}
              <div
                className="bg-primary h-full rounded-l-full transition-all duration-300 relative group"
                style={{ width: `${ownerPercentage}%` }}
                title={`Lead Owner (${ownerPercentage}%)`}
              />
              {/* Active Partners Segments */}
              {activePartners.map((p, idx) => (
                <div
                  key={p.id}
                  className={`h-full transition-all duration-300 ${
                    idx % 3 === 0
                      ? "bg-purple-500"
                      : idx % 3 === 1
                      ? "bg-amber-500"
                      : "bg-cyan-500"
                  }`}
                  style={{ width: `${p.percentage}%` }}
                  title={`${p.partner?.name || "Partner"} (${p.percentage}%)`}
                />
              ))}
            </div>

            {/* Distribution Legend Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Owner ({leadOwner?.name || "Primary"}):</span>
                <span className="font-semibold text-foreground">{ownerPercentage}%</span>
              </div>

              {activePartners.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      idx % 3 === 0
                        ? "bg-purple-500"
                        : idx % 3 === 1
                        ? "bg-amber-500"
                        : "bg-cyan-500"
                    }`}
                  />
                  <span className="text-muted-foreground">{p.partner?.name || "Partner"}:</span>
                  <span className="font-semibold text-foreground">{p.percentage}%</span>
                </div>
              ))}

              <div className="ml-auto text-[11px] text-muted-foreground">
                Total Allocated: <strong className="text-foreground">{100 - availablePercentage}%</strong> / Available: <strong className="text-foreground">{availablePercentage}%</strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Partners List Card */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Active Collaborative Partners ({activePartners.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          {activePartners.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-muted/20 space-y-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">No Partners Assigned</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Add sales team members to collaborate on this lead and distribute deal ownership shares.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="h-8 text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add First Partner
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {activePartners.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                      {p.partner?.name.charAt(0) || "P"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{p.partner?.name}</span>
                        {getRoleBadge(p.role)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.partner?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                    {/* Share % Pill */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background border border-border text-xs font-bold text-foreground">
                      <Percent className="h-3 w-3 text-primary" />
                      <span>{p.percentage}% Share</span>
                    </div>

                    {/* Added By & Date Metadata */}
                    <div className="text-[11px] text-muted-foreground text-right hidden md:block">
                      <div>Added {formatDate(p.createdAt)}</div>
                      {p.addedBy && <div>By {p.addedBy.name}</div>}
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:bg-accent hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPartner(p);
                            setEditOpen(true);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                          Edit Role & Percentage
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPartner(p);
                            setRemoveOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserMinus className="h-3.5 w-3.5 mr-2" />
                          Remove Partner
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical / Removed Partners Card */}
      {historicalPartners.length > 0 && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setShowHistory(!showHistory)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground">
                <History className="h-4 w-4" />
                Partnership History & Removed Partners ({historicalPartners.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>

          {showHistory && (
            <CardContent className="pt-0 space-y-2.5">
              {historicalPartners.map((hp) => (
                <div
                  key={hp.id}
                  className="p-3 bg-muted/10 rounded-lg border border-border/70 text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <span>{hp.partner?.name || "Previous Partner"}</span>
                      <span className="text-muted-foreground">({hp.percentage}% former share)</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Removed {formatDate(hp.removedAt)}
                    </span>
                  </div>

                  {hp.removalReason && (
                    <p className="text-[11px] text-muted-foreground italic">
                      &quot;{hp.removalReason}&quot;
                    </p>
                  )}

                  {hp.removedBy && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Removed by {hp.removedBy.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Dialog Modals */}
      <LeadPartnerAddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        leadId={leadId}
        availablePercentage={availablePercentage}
        existingPartnerUserIds={existingPartnerUserIds}
        ownerUserId={leadOwner?.id}
        onPartnerAdded={fetchPartnershipData}
      />

      <LeadPartnerEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        leadId={leadId}
        partner={selectedPartner}
        maxAvailablePercentage={availablePercentage + (selectedPartner?.percentage || 0)}
        onPartnerUpdated={fetchPartnershipData}
      />

      <LeadPartnerRemoveDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        leadId={leadId}
        partner={selectedPartner}
        onPartnerRemoved={fetchPartnershipData}
      />
    </div>
  );
}
