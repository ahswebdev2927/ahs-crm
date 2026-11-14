"use client";

import * as React from "react";
import { ReportsShell } from "@/features/reports/components/reports-shell";
import { RefreshCw } from "lucide-react";

/**
 * Reports & Analytics Page Entry Point.
 * Functional component wrapped in Suspense for search params hydration.
 */
export default function ReportsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex-1 h-96 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs">Loading CRM Reports & Analytics...</p>
        </div>
      }
    >
      <ReportsShell />
    </React.Suspense>
  );
}
