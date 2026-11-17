"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AuditExplorerShell } from "@/features/audit/components/audit-explorer-shell";

export default function AuditLogsPage() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader
        title="Audit Logs"
        description="Immutable administrative and financial audit trail across AHS CRM records and users."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "System", href: "/settings" },
          { label: "Settings", href: "/settings" },
          { label: "Audit Logs" },
        ]}
        actions={
          <Link
            href="/settings"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "gap-1.5 text-xs",
            })}
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Settings</span>
          </Link>
        }
      />

      <div className="w-full p-4 sm:p-5 xl:p-6 flex-1 min-w-0">
        <AuditExplorerShell />
      </div>
    </div>
  );
}
