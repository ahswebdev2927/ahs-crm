"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

export default function AppointmentsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Appointments Calendar"
        description="Plan meetings, site assessments, and client consultations."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Appointments" }
        ]}
        actions={
          <Button size="sm">
            <Calendar className="h-4 w-4 mr-1.5" />
            <span>Book Meeting</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Calendar Overview</CardTitle>
            <CardDescription>
              Client meetings and assessment schedules. Calendar view will be built in Phase 15 (Appointments).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-96 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Interactive Scheduler</p>
              <p className="text-xs max-w-xs mt-1">This module will host the calendar grids showing assessment events, customer meetups, and staff assignees.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
