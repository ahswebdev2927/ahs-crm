"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Users, Sparkles, Link as LinkIcon, RefreshCw } from "lucide-react";
import { CustomerFilters } from "@/features/customers/components/customer-filters";
import { CustomerTable } from "@/features/customers/components/customer-table";
import { CustomerDialog } from "@/features/customers/components/customer-dialog";
import type { CustomerItem, UserSummary } from "@/features/customers/types/customer.types";

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<CustomerItem[]>([]);
  const [owners, setOwners] = React.useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState<boolean>(false);
  const [customerToEdit, setCustomerToEdit] = React.useState<CustomerItem | null>(null);

  // Filter States
  const [search, setSearch] = React.useState<string>("");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedOrigin, setSelectedOrigin] = React.useState<string>("all");
  const [selectedOwnerId, setSelectedOwnerId] = React.useState<string>("all");

  // Pagination State
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const fetchCustomers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search.trim()) params.append("search", search.trim());
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      if (selectedOrigin !== "all") params.append("origin", selectedOrigin);
      if (selectedOwnerId !== "all") params.append("ownerId", selectedOwnerId);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data?.data) {
        setCustomers(data.data.items || []);
        if (data.data.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: data.data.pagination.total,
            totalPages: data.data.pagination.totalPages,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, selectedStatus, selectedOrigin, selectedOwnerId]);

  const fetchOwners = React.useCallback(async () => {
    try {
      const res = await fetch("/api/team?limit=100");
      const data = await res.json();
      if (res.ok && data?.data?.items) {
        setOwners(data.data.items);
      }
    } catch (_err) {}
  }, []);

  React.useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedStatus("all");
    setSelectedOrigin("all");
    setSelectedOwnerId("all");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="flex-1 space-y-4 sm:space-y-5 p-4 sm:p-5 xl:p-6 w-full">
      <PageHeader
        title="Customer Directory"
        description="View and manage converted active client accounts, direct corporate records, and service histories."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Customers", href: "/customers/customers" },
          { label: "Directory" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCustomers}
              disabled={isLoading}
              className="h-8 text-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setCustomerToEdit(null);
                setIsAddDialogOpen(true);
              }}
              className="h-8 text-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Direct Customer
            </Button>
          </div>
        }
      />

      {/* Filter Section */}
      <CustomerFilters
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        selectedStatus={selectedStatus}
        onStatusChange={(val) => {
          setSelectedStatus(val);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        selectedOrigin={selectedOrigin}
        onOriginChange={(val) => {
          setSelectedOrigin(val);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        selectedOwnerId={selectedOwnerId}
        onOwnerChange={(val) => {
          setSelectedOwnerId(val);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        owners={owners}
        onReset={handleResetFilters}
      />

      {/* Customer Directory Table */}
      <CustomerTable
        customers={customers}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onLimitChange={(limit) => setPagination((prev) => ({ ...prev, limit, page: 1 }))}
        onEditCustomer={(c) => {
          setCustomerToEdit(c);
          setIsAddDialogOpen(true);
        }}
      />

      {/* Create / Edit Customer Modal */}
      <CustomerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        customerToEdit={customerToEdit}
        teamUsers={owners}
        onSuccess={() => {
          fetchCustomers();
        }}
      />
    </div>
  );
}
