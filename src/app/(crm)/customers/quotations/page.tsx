"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileCheck } from "lucide-react"

export default function QuotationsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Sales Quotations"
        description="Draft and manage client pricing proposals and agreements."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Customers", href: "/customers/customers" },
          { label: "Quotations" }
        ]}
        actions={
          <Button size="sm">
            <FileCheck className="h-4 w-4 mr-1.5" />
            <span>Create Quotation</span>
          </Button>
        }
      />

      <div className="w-full p-4 sm:p-5 xl:p-6 space-y-4">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Quotations</CardTitle>
            <CardDescription>
              Client proposal documents and pricing agreements. Database structures will be created in Phase 19 (Quotations).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Quotations Builder</p>
              <p className="text-xs max-w-xs mt-1">This module will let agents aggregate catalogue services, calculate discounts, print PDFs, and track approval states.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
