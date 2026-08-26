"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckSquare } from "lucide-react"

export default function TasksPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Tasks Checklist"
        description="Organize daily work items, deal assignments, and administrative chores."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Tasks" }
        ]}
        actions={
          <Button size="sm">
            <CheckSquare className="h-4 w-4 mr-1.5" />
            <span>New Task</span>
          </Button>
        }
      />

      <div className="max-w-[1536px] mx-auto p-4 sm:p-5 xl:p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Tasks</CardTitle>
            <CardDescription>
              Task registry for team collaboration. Task modules will be implemented in Phase 21 (Tasks).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Tasks List Placeholder</p>
              <p className="text-xs max-w-xs mt-1">This module will let sales agents log, prioritize, delegate, and check off CRM-associated tasks.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
