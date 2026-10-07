"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { LeadWorkspace } from "@/features/leads/components/lead-workspace";

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  return (
    <div className="flex-1 space-y-4 sm:space-y-5 p-4 sm:p-5 xl:p-6 w-full">
      <LeadWorkspace leadId={leadId} mode="page" />
    </div>
  );
}
