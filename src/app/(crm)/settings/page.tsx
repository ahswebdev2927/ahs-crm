"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="System Settings"
        description="Configure CRM variables, company details, database integrations, and authorization tokens."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "System", href: "/settings" },
          { label: "Settings" }
        ]}
        actions={
          <Button size="sm">
            <Settings className="h-4 w-4 mr-1.5" />
            <span>Save Preferences</span>
          </Button>
        }
      />

      <div className="max-w-[1536px] mx-auto p-4 sm:p-5 xl:p-6">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">CRM System Parameters (SuperAdmin Exclusive)</CardTitle>
            <CardDescription>
              Core platform settings. Global variables and API limits will be managed under Phase 28 (Security Hardening).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/50 dark:border-input/5 bg-zinc-50/20 dark:bg-zinc-950/10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-semibold">Platform Preferences Panel</p>
              <p className="text-xs max-w-xs mt-1">This module manages Turso configurations, Cloudinary media parameters, JWT keys, security limits, and notification thresholds.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
