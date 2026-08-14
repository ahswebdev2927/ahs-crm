"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PhoneCall } from "lucide-react"

export default function FollowUpsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Follow-ups Schedule"
        description="Schedule and track communications with active leads and clients."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Follow-ups" }
        ]}
        actions={
          <Button size="sm">
            <PhoneCall className="h-4 w-4 mr-1.5" />
            <span>Log Call</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Today&apos;s Agenda</CardTitle>
            <CardDescription>
              Communication logs and pending follow-ups. Database storage will be set up in Phase 14 (Follow-ups).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Follow-ups Registry</p>
              <p className="text-xs max-w-xs mt-1">This module will track phone calls, emails, and reminders to maintain active customer relationships.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
