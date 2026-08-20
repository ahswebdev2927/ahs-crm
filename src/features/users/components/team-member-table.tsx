"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  MoreHorizontal,
  Edit,
  KeyRound,
  ShieldAlert,
  UserCheck,
  Building2,
  Eye,
} from "lucide-react"

export interface TeamMemberRow {
  id: string
  name: string
  email: string
  roleId: number
  roleName: string | null
  roleCode: string | null
  isManager?: boolean | number | null
  departmentId: number | null
  departmentName: string | null
  departmentCode: string | null
  teamId?: number | null
  teamName?: string | null
  managerId?: string | null
  managerName?: string | null
  dataVisibility: "own" | "shared" | "partnered" | "team" | "all"
  status: "active" | "inactive" | "suspended"
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

interface TeamMemberTableProps {
  members: TeamMemberRow[]
  isLoading?: boolean
  onEdit: (member: TeamMemberRow) => void
  onResetPassword: (member: TeamMemberRow) => void
  onChangeStatus: (
    member: TeamMemberRow,
    targetStatus: "active" | "inactive" | "suspended"
  ) => void
}

export function TeamMemberTable({
  members,
  isLoading,
  onEdit,
  onResetPassword,
  onChangeStatus,
}: TeamMemberTableProps) {
  if (isLoading) {
    return (
      <div className="border rounded-xl p-8 text-center bg-card shadow-xs animate-pulse">
        <div className="h-6 bg-muted/60 rounded w-1/4 mx-auto mb-4" />
        <div className="h-4 bg-muted/40 rounded w-1/3 mx-auto" />
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="border rounded-xl p-12 text-center bg-card shadow-xs">
        <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <h3 className="text-sm font-semibold text-foreground">No Team Members Found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No staff records match your current search or filter criteria. Try adjusting your filters.
        </p>
      </div>
    )
  }

  const formatVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case "all":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]">All Org</Badge>
      case "team":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]">Team</Badge>
      case "partnered":
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px]">Partnered</Badge>
      case "shared":
        return <Badge variant="outline" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 text-[10px]">Shared</Badge>
      default:
        return <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 text-[10px]">Own Only</Badge>
    }
  }

  const getSubRoleBadge = (roleCode: string | null, roleName: string | null) => {
    switch (roleCode) {
      case "super_admin":
        return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/30 text-[11px] font-semibold">Super Admin</Badge>
      case "sales_manager":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30 text-[11px] font-semibold">Sales Manager</Badge>
      case "inside_sales":
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30 text-[11px] font-semibold">Inside Sales (In Office)</Badge>
      case "field_sales":
        return <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/30 text-[11px] font-semibold">Field Sales (Field Agent)</Badge>
      default:
        return <Badge variant="secondary" className="text-[11px] font-semibold">{roleName || "Staff Member"}</Badge>
    }
  }

  return (
    <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="text-xs font-semibold">Team Member</TableHead>
            <TableHead className="text-xs font-semibold">Department & Team</TableHead>
            <TableHead className="text-xs font-semibold">Role</TableHead>
            <TableHead className="text-xs font-semibold">Data Access</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const initials = member.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)

            return (
              <TableRow key={member.id} className="hover:bg-muted/30 transition-colors">
                {/* Staff Member Info */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                      {initials}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-snug">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Department & Team */}
                <TableCell className="text-xs font-medium text-foreground">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{member.departmentName || "Sales"}</span>
                    </div>
                    {member.teamName && (
                      <p className="text-[11px] font-medium text-primary pl-5">
                        Group: {member.teamName}
                      </p>
                    )}
                    {member.managerName && (
                      <p className="text-[10px] text-muted-foreground pl-5">
                        Manager: {member.managerName}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Sub-role */}
                <TableCell>
                  {getSubRoleBadge(member.roleCode, member.roleName)}
                </TableCell>

                {/* Data Visibility */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    {formatVisibilityBadge(member.dataVisibility)}
                  </div>
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <StatusBadge status={member.status} />
                </TableCell>

                {/* Actions Dropdown */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted font-medium text-xs">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                          Staff Actions
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(member)}>
                          <Edit className="h-3.5 w-3.5 mr-2" />
                          <span>Edit Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onResetPassword(member)}>
                          <KeyRound className="h-3.5 w-3.5 mr-2 text-amber-500" />
                          <span>Reset Password</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        {member.status !== "active" && (
                          <DropdownMenuItem onClick={() => onChangeStatus(member, "active")}>
                            <UserCheck className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                            <span>Re-activate Account</span>
                          </DropdownMenuItem>
                        )}

                        {member.status !== "suspended" && (
                          <DropdownMenuItem
                            className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-500/10"
                            onClick={() => onChangeStatus(member, "suspended")}
                          >
                            <ShieldAlert className="h-3.5 w-3.5 mr-2" />
                            <span>Suspend Account</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
