"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerWorkspace } from "@/features/customers/components/customer-workspace";

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "";

  return (
    <div className="flex-1 p-4 sm:p-5 xl:p-6 w-full">
      <CustomerWorkspace customerId={customerId} />
    </div>
  );
}
