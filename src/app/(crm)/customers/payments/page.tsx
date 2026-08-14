"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export default function PaymentsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Payment Receipts"
        description="View payment receipts, ledger records, and active account balances."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Customers", href: "/customers/customers" },
          { label: "Payments" }
        ]}
        actions={
          <Button size="sm">
            <Wallet className="h-4 w-4 mr-1.5" />
            <span>Record Payment</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Collections Registry (Restricted)</CardTitle>
            <CardDescription>
              Accounts transaction history. Database tables and processing are set up in Phase 20 (Invoices/Payments).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Payment Transactions Registry</p>
              <p className="text-xs max-w-xs mt-1">This module logs payments, maps them to open invoices, tracks balances, and handles Cloudinary receipt attachments.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
