"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"

export default function PipelinePage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Sales Pipeline"
        description="Monitor lead stages and deal flow statuses dynamically."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Pipeline" }
        ]}
        actions={
          <Button size="sm" variant="outline">
            <Filter className="h-4 w-4 mr-1.5" />
            <span>Filter Pipeline</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Deals Kanban View</CardTitle>
            <CardDescription>
              Drag-and-drop pipeline interface. Logic will be built in Phase 13 (Pipeline + Kanban) using @dnd-kit.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-96 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Kanban Board Container</p>
              <p className="text-xs max-w-sm mt-1">Columns representing stages like New, Contacted, Qualified, Proposal, Negotiation, Won, and Lost will reside here.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
