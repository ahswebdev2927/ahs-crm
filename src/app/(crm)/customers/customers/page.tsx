"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCheck } from "lucide-react"

export default function CustomersPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Customer Directory"
        description="View and manage converted active customer accounts and histories."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Customers", href: "/customers/customers" },
          { label: "Customers" }
        ]}
        actions={
          <Button size="sm">
            <UserCheck className="h-4 w-4 mr-1.5" />
            <span>Search Directory</span>
          </Button>
        }
      />

      <div className="w-full p-4 sm:p-5 xl:p-6 space-y-4">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Customers</CardTitle>
            <CardDescription>
              Finalized client database records. Integration with converted leads occurs in Phase 17 (Customers).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Customers Directory Grid</p>
              <p className="text-xs max-w-xs mt-1">This module will display client histories, follow-up timelines, related quotations, and active service contracts.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
