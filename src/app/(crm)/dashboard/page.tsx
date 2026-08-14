"use client"

import * as React from "react"
import { useAuth } from "@/contexts/auth-context"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Target, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  FileCheck, 
  Calendar
} from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()

  // Dynamic statistics based on the logged-in role
  const stats = React.useMemo(() => {
    switch (user.roleCode) {
      case "super_admin":
      case "sales_manager":
        return [
          {
            title: "Total Leads",
            value: "1,248",
            description: "+12% from last month",
            icon: Target,
            color: "text-emerald-500 bg-emerald-500/10"
          },
          {
            title: "Sales Pipeline",
            value: "$342,800",
            description: "28 active negotiations",
            icon: TrendingUp,
            color: "text-blue-500 bg-blue-500/10"
          },
          {
            title: "Total Customers",
            value: "412",
            description: "Company-wide active accounts",
            icon: Users,
            color: "text-indigo-500 bg-indigo-500/10"
          },
          {
            title: "Pending Tasks",
            value: "18",
            description: "3 high priority overdue",
            icon: Clock,
            color: "text-amber-500 bg-amber-500/10"
          }
        ]
      case "inside_sales":
        return [
          {
            title: "My Active Leads",
            value: "42",
            description: "6 assigned today",
            icon: Target,
            color: "text-emerald-500 bg-emerald-500/10"
          },
          {
            title: "My Pipeline Value",
            value: "$58,400",
            description: "8 deals in negotiation",
            icon: TrendingUp,
            color: "text-blue-500 bg-blue-500/10"
          },
          {
            title: "Follow-ups Scheduled",
            value: "9",
            description: "4 remaining for today",
            icon: Clock,
            color: "text-amber-500 bg-amber-500/10"
          },
          {
            title: "Assigned Appointments",
            value: "5",
            description: "With field sales reps",
            icon: Calendar,
            color: "text-sky-500 bg-sky-500/10"
          }
        ]
      case "field_sales":
        return [
          {
            title: "My Active Leads",
            value: "28",
            description: "Primary ownership",
            icon: Target,
            color: "text-emerald-500 bg-emerald-500/10"
          },
          {
            title: "Field Appointments",
            value: "4",
            description: "Scheduled for today",
            icon: Calendar,
            color: "text-sky-500 bg-sky-500/10"
          },
          {
            title: "Pending Site Visits",
            value: "7",
            description: "Requires location confirmation",
            icon: Users,
            color: "text-indigo-500 bg-indigo-500/10"
          },
          {
            title: "My Follow-up Tasks",
            value: "12",
            description: "Contract delivery focus",
            icon: Clock,
            color: "text-amber-500 bg-amber-500/10"
          }
        ]
    }
  }, [user.roleCode])

  return (
    <div className="flex-1">
      <PageHeader
        title="Dashboard"
        description="Real-time sales performance, metrics, and CRM pipeline analytics."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Dashboard" }
        ]}
        actions={
          <Button size="sm">
            <span>Download Summary</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Banner Alert for Simulation mode */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-xs dark:border-input/10">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Simulator Mode Active: </span>
            You are browsing as <span className="font-semibold text-primary">{user.name}</span> with the role of <span className="font-semibold underline">{user.roleName}</span>. Check other CRM modules in the sidebar to see how access permissions are handled automatically.
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className="border-border dark:border-input/10 shadow-xs">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{stat.value}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Core Layout Panels */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border dark:border-input/10 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Active Pipeline Stage Distribution</CardTitle>
              <CardDescription>Mock Kanban aggregates by volume and value</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
              <div className="text-center space-y-2">
                <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm font-semibold">Stage Distribution Chart</p>
                <p className="text-xs text-muted-foreground max-w-sm">Recharts charts will be integrated in Phase 25 (Reports) using transactional Drizzle models.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border dark:border-input/10 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent CRM Log Activity</CardTitle>
              <CardDescription>Updates across ownership and stages</CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t border-border/50 dark:border-input/5">
              <div className="divide-y divide-border/60 dark:divide-input/5">
                <div className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-500">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Lead Moved to Negotiation</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Acme Corp moved by Sarah Jenkins</p>
                    <span className="text-[9px] text-muted-foreground font-medium block mt-1">12 minutes ago</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 rounded-full bg-blue-500/10 p-1 text-blue-500">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Site Visit Scheduled</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Globex Inc appointment logged by Marcus Vance</p>
                    <span className="text-[9px] text-muted-foreground font-medium block mt-1">2 hours ago</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 rounded-full bg-amber-500/10 p-1 text-amber-500">
                    <FileCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Quotation Generated</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Initech pricing sheet drafted for $12,500</p>
                    <span className="text-[9px] text-muted-foreground font-medium block mt-1">4 hours ago</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
