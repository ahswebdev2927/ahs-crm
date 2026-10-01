"use client";

import * as React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Plus, CheckCircle2, Eye, Calendar, DollarSign } from "lucide-react";
import { getFieldVisitStatusBadge, formatNextActionBadge } from "./field-visit-table";
import { CompleteFieldVisitDialog } from "./complete-field-visit-dialog";
import { FieldVisitDetailDialog } from "./field-visit-detail-dialog";
import { CreateFieldVisitDialog } from "./create-field-visit-dialog";
import type { FieldVisitItem } from "../types/field-visit.types";
import type { FieldSalesUserOption } from "./field-visit-filters";

interface LeadFieldVisitsTabProps {
  leadId: string;
  fieldSalesUsers?: FieldSalesUserOption[];
}

export function LeadFieldVisitsTab({ leadId, fieldSalesUsers = [] }: LeadFieldVisitsTabProps) {
  const [visits, setVisits] = React.useState<FieldVisitItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedVisit, setSelectedVisit] = React.useState<FieldVisitItem | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);

  const fetchVisits = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/field-visits?leadId=${leadId}&limit=50`);
      const json = await res.json();
      if (json.success) {
        setVisits(json.data.items || []);
      }
    } catch (err) {
      console.error("Failed to load lead field visits:", err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  React.useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Site & Field Visits</h3>
          <p className="text-xs text-muted-foreground">
            History of site visits, completed visit reports, and recommendations.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Schedule Visit
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground text-xs">Loading field visits...</div>
      ) : visits.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg bg-card p-6">
          <MapPin className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
          <h4 className="font-semibold text-foreground text-xs">No field visits recorded</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Schedule a site visit to dispatch a Field Sales agent.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => {
            const visitDateObj = new Date(visit.visitDate);
            const formattedDate = format(visitDateObj, "EEE, MMM d, yyyy");
            const formattedTime = format(visitDateObj, "h:mm a");

            return (
              <Card key={visit.id} className="bg-card border-border shadow-2xs">
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{visit.purpose}</h4>
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-0.5">
                        <Calendar className="h-3 w-3 text-blue-500" />
                        <span>{formattedDate} at {formattedTime}</span>
                        <span>•</span>
                        <span>Rep: {visit.assignedTo?.name || "Field Agent"}</span>
                      </div>
                    </div>
                    {getFieldVisitStatusBadge(visit.status)}
                  </div>

                  {visit.status === "completed" && visit.summary && (
                    <div className="text-xs bg-muted/40 p-2.5 rounded-md text-foreground">
                      <div className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">
                        Summary
                      </div>
                      <p className="line-clamp-2">{visit.summary}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-[11px]">Next:</span>
                      {formatNextActionBadge(visit.nextAction)}
                    </div>

                    <div className="flex items-center gap-2">
                      {visit.expenses > 0 && (
                        <div className="flex items-center gap-0.5 font-medium text-purple-600 dark:text-purple-400 mr-2">
                          <DollarSign className="h-3 w-3" />
                          <span>{(visit.expenses / 100).toFixed(2)}</span>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedVisit(visit);
                          setDetailOpen(true);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 text-blue-500" />
                        Details
                      </Button>

                      {visit.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVisit(visit);
                            setCompleteOpen(true);
                          }}
                          className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Complete Report
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateFieldVisitDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        fieldSalesUsers={fieldSalesUsers}
        defaultLeadId={leadId}
        onSuccess={fetchVisits}
      />

      <CompleteFieldVisitDialog
        visit={selectedVisit}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        onSuccess={fetchVisits}
      />

      <FieldVisitDetailDialog
        visit={selectedVisit}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCompleteClick={(v) => {
          setSelectedVisit(v);
          setCompleteOpen(true);
        }}
      />
    </div>
  );
}
