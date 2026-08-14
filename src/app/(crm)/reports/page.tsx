"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="CRM Reports & Analytics"
        description="Aggregate performance logs, sales margins, and staff productivity reports."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "System", href: "/reports" },
          { label: "Reports" }
        ]}
        actions={
          <Button size="sm">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            <span>Generate Report</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Analytical Insights (Restricted)</CardTitle>
            <CardDescription>
              Performance reports and metric charts. Analytical charts will be finalized in Phase 25 (Reports) using Recharts.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Reports Visualizer Container</p>
              <p className="text-xs max-w-xs mt-1">This module will display lead conversion percentages, sales team leaderboards, active invoicing volumes, and cash flow trends.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
