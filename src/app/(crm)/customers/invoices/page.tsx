"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Receipt } from "lucide-react"

export default function InvoicesPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Client Invoices"
        description="Generate, track, and manage customer invoices and payments."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Customers", href: "/customers/customers" },
          { label: "Invoices" }
        ]}
        actions={
          <Button size="sm">
            <Receipt className="h-4 w-4 mr-1.5" />
            <span>Draft Invoice</span>
          </Button>
        }
      />

      <div className="w-full p-4 sm:p-5 xl:p-6 space-y-4">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Invoicing Ledgers (Restricted)</CardTitle>
            <CardDescription>
              Accounts billing logs. Access configurations and billing calculations will be finalized in Phase 20 (Invoices/Payments).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Invoices Ledger Grid</p>
              <p className="text-xs max-w-xs mt-1">This module manages receivables, invoicing codes, payment statuses (Paid, Partial, Overdue), and billing contacts.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
