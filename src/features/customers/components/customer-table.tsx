"use client";

import * as React from "react";
import Link from "next/link";
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
  Phone,
  Mail,
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Sparkles,
  Link as LinkIcon,
  CalendarPlus,
  PhoneCall,
  User,
} from "lucide-react";
import type { CustomerItem } from "../types/customer.types";

interface CustomerTableProps {
  customers: CustomerItem[];
  isLoading: boolean;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onEditCustomer: (customer: CustomerItem) => void;
  onScheduleAppointment?: (customer: CustomerItem) => void;
  onScheduleFollowUp?: (customer: CustomerItem) => void;
}

export function CustomerTable({
  customers,
  isLoading,
  pagination,
  onPageChange,
  onLimitChange,
  onEditCustomer,
  onScheduleAppointment,
  onScheduleFollowUp,
}: CustomerTableProps) {
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
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px] font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                Customer Account
              </TableHead>
              <TableHead className="w-[180px] font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                Contact Details
              </TableHead>
              <TableHead className="w-[140px] font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                Account Origin
              </TableHead>
              <TableHead className="w-[100px] font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                Status
              </TableHead>
              <TableHead className="w-[150px] font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                Assigned Owner
              </TableHead>
              <TableHead className="w-[120px] font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                Joined Date
              </TableHead>
              <TableHead className="w-[60px] text-right font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell colSpan={7}>
                    <div className="h-10 bg-muted/40 rounded-md w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                    <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center">
                      <Inbox className="h-5 w-5 text-muted-foreground/80" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No customers found</p>
                    <p className="text-xs max-w-sm">
                      No customer accounts match your current filters. Add a direct customer or convert an active lead from the sales pipeline.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow
                  key={c.id}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  {/* Customer Account & Company */}
                  <TableCell>
                    <div className="space-y-0.5">
                      <Link
                        href={`/customers/customers/${c.id}`}
                        className="font-medium text-sm text-foreground hover:text-primary transition-colors hover:underline block truncate"
                        title={c.name}
                      >
                        {c.name}
                      </Link>
                      {c.company ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span>{c.company}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground/60 italic">Individual Account</div>
                      )}
                    </div>
                  </TableCell>

                  {/* Contact Info */}
                  <TableCell>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                          <a
                            href={`tel:${c.phone}`}
                            className="hover:text-foreground transition-colors"
                          >
                            {c.phone}
                          </a>
                        </div>
                      ) : null}
                      {c.email ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                          <a
                            href={`mailto:${c.email}`}
                            className="hover:text-foreground transition-colors"
                          >
                            {c.email}
                          </a>
                        </div>
                      ) : null}
                      {!c.phone && !c.email && <span>—</span>}
                    </div>
                  </TableCell>

                  {/* Origin Indicator */}
                  <TableCell>
                    {c.origin === "direct" ? (
                      <Badge
                        variant="secondary"
                        className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40 text-[11px] font-medium inline-flex items-center gap-1"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        Direct Client
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/40 text-[11px] font-medium inline-flex items-center gap-1"
                      >
                        <LinkIcon className="h-2.5 w-2.5" />
                        From Lead
                      </Badge>
                    )}
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        c.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50 text-[11px]"
                          : "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 text-[11px]"
                      }
                    >
                      {c.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>

                  {/* Assigned Owner */}
                  <TableCell>
                    {c.owner ? (
                      <div className="flex items-center gap-1.5 text-xs text-foreground truncate">
                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {c.owner.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{c.owner.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
                    )}
                  </TableCell>

                  {/* Created At Date */}
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>

                  {/* Action Menu */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                          />
                        }
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          render={
                            <Link
                              href={`/customers/customers/${c.id}`}
                              className="flex items-center gap-2 cursor-pointer w-full"
                            />
                          }
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>View 360 Workspace</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEditCustomer(c)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                          <span>Edit Customer</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {onScheduleAppointment && (
                          <DropdownMenuItem
                            onClick={() => onScheduleAppointment(c)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                            <span>Schedule Appointment</span>
                          </DropdownMenuItem>
                        )}
                        {onScheduleFollowUp && (
                          <DropdownMenuItem
                            onClick={() => onScheduleFollowUp(c)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <PhoneCall className="h-4 w-4 text-muted-foreground" />
                            <span>Schedule Follow-up</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <Select
            value={pagination.limit.toString()}
            onValueChange={(val) => onLimitChange(Number(val))}
          >
            <SelectTrigger className="h-8 w-16 text-xs">
              <SelectValue placeholder={pagination.limit.toString()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-2">
            Showing{" "}
            {pagination.total === 0
              ? 0
              : (pagination.page - 1) * pagination.limit + 1}{" "}
            to {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} accounts
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            className="h-8 px-2.5 text-xs cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Previous
          </Button>
          <span className="px-2 text-xs font-medium text-foreground">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
            className="h-8 px-2.5 text-xs cursor-pointer"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
