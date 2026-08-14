"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function NotificationsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Notifications Inbox"
        description="Review all messages, system reminders, and lead events logged for you."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "System", href: "/notifications" },
          { label: "Notifications" }
        ]}
        actions={
          <Button size="sm" variant="outline">
            <span>Mark All Read</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Notification Center Logs</CardTitle>
            <CardDescription>
              All system activities and alarms. Active notifications will be wired in Phase 23 (Notifications).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Notifications Timeline</p>
              <p className="text-xs max-w-xs mt-1">This module will contain detailed notification cards with quick-actions to open the associated leads or appointments immediately.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
