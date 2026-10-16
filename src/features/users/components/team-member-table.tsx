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
  Copy,
  Check,
  User,
  Shield,
  Briefcase,
  Users,
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
  currentUserRoleCode?: string
  currentUserId?: string
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
  currentUserRoleCode = "super_admin",
  currentUserId,
  onEdit,
  onResetPassword,
  onChangeStatus,
}: TeamMemberTableProps) {
  const isSuperAdmin = currentUserRoleCode === "super_admin"
  const [copiedEmailId, setCopiedEmailId] = React.useState<string | null>(null)

  const handleCopyEmail = (id: string, email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmailId(id)
    setTimeout(() => setCopiedEmailId(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="border border-border/80 rounded-2xl p-12 text-center bg-card shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-muted/60 rounded-md w-1/4 mx-auto" />
        <div className="h-4 bg-muted/40 rounded-md w-1/3 mx-auto" />
        <div className="space-y-2 pt-4">
          <div className="h-10 bg-muted/30 rounded-lg w-full" />
          <div className="h-10 bg-muted/20 rounded-lg w-full" />
          <div className="h-10 bg-muted/20 rounded-lg w-full" />
        </div>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="border border-border/80 rounded-2xl p-14 text-center bg-card shadow-xs space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
          <Users className="h-6 w-6 opacity-60" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No Staff Records Found</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          No team members match your current filters. Adjust your search query or reset role filters to view the full directory.
        </p>
      </div>
    )
  }

  const formatVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case "all":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px] font-medium">
            All Organization
          </Badge>
        )
      case "team":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-medium">
            Team Scope
          </Badge>
        )
      case "partnered":
        return (
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] font-medium">
            Partnered
          </Badge>
        )
      case "shared":
        return (
          <Badge variant="outline" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 text-[10px] font-medium">
            Shared Records
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 text-[10px] font-medium">
            Own Only
          </Badge>
        )
    }
  }

  const getSubRoleBadge = (roleCode: string | null, roleName: string | null) => {
    switch (roleCode) {
      case "super_admin":
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 border-purple-500/30 text-[11px] font-semibold gap-1">
            <Shield className="h-3 w-3" />
            Super Admin
          </Badge>
        )
      case "sales_manager":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border-amber-500/30 text-[11px] font-semibold gap-1">
            <Briefcase className="h-3 w-3" />
            Sales Manager
          </Badge>
        )
      case "inside_sales":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30 text-[11px] font-semibold gap-1">
            <Building2 className="h-3 w-3" />
            Inside Sales
          </Badge>
        )
      case "field_sales":
        return (
          <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 border-cyan-500/30 text-[11px] font-semibold gap-1">
            <User className="h-3 w-3" />
            Field Sales
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-[11px] font-semibold">
            {roleName || "Staff Member"}
          </Badge>
        )
    }
  }

  return (
    <div className="border border-border/80 rounded-2xl bg-card overflow-hidden shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40 border-b border-border/80">
          <TableRow>
            <TableHead className="text-xs font-semibold text-foreground py-3.5 pl-5">Staff Member</TableHead>
            <TableHead className="text-xs font-semibold text-foreground py-3.5">Role</TableHead>
            <TableHead className="text-xs font-semibold text-foreground py-3.5">Hierarchy & Team Group</TableHead>
            <TableHead className="text-xs font-semibold text-foreground py-3.5">Data Scope</TableHead>
            <TableHead className="text-xs font-semibold text-foreground py-3.5">Account Status</TableHead>
            <TableHead className="text-xs font-semibold text-foreground py-3.5 text-right pr-5">Actions</TableHead>
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

            const isSelf = member.id === currentUserId
            const isManager = currentUserRoleCode === "sales_manager"
            const canManageThisMember = isSuperAdmin || (isManager && !isSelf && member.roleCode !== "super_admin")
            const isManagerRole = member.roleCode === "sales_manager" || Boolean(member.isManager)

            return (
              <TableRow key={member.id} className="hover:bg-muted/20 transition-colors">
                {/* Member Identity */}
                <TableCell className="py-3 pl-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
                      {initials}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-snug">
                        {member.name}
                        {isSelf && (
                          <span className="ml-1.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded-md">
                            You
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-muted-foreground select-all">
                          {member.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(member.id, member.email)}
                          title="Copy email address"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedEmailId === member.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-60 hover:opacity-100" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Sub-role */}
                <TableCell className="py-3">
                  {getSubRoleBadge(member.roleCode, member.roleName)}
                </TableCell>

                {/* Hierarchy & Team Group */}
                <TableCell className="py-3 text-xs text-foreground">
                  <div className="space-y-0.5">
                    {isManagerRole ? (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>Manages: {member.teamName || "Owned Team"}</span>
                      </div>
                    ) : member.managerName ? (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          Reports to <strong className="font-semibold text-foreground">{member.managerName}</strong>
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">Unassigned Manager</span>
                    )}

                    {member.teamName && !isManagerRole && (
                      <p className="text-[11px] text-muted-foreground pl-5">
                        Team: {member.teamName}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Data Visibility */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatVisibilityBadge(member.dataVisibility)}
                  </div>
                </TableCell>

                {/* Status Badge */}
                <TableCell className="py-3">
                  <StatusBadge status={member.status} />
                </TableCell>

                {/* Actions Dropdown */}
                <TableCell className="py-3 text-right pr-5">
                  {canManageThisMember ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted font-medium text-xs transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        <span className="sr-only">Open actions menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                            Staff Actions
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onEdit(member)}>
                            <Edit className="h-3.5 w-3.5 mr-2" />
                            <span>{isSuperAdmin ? "Edit Staff Details" : "Edit Access & Status"}</span>
                          </DropdownMenuItem>

                          {isSuperAdmin && (
                            <DropdownMenuItem onClick={() => onResetPassword(member)}>
                              <KeyRound className="h-3.5 w-3.5 mr-2 text-amber-500" />
                              <span>Reset Password</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {member.status !== "active" && (
                            <DropdownMenuItem onClick={() => onChangeStatus(member, "active")}>
                              <UserCheck className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                              <span>Re-activate Account</span>
                            </DropdownMenuItem>
                          )}

                          {member.status === "active" && (
                            <DropdownMenuItem onClick={() => onChangeStatus(member, "inactive")}>
                              <UserCheck className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                              <span>Deactivate Account</span>
                            </DropdownMenuItem>
                          )}

                          {isSuperAdmin && member.status !== "suspended" && (
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
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
