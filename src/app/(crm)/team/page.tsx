"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"

export default function TeamPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Team Directory"
        description="Monitor staff directory, activate user profiles, and audit roles."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "System", href: "/team" },
          { label: "Team Management" }
        ]}
        actions={
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-1.5" />
            <span>Invite Member</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Members (Restricted)</CardTitle>
            <CardDescription>
              CRM authorized employee roster. Staff assignments and roles auditing will be developed in Phase 09 (Team Management).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Team Directory Roster</p>
              <p className="text-xs max-w-xs mt-1">This module will display names, email accounts, active statuses (Active, Inactive, Suspended), roles, and target performance statistics.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
