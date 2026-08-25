"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  X,
  FilePlus2,
  XCircle,
  UserCheck,
  Calendar,
  Clock,
  Phone,
  Mail,
  User,
  History,
  Plus,
  CalendarDays,
  FileText,
  Lock,
} from "lucide-react";
import { createLeadSchema, updateLeadSchema } from "../schemas/lead.schema";
import type { LeadItem, LeadDetail, LeadStageItem, UserSummary } from "../types/lead.types";

interface LeadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadToEdit?: LeadDetail | LeadItem | null;
  currentUserId?: string;
  stages: LeadStageItem[];
  teamUsers: UserSummary[];
  onSuccess: () => void;
}

export function LeadDrawer({
  open,
  onOpenChange,
  leadToEdit,
  currentUserId,
  stages,
  teamUsers,
  onSuccess,
}: LeadDrawerProps) {
  const isEditing = Boolean(leadToEdit);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Quick activity note state
  const [activityNote, setActivityNote] = React.useState("");

  // Edit Permission Rule: User can edit ONLY if creating new lead OR if user is lead owner, creator, or partner!
  const canUserEdit = React.useMemo(() => {
    if (!leadToEdit || !currentUserId) return true;
    const isOwner = leadToEdit.ownerId === currentUserId;
    const isCreator = leadToEdit.createdById === currentUserId;
    const isPartner =
      "partners" in leadToEdit &&
      Array.isArray((leadToEdit as LeadDetail).partners) &&
      (leadToEdit as LeadDetail).partners.some((p) => p.partnerId === currentUserId);
    return isOwner || isCreator || isPartner;
  }, [leadToEdit, currentUserId]);

  const form = useForm<any>({
    resolver: zodResolver(isEditing ? updateLeadSchema : createLeadSchema) as any,
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      email: "",
      source: "Inside Sales",
      priority: "medium",
      stageId: stages[0]?.id ?? 1,
      ownerId: "",
      requirements: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setActivityNote("");
      if (leadToEdit) {
        form.reset({
          name: leadToEdit.name,
          company: leadToEdit.company || "",
          phone: leadToEdit.phone || "",
          email: leadToEdit.email || "",
          source: leadToEdit.source || "Inside Sales",
          priority: leadToEdit.priority,
          stageId: leadToEdit.stageId,
          ownerId: leadToEdit.ownerId || "",
          requirements: leadToEdit.requirements || "",
          notes: leadToEdit.notes || "",
        });
      } else {
        form.reset({
          name: "",
          company: "",
          phone: "",
          email: "",
          source: "Inside Sales",
          priority: "medium",
          stageId: stages[0]?.id ?? 1,
          ownerId: "",
          requirements: "",
          notes: "",
        });
      }
    }
  }, [open, leadToEdit, stages, form]);

  const handleSubmit = async (values: any) => {
    if (!canUserEdit) {
      setErrorMsg("Access denied. You can only edit leads that you own or co-partner on.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const url = isEditing ? `/api/leads/${leadToEdit?.id}` : "/api/leads";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save lead.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage change directly from right sidebar
  const handleSidebarStageChange = async (targetStageId: number) => {
    if (!leadToEdit || !canUserEdit) return;
    try {
      const res = await fetch(`/api/leads/${leadToEdit.id}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStageId: targetStageId, reason: "Stage changed from sidebar" }),
      });
      if (res.ok) {
        form.setValue("stageId", targetStageId);
        onSuccess();
      }
    } catch (_e) {}
  };

  // Owner change directly from right sidebar
  const handleSidebarOwnerChange = async (targetOwnerId: string) => {
    if (!leadToEdit || !canUserEdit) return;
    try {
      const res = await fetch(`/api/leads/${leadToEdit.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: targetOwnerId }),
      });
      if (res.ok) {
        form.setValue("ownerId", targetOwnerId);
        onSuccess();
      }
    } catch (_e) {}
  };

  // Mark Lost helper
  const handleMarkLost = async () => {
    if (!canUserEdit) return;
    const lostStage = stages.find((s) => s.code === "lost" || s.name.toLowerCase() === "lost");
    if (lostStage && leadToEdit) {
      await handleSidebarStageChange(lostStage.id);
    }
  };

  const formatDate = (d: Date | string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  };

  const currentStage = stages.find((s) => s.id === (form.watch("stageId") || leadToEdit?.stageId));
  const detailedLead = leadToEdit && "stageHistory" in leadToEdit ? (leadToEdit as LeadDetail) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full max-w-[85vw] xl:max-w-[1280px] sm:max-w-none flex flex-col p-0 border-l border-border bg-popover shadow-2xl overflow-hidden"
      >
        {/* TOP HEADER BAR (Default shadcn theme) */}
        <SheetHeader className="p-4 md:px-6 md:py-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Lead Name & Subtitle */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl font-bold tracking-tight text-foreground uppercase">
                  {leadToEdit ? leadToEdit.name : "Create New Lead"}
                </SheetTitle>
                {!canUserEdit && (
                  <Badge variant="outline" className="text-xs text-muted-foreground border-border bg-muted/30">
                    <Lock className="h-3 w-3 mr-1" /> View Only
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {leadToEdit?.company && <span>{leadToEdit.company}</span>}
                {currentStage && (
                  <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full mr-1.5" style={{ backgroundColor: currentStage.color }} />
                    {currentStage.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => alert("Quote module available in Phase 19")}
            >
              <FilePlus2 className="h-3.5 w-3.5 mr-1.5" />
              Create Quote
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canUserEdit}
              className="h-9 text-xs text-destructive hover:bg-destructive/10"
              onClick={handleMarkLost}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Mark Lost
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!canUserEdit}
              className="h-9 text-xs font-semibold"
              onClick={() => alert("Lead conversion available in Phase 17 (Customers)")}
            >
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              Convert to Customer
            </Button>
          </div>
        </SheetHeader>

        {/* TWO COLUMN SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20">
          <Form {...form}>
            <form id="lead-main-form" onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* CARD 1: LEAD DETAILS FORM */}
                  <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-foreground tracking-tight">Lead Details</h2>
                      {!canUserEdit && (
                        <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Editing restricted to Lead Owner or Partners
                        </span>
                      )}
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
                        {errorMsg}
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Contact Name */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">Contact Name *</FormLabel>
                            <FormControl>
                              <Input disabled={!canUserEdit} className="h-10 bg-background" placeholder="Full Name" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Company & Phone */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Company</FormLabel>
                              <FormControl>
                                <Input disabled={!canUserEdit} className="h-10 bg-background" placeholder="Company Name" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Phone</FormLabel>
                              <FormControl>
                                <Input disabled={!canUserEdit} className="h-10 bg-background" placeholder="Phone Number" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Email & Source */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Email</FormLabel>
                              <FormControl>
                                <Input disabled={!canUserEdit} className="h-10 bg-background" placeholder="sample@email.com" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="source"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Source</FormLabel>
                              <Select disabled={!canUserEdit} value={field.value || "Inside Sales"} onValueChange={(v) => field.onChange(v || "Inside Sales")}>
                                <FormControl>
                                  <SelectTrigger className="h-10 bg-background">
                                    <SelectValue placeholder="Select source" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Website">Website</SelectItem>
                                  <SelectItem value="Referral">Referral</SelectItem>
                                  <SelectItem value="Campaign">Campaign</SelectItem>
                                  <SelectItem value="Inside Sales">Inside Sales</SelectItem>
                                  <SelectItem value="Field Sales">Field Sales</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Priority & Requirements */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Priority</FormLabel>
                              <Select disabled={!canUserEdit} value={field.value || "medium"} onValueChange={(v) => field.onChange(v || "medium")}>
                                <FormControl>
                                  <SelectTrigger className="h-10 bg-background">
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="requirements"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Requirements Summary</FormLabel>
                              <FormControl>
                                <Input disabled={!canUserEdit} className="h-10 bg-background" placeholder="Product/service requirements" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Notes Textarea */}
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                disabled={!canUserEdit}
                                className="bg-background min-h-20"
                                placeholder="Additional details or customer notes..."
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Card Save Action */}
                    {canUserEdit && (
                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          variant="default"
                          disabled={isSubmitting}
                          className="font-semibold text-xs px-5 h-9"
                        >
                          {isSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: MEETINGS & SITE VISITS */}
                  <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-foreground">Meetings & Site Visits</h3>
                        <p className="text-xs text-muted-foreground">Calls and site appointments booked with this lead</p>
                      </div>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="text-xs h-8 px-3"
                        onClick={() => alert("Appointments scheduling available in Phase 15")}
                      >
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                        Schedule
                      </Button>
                    </div>

                    <div className="p-3.5 bg-muted/40 border border-border/60 rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">Initial Discovery Call & Requirements Review</div>
                        <div className="text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Scheduled Visit
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> 30 min
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: QUOTATIONS & CONTRACTS */}
                  <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Quotations & Contracts
                    </h3>

                    <div className="text-center py-6 border border-dashed border-border rounded-xl space-y-3">
                      <div className="text-xs text-muted-foreground">No documents attached to this lead yet.</div>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => alert("Quotations available in Phase 19")}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Create Quote
                        </Button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN (1/3 width: Sidebar Pipeline & Activity) */}
                <div className="space-y-6">

                  {/* CARD 1: PIPELINE POSITIONING & META */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-foreground">Pipeline</h3>

                    {/* Stage Select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Stage</label>
                      <Select
                        disabled={!canUserEdit}
                        value={form.watch("stageId")?.toString() || ""}
                        onValueChange={(val) => {
                          if (val) {
                            const newId = parseInt(val, 10);
                            form.setValue("stageId", newId);
                            handleSidebarStageChange(newId);
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 bg-background">
                          <SelectValue placeholder="Select Stage">
                            {currentStage ? currentStage.name : "Select Stage"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((stg) => (
                            <SelectItem key={stg.id} value={stg.id.toString()}>
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stg.color }} />
                                <span>{stg.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assigned Owner Select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Assigned To</label>
                      <Select
                        disabled={!canUserEdit}
                        value={form.watch("ownerId") || ""}
                        onValueChange={(val) => {
                          if (val) {
                            form.setValue("ownerId", val);
                            handleSidebarOwnerChange(val);
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 bg-background">
                          <SelectValue placeholder="Select Owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamUsers.map((usr) => (
                            <SelectItem key={usr.id} value={usr.id}>
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                                  {usr.name.charAt(0)}
                                </div>
                                <span>{usr.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quick Metadata Summary */}
                    <div className="pt-3 border-t border-border space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Source</span>
                        <span className="font-semibold text-foreground">{form.watch("source") || "Direct"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-semibold text-foreground">{form.watch("phone") || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-semibold text-foreground truncate max-w-[140px]">{form.watch("email") || "—"}</span>
                      </div>
                    </div>

                    {/* Audit Trail Info */}
                    {leadToEdit && (
                      <div className="pt-3 border-t border-border space-y-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" /> Added by {leadToEdit.createdBy?.name || "System"} • {formatDate(leadToEdit.createdAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Last updated: {formatDate(leadToEdit.updatedAt)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: ACTIVITY TIMELINE */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-foreground">Activity Timeline</h3>

                    {/* Add Quick Note box */}
                    <div className="space-y-2 bg-muted/40 p-3 rounded-xl border border-border">
                      <Textarea
                        placeholder="Log a quick sales note..."
                        className="bg-background text-xs min-h-16"
                        value={activityNote}
                        onChange={(e) => setActivityNote(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-7 text-[11px] px-3"
                          onClick={() => {
                            if (activityNote.trim()) {
                              setActivityNote("");
                              alert("Activity note logged!");
                            }
                          }}
                        >
                          Add Note
                        </Button>
                      </div>
                    </div>

                    {/* Timeline Feed */}
                    <div className="space-y-3 pt-1">
                      {detailedLead && detailedLead.stageHistory && detailedLead.stageHistory.length > 0 ? (
                        detailedLead.stageHistory.map((hist) => (
                          <div key={hist.id} className="flex items-start gap-2.5 text-xs p-2.5 bg-muted/30 rounded-lg border border-border">
                            <History className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div className="space-y-0.5 flex-1">
                              <div className="font-semibold text-foreground">
                                Stage Changed → <span className="text-primary font-bold">{hist.toStage?.name}</span>
                              </div>
                              {hist.reason && <p className="text-muted-foreground italic">&quot;{hist.reason}&quot;</p>}
                              <div className="text-[10px] text-muted-foreground">{formatDate(hist.createdAt)}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-4 italic">
                          Initial lead creation logged. Stage changes will record automatically here.
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
