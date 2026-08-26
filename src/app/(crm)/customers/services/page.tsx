"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase } from "lucide-react"

export default function ServicesPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Service Catalog"
        description="Configure and inspect standard product packages and services offered."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Customers", href: "/customers/customers" },
          { label: "Services" }
        ]}
        actions={
          <Button size="sm">
            <Briefcase className="h-4 w-4 mr-1.5" />
            <span>Add Service</span>
          </Button>
        }
      />

      <div className="max-w-[1536px] mx-auto p-4 sm:p-5 xl:p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Service Catalogue</CardTitle>
            <CardDescription>
              Service definitions for quotation builders. Catalog models are set up in Phase 18 (Services).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Product Catalog Repository</p>
              <p className="text-xs max-w-xs mt-1">This module lists service names, pricing configurations, descriptions, and duration properties.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
