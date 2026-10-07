"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  Eye,
  Edit,
  UserCheck,
  ArrowRightLeft,
  Archive,
  Phone,
  Mail,
  Building2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Lock,
} from "lucide-react";
import type { LeadItem, LeadPriority } from "../types/lead.types";

interface LeadTableProps {
  leads: LeadItem[];
  isLoading: boolean;
  currentUserId?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onViewLead?: (lead: LeadItem) => void;
  onEditLead: (lead: LeadItem) => void;
  onAssignLead: (lead: LeadItem) => void;
  onChangeStage: (lead: LeadItem) => void;
  onArchiveLead: (lead: LeadItem) => void;
}

export function LeadTable({
  leads,
  isLoading,
  currentUserId,
  pagination,
  onPageChange,
  onLimitChange,
  onViewLead,
  onEditLead,
  onAssignLead,
  onChangeStage,
  onArchiveLead,
}: LeadTableProps) {
  const router = useRouter();

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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50/50">
              <TableHead className="w-[240px]">Lead / Company</TableHead>
              <TableHead className="w-[220px]">Contact Information</TableHead>
              <TableHead className="w-[120px]">Source</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[160px]">Stage</TableHead>
              <TableHead className="w-[150px]">Owner</TableHead>
              <TableHead className="w-[120px]">Created Date</TableHead>
              <TableHead className="w-[70px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-36 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <Inbox className="h-10 w-10 text-muted-foreground/60 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-foreground">No leads found</p>
                    <p className="text-xs max-w-sm">
                      No leads matched your current filters or search criteria. Try adjusting filters or create a new lead.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                // Edit permission rule: User can edit ONLY if owner, creator, or active partner!
                const canUserEdit =
                  !currentUserId ||
                  lead.ownerId === currentUserId ||
                  lead.createdById === currentUserId ||
                  (lead.partners && lead.partners.some((p) => p.partnerId === currentUserId));

                return (
                  <TableRow key={lead.id} className="group hover:bg-muted/40 transition-colors">
                    {/* Lead / Company */}
                    <TableCell className="font-medium">
                      <div className="space-y-0.5">
                        {onViewLead ? (
                          <button
                            type="button"
                            onClick={() => onViewLead(lead)}
                            className="text-sm font-semibold hover:text-primary transition-colors line-clamp-1 text-left cursor-pointer"
                          >
                            {lead.name}
                          </button>
                        ) : (
                          <Link
                            href={`/sales/leads/${lead.id}`}
                            className="text-sm font-semibold hover:text-primary transition-colors line-clamp-1"
                          >
                            {lead.name}
                          </Link>
                        )}
                        {lead.company && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.company}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Contact Info */}
                    <TableCell className="text-xs space-y-1">
                      {lead.phone ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      ) : null}
                      {lead.email ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      ) : null}
                      {!lead.phone && !lead.email && <span className="text-muted-foreground/60">—</span>}
                    </TableCell>

                    {/* Source */}
                    <TableCell className="text-xs text-muted-foreground">
                      {lead.source || "Direct"}
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      {getPriorityBadge(lead.priority)}
                    </TableCell>

                    {/* Stage */}
                    <TableCell>
                      {lead.stage ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border/60 bg-muted/30">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: lead.stage.color }}
                          />
                          <span className="truncate">{lead.stage.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Owner */}
                    <TableCell className="text-xs">
                      {lead.owner ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-[10px]">
                            {lead.owner.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground truncate">{lead.owner.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/70 italic">Unassigned</span>
                      )}
                    </TableCell>

                    {/* Created Date */}
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </TableCell>

                    {/* Actions Dropdown */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => {
                              if (onViewLead) {
                                onViewLead(lead);
                              } else {
                                router.push(`/sales/leads/${lead.id}`);
                              }
                            }}
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                            View Workspace
                          </DropdownMenuItem>

                          {canUserEdit ? (
                            <>
                              <DropdownMenuItem onClick={() => onEditLead(lead)} className="cursor-pointer">
                                <Edit className="h-4 w-4 mr-2 text-muted-foreground" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onChangeStage(lead)} className="cursor-pointer">
                                <ArrowRightLeft className="h-4 w-4 mr-2 text-muted-foreground" />
                                Change Stage
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onAssignLead(lead)} className="cursor-pointer">
                                <UserCheck className="h-4 w-4 mr-2 text-muted-foreground" />
                                Reassign Owner
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onArchiveLead(lead)}
                                className="cursor-pointer text-amber-600 dark:text-amber-400"
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive Lead
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem disabled className="text-xs text-muted-foreground italic">
                              <Lock className="h-3.5 w-3.5 mr-2" />
                              View Only (Not Owner/Partner)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer with Per Page Limit Selector */}
      {!isLoading && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{pagination.total}</span> leads
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Limit Selector Dropdown (10, 25, 50, 75, 100) */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0">Show</span>
              <Select
                value={pagination.limit.toString()}
                onValueChange={(val) => onLimitChange(Number(val))}
              >
                <SelectTrigger className="h-8 w-[110px] text-xs bg-background">
                  <SelectValue placeholder="10 / page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="75">75 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="h-8 text-xs px-2.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <span className="px-2 text-xs font-medium text-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="h-8 text-xs px-2.5"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
