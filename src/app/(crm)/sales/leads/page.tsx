"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function LeadsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Leads Database"
        description="Capture, qualify, and track prospective sales deals."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Leads" }
        ]}
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Create Lead</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">All Active Leads</CardTitle>
            <CardDescription>
              Prospect lists managed by sales representatives. Database logic will be integrated in Phase 11 (Leads).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Leads Grid Placeholder</p>
              <p className="text-xs max-w-xs mt-1">This module will list customer prospects, communication details, priority indicators, and assignees.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
