"use client"

import * as React from "react"
import { useAuth } from "@/contexts/auth-context"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pagination } from "@/components/shared/pagination"
import { toast } from "@/components/ui/toast"
import { TeamMemberTable, type TeamMemberRow } from "@/features/users/components/team-member-table"
import { TeamMemberDialog } from "@/features/users/components/team-member-dialog"
import { ResetPasswordDialog } from "@/features/users/components/reset-password-dialog"
import { StatusChangeDialog } from "@/features/users/components/status-change-dialog"
import { UserPlus, Search, Filter, RefreshCw, Users } from "lucide-react"

export default function TeamPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.roleCode === "super_admin"

  const [members, setMembers] = React.useState<TeamMemberRow[]>([])
  const [departments, setDepartments] = React.useState<any[]>([])
  const [roles, setRoles] = React.useState<any[]>([])
  const [permissions, setPermissions] = React.useState<any[]>([])
  const [managers, setManagers] = React.useState<any[]>([])

  const [isLoading, setIsLoading] = React.useState(true)

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [page, setPage] = React.useState(1)
  const [paginationInfo, setPaginationInfo] = React.useState({
    total: 0,
    totalPages: 1,
  })

  // Modal Dialog States
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [memberToEdit, setMemberToEdit] = React.useState<any | null>(null)

  const [resetPassOpen, setResetPassOpen] = React.useState(false)
  const [resetPassMember, setResetPassMember] = React.useState<TeamMemberRow | null>(null)

  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false)
  const [statusMember, setStatusMember] = React.useState<TeamMemberRow | null>(null)
  const [targetStatus, setTargetStatus] = React.useState<"active" | "inactive" | "suspended" | null>(null)

  // Load Departments & Metadata
  const fetchMetadata = React.useCallback(async () => {
    try {
      const res = await fetch("/api/team/departments")
      const json = await res.json()
      if (json.status && json.data) {
        setDepartments(json.data.departments || [])
        setRoles(json.data.roles || [])
        setPermissions(json.data.permissions || [])
        setManagers(json.data.managers || [])
      }
    } catch (_e) {
      // Ignored
    }
  }, [])

  // Fetch Team Directory Members
  const fetchMembers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const query = new URLSearchParams()
      query.set("page", String(page))
      query.set("limit", "10")
      if (searchQuery.trim()) query.set("search", searchQuery.trim())
      if (roleFilter !== "all") query.set("roleId", roleFilter)
      if (statusFilter !== "all") query.set("status", statusFilter)

      const res = await fetch(`/api/team?${query.toString()}`)
      const json = await res.json()

      if (!json.status) {
        throw new Error(json.message || "Failed to load team members.")
      }

      setMembers(json.data.items || [])
      setPaginationInfo({
        total: json.data.pagination.total,
        totalPages: json.data.pagination.totalPages,
      })
    } catch (err: any) {
      toast.add({
        type: "error",
        title: "Error",
        description: err.message || "Unable to fetch team directory.",
        priority: "high",
      })
    } finally {
      setIsLoading(false)
    }
  }, [page, searchQuery, roleFilter, statusFilter])

  React.useEffect(() => {
    fetchMetadata()
  }, [fetchMetadata])

  React.useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Handlers
  const handleCreateMember = () => {
    setMemberToEdit(null)
    setDialogOpen(true)
  }

  const handleEditMember = async (memberRow: TeamMemberRow) => {
    try {
      const res = await fetch(`/api/team/${memberRow.id}`)
      const json = await res.json()
      if (json.status && json.data?.user) {
        setMemberToEdit(json.data.user)
        setDialogOpen(true)
      } else {
        throw new Error(json.message || "Could not fetch member details.")
      }
    } catch (err: any) {
      toast.add({
        type: "error",
        title: "Error",
        description: err.message,
        priority: "high",
      })
    }
  }

  const handleSaveMember = async (data: any) => {
    const isEdit = Boolean(memberToEdit)
    const url = isEdit ? `/api/team/${memberToEdit.id}` : "/api/team"
    const method = isEdit ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const json = await res.json()
    if (!json.status) {
      toast.add({
        type: "error",
        title: "Error",
        description: json.message || "Failed to save team member.",
        priority: "high",
      })
      throw new Error(json.message || "Failed to save team member.")
    }

    toast.add({
      type: "success",
      title: isEdit ? "Member Updated" : "Member Created",
      description: isEdit ? "Member profile updated successfully." : "New team member created successfully.",
    })
    fetchMembers()
  }

  const handleOpenResetPassword = (memberRow: TeamMemberRow) => {
    setResetPassMember(memberRow)
    setResetPassOpen(true)
  }

  const handleConfirmResetPassword = async (memberId: string, input: any) => {
    const res = await fetch(`/api/team/${memberId}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

    const json = await res.json()
    if (!json.status) {
      toast.add({
        type: "error",
        title: "Error",
        description: json.message || "Failed to reset password.",
        priority: "high",
      })
      throw new Error(json.message || "Failed to reset password.")
    }

    toast.add({
      type: "success",
      title: "Password Reset",
      description: `Password successfully updated for ${resetPassMember?.name || "member"}.`,
    })
  }

  const handleOpenStatusDialog = (
    memberRow: TeamMemberRow,
    status: "active" | "inactive" | "suspended"
  ) => {
    setStatusMember(memberRow)
    setTargetStatus(status)
    setStatusDialogOpen(true)
  }

  const handleConfirmStatusChange = async (
    memberId: string,
    status: "active" | "inactive" | "suspended"
  ) => {
    const res = await fetch(`/api/team/${memberId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })

    const json = await res.json()
    if (!json.status) {
      toast.add({
        type: "error",
        title: "Error",
        description: json.message || "Failed to update member status.",
        priority: "high",
      })
      throw new Error(json.message || "Failed to update member status.")
    }

    toast.add({
      type: "success",
      title: "Status Updated",
      description: `Account status updated to '${status}' for ${statusMember?.name || "member"}.`,
    })
    fetchMembers()
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Team Directory"
        description="Manage staff members, Sales department roles, data access levels, and credentials."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "System", href: "/team" },
          { label: "Team Management" },
        ]}
        actions={
          isSuperAdmin ? (
            <Button size="sm" onClick={handleCreateMember}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              <span>Add Team Member</span>
            </Button>
          ) : undefined
        }
      />

      <div className="w-full p-4 sm:p-5 xl:p-6 space-y-4 flex-1">
        {/* Filter & Search Controls Bar */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by staff name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="pl-9 text-xs"
            />
          </div>

          {/* Role Filter */}
          <div className="w-full sm:w-56">
            <Select
              value={roleFilter}
              onValueChange={(val) => {
                setRoleFilter(val || "all")
                setPage(1)
              }}
            >
              <SelectTrigger className="text-xs">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Filter by Role">
                    {roleFilter === "all"
                      ? "All Roles"
                      : roles.find((r) => String(r.id) === roleFilter)?.name || "Filter by Role"}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val || "all")
                setPage(1)
              }}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Status">
                  {statusFilter === "all"
                    ? "All Statuses"
                    : statusFilter === "active"
                    ? "Active Only"
                    : statusFilter === "inactive"
                    ? "Inactive"
                    : statusFilter === "suspended"
                    ? "Suspended"
                    : "Status"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active Only</SelectItem>
                <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                <SelectItem value="suspended" className="text-xs">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchMembers()}
            disabled={isLoading}
            title="Refresh Directory"
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Directory Summary Eyebrow */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">Sales Staff Directory</span>
            <span>({paginationInfo.total} total members)</span>
          </div>
          <span>Showing page {page} of {paginationInfo.totalPages || 1}</span>
        </div>

        {/* Staff Table */}
        <TeamMemberTable
          members={members}
          isLoading={isLoading}
          currentUserRoleCode={user?.roleCode}
          currentUserId={user?.id}
          onEdit={handleEditMember}
          onResetPassword={handleOpenResetPassword}
          onChangeStatus={handleOpenStatusDialog}
        />

        {/* Pagination Controls */}
        {paginationInfo.totalPages > 1 && (
          <div className="pt-2">
            <Pagination
              currentPage={page}
              totalPages={paginationInfo.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}

        {/* Dialog Modals */}
        <TeamMemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          memberToEdit={memberToEdit}
          departments={departments}
          roles={roles}
          permissions={permissions}
          managers={managers}
          currentUserRoleCode={user?.roleCode}
          onSubmit={handleSaveMember}
        />

        <ResetPasswordDialog
          open={resetPassOpen}
          onOpenChange={setResetPassOpen}
          member={resetPassMember}
          onConfirm={handleConfirmResetPassword}
        />

        <StatusChangeDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          member={statusMember}
          targetStatus={targetStatus}
          onConfirm={handleConfirmStatusChange}
        />
      </div>
    </div>
  )
}
