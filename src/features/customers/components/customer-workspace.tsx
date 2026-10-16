"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Link as LinkIcon,
  User,
  Clock,
  Briefcase,
  FileCheck,
  Receipt,
  FileText,
  CalendarDays,
  PhoneCall,
  Edit,
  ExternalLink,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomerDetail, UserSummary } from "../types/customer.types";
import { CustomerDialog } from "./customer-dialog";
import { CustomerServicesTab } from "@/features/services/components/customer-services-tab";

export interface CustomerWorkspaceProps {
  customerId: string;
}

export function CustomerWorkspace({ customerId }: CustomerWorkspaceProps) {
  const [customer, setCustomer] = React.useState<CustomerDetail | null>(null);
  const [teamUsers, setTeamUsers] = React.useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState<boolean>(false);

  const fetchCustomerDetails = React.useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load customer profile.");
      }
      setCustomer(data.data.customer);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => {
    fetchCustomerDetails();
    fetch("/api/team?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.items) {
          setTeamUsers(data.data.items);
        }
      })
      .catch(() => {});
  }, [fetchCustomerDetails]);

  const formatDate = (dateInput: Date | string | null) => {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (paise: number) => {
    return (paise / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] p-8 space-y-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse">Loading Customer 360 Workspace...</p>
      </div>
    );
  }

  if (errorMsg || !customer) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h2 className="text-base font-semibold text-destructive">Customer Not Found</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {errorMsg || "The requested customer profile could not be loaded."}
          </p>
          <Link href="/customers/customers">
            <Button variant="outline" size="sm" className="mt-2 text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Return to Customer Directory
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 w-full">
      {/* Workspace Header Strip */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-border pb-4 bg-background/95 backdrop-blur-xs sticky top-0 z-10">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/customers/customers"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Back to Customer Directory"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {customer.name}
            </h1>

            {/* Origin Badge */}
            {customer.origin === "direct" ? (
              <Badge
                variant="secondary"
                className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40 text-[11px] font-medium inline-flex items-center gap-1 shrink-0"
              >
                <Sparkles className="h-3 w-3" />
                Direct Client
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/40 text-[11px] font-medium inline-flex items-center gap-1 shrink-0"
              >
                <LinkIcon className="h-3 w-3" />
                Converted Lead
              </Badge>
            )}

            {/* Status Badge */}
            <Badge
              variant="outline"
              className={
                customer.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50 text-[11px] shrink-0"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 text-[11px] shrink-0"
              }
            >
              {customer.status === "active" ? "Active Account" : "Inactive"}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {customer.company && (
              <>
                <div className="flex items-center gap-1 font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{customer.company}</span>
                </div>
                <span>•</span>
              </>
            )}
            <div>Customer ID: <code className="text-[11px]">{customer.id.slice(0, 8)}</code></div>
            <span>•</span>
            <div>Onboarded: {formatDate(customer.createdAt)}</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="h-8 text-xs cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit Profile
          </Button>

          {customer.lead && (
            <Link href={`/sales/leads/${customer.lead.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground border border-border/60"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Origin Lead
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main 360 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Left 2 Cols: Tabbed Content & History */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start h-9 p-1 bg-muted/50 border border-border/60 overflow-x-auto flex-nowrap no-scrollbar">
              <TabsTrigger value="overview" className="text-xs shrink-0 cursor-pointer">
                Overview
              </TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs shrink-0 cursor-pointer">
                Appointments & Visits ({customer.stats.totalAppointments})
              </TabsTrigger>
              <TabsTrigger value="followups" className="text-xs shrink-0 cursor-pointer">
                Follow-ups ({customer.stats.totalFollowUps})
              </TabsTrigger>
              <TabsTrigger value="quotations" className="text-xs shrink-0 cursor-pointer">
                Quotations ({customer.stats.totalQuotations})
              </TabsTrigger>
              <TabsTrigger value="services" className="text-xs shrink-0 cursor-pointer">
                Services ({customer.stats.totalCustomerServices})
              </TabsTrigger>
              <TabsTrigger value="billing" className="text-xs shrink-0 cursor-pointer">
                Billing ({customer.stats.totalInvoices})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab Content */}
            <TabsContent value="overview" className="space-y-4 mt-3">
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border border-border shadow-xs bg-card p-3">
                  <div className="text-[11px] font-medium text-muted-foreground">Total Invoices</div>
                  <div className="text-xl font-bold text-foreground mt-0.5">{customer.stats.totalInvoices}</div>
                </Card>
                <Card className="border border-border shadow-xs bg-card p-3">
                  <div className="text-[11px] font-medium text-muted-foreground">Paid Collections</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(customer.stats.totalPaidCents)}
                  </div>
                </Card>
                <Card className="border border-border shadow-xs bg-card p-3">
                  <div className="text-[11px] font-medium text-muted-foreground">Outstanding Balance</div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {formatCurrency(customer.stats.totalOutstandingCents)}
                  </div>
                </Card>
                <Card className="border border-border shadow-xs bg-card p-3">
                  <div className="text-[11px] font-medium text-muted-foreground">Active Services</div>
                  <div className="text-xl font-bold text-foreground mt-0.5">
                    {customer.stats.totalCustomerServices}
                  </div>
                </Card>
              </div>

              {/* Origin & Acquisition Story */}
              <Card className="border border-border shadow-xs bg-card">
                <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Acquisition & Intake Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-4 space-y-3 text-xs">
                  {customer.origin === "converted" && customer.lead ? (
                    <div className="rounded-lg bg-sky-50/70 border border-sky-100 dark:bg-sky-950/30 dark:border-sky-900/40 p-3 space-y-2">
                      <div className="font-semibold text-sky-900 dark:text-sky-300 flex items-center justify-between">
                        <span>Converted from Won Sales Lead</span>
                        <Link
                          href={`/sales/leads/${customer.lead.id}`}
                          className="text-xs text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1"
                        >
                          View Lead Timeline <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      <p className="text-sky-800/80 dark:text-sky-300/80">
                        Origin Lead: <strong className="font-semibold">{customer.lead.name}</strong>{" "}
                        {customer.lead.company && `(${customer.lead.company})`} • Final Pipeline Stage:{" "}
                        <span className="font-medium">{customer.lead.stageName || "Won"}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/40 p-3 space-y-1">
                      <div className="font-semibold text-indigo-900 dark:text-indigo-300">
                        Direct External Client
                      </div>
                      <p className="text-indigo-800/80 dark:text-indigo-300/80">
                        This client was onboarded directly into the CRM database as a non-lead customer account.
                      </p>
                    </div>
                  )}

                  {customer.address && (
                    <div className="space-y-1 pt-1">
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        Physical & Billing Location
                      </div>
                      <div className="text-muted-foreground whitespace-pre-wrap pl-4 border-l-2 border-border/80">
                        {customer.address}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appointments Tab */}
            <TabsContent value="appointments" className="mt-3">
              <Card className="border border-border shadow-xs bg-card">
                <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Customer Appointments & Field Visits
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Historical appointments, field visit reports, and scheduled meetings linked to this client.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-5">
                  <div className="h-36 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-center p-4 text-muted-foreground space-y-1.5">
                    <Calendar className="h-6 w-6 text-muted-foreground/60" />
                    <p className="text-xs font-medium text-foreground">
                      {customer.stats.totalAppointments} Linked Appointment Records
                    </p>
                    <p className="text-[11px] max-w-sm">
                      Detailed consultation logs, field visit outcomes, and customer requirements are synchronized with the Appointments module.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Follow-ups Tab */}
            <TabsContent value="followups" className="mt-3">
              <Card className="border border-border shadow-xs bg-card">
                <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <PhoneCall className="h-4 w-4 text-primary" />
                    Scheduled & Completed Follow-ups
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-5">
                  <div className="h-36 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-center p-4 text-muted-foreground space-y-1.5">
                    <Phone className="h-6 w-6 text-muted-foreground/60" />
                    <p className="text-xs font-medium text-foreground">
                      {customer.stats.totalFollowUps} Linked Follow-up Items
                    </p>
                    <p className="text-[11px] max-w-sm">
                      Follow-up tasks and call schedules associated with this customer profile.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quotations Tab */}
            <TabsContent value="quotations" className="mt-3">
              <Card className="border border-border shadow-xs bg-card">
                <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-primary" />
                    Customer Quotations & Proposals
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-5">
                  <div className="h-36 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-center p-4 text-muted-foreground space-y-1.5">
                    <FileText className="h-6 w-6 text-muted-foreground/60" />
                    <p className="text-xs font-medium text-foreground">
                      {customer.stats.totalQuotations} Active Quotations
                    </p>
                    <p className="text-[11px] max-w-sm">
                      Customer proposals and agreed itemized scopes. Managed in Phase 19 (Quotations).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="mt-3">
              <CustomerServicesTab
                customerId={customer.id}
                customerName={customer.name}
                onSubscriptionChange={fetchCustomerDetails}
              />
            </TabsContent>



            {/* Billing Tab */}
            <TabsContent value="billing" className="mt-3">
              <Card className="border border-border shadow-xs bg-card">
                <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-primary" />
                    Invoicing & Payment Collections
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-5">
                  <div className="h-36 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-center p-4 text-muted-foreground space-y-1.5">
                    <Receipt className="h-6 w-6 text-muted-foreground/60" />
                    <p className="text-xs font-medium text-foreground">
                      {customer.stats.totalInvoices} Invoices Recorded
                    </p>
                    <p className="text-[11px] max-w-sm">
                      Itemized invoices, partial payment records, and balances. Managed in Phase 20 (Invoicing & Payments).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Col: Contact & Account Summary Card */}
        <div className="space-y-4">
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
              <CardTitle className="text-sm font-semibold">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-5 space-y-3.5 text-xs">
              {/* Account Owner */}
              <div className="space-y-1">
                <div className="text-muted-foreground font-medium text-[11px]">Assigned Account Owner</div>
                {customer.owner ? (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {customer.owner.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{customer.owner.name}</div>
                      <div className="text-[11px] text-muted-foreground">{customer.owner.email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground/60 italic">Unassigned</div>
                )}
              </div>

              {/* Direct Phone */}
              <div className="space-y-1 border-t border-border/60 pt-3">
                <div className="text-muted-foreground font-medium text-[11px]">Primary Phone</div>
                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="font-medium text-foreground hover:text-primary flex items-center gap-1.5"
                  >
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground/60 italic">Not provided</span>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1 border-t border-border/60 pt-3">
                <div className="text-muted-foreground font-medium text-[11px]">Email Address</div>
                {customer.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="font-medium text-foreground hover:text-primary flex items-center gap-1.5 truncate"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </a>
                ) : (
                  <span className="text-muted-foreground/60 italic">Not provided</span>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1 border-t border-border/60 pt-3">
                <div className="text-muted-foreground font-medium text-[11px]">Status & Life-Cycle</div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Account Status:</span>
                  <span className="font-semibold text-foreground capitalize">{customer.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Origin Source:</span>
                  <span className="font-semibold text-foreground capitalize">{customer.origin}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="text-foreground">{formatDate(customer.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Customer Dialog */}
      <CustomerDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        customerToEdit={customer}
        teamUsers={teamUsers}
        onSuccess={() => {
          fetchCustomerDetails();
        }}
      />
    </div>
  );
}
