"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createUserSchema,
  updateUserSchema,
} from "../schemas/user.schema"
import {
  UserPlus,
  UserCheck,
  Shield,
  ShieldCheck,
  Crown,
  Eye,
  EyeOff,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Mail,
  User,
} from "lucide-react"

export interface PermissionItem {
  id: number
  code: string
  name: string
  description?: string | null
}

export interface RoleItem {
  id: number
  name: string
  code: string
  departmentId?: number | null
  isManager?: boolean | null
  permissions?: string[]
  permissionIds?: number[]
}

export interface DepartmentItem {
  id: number
  name: string
  code: string
}

export interface ManagerItem {
  id: string
  name: string
  email: string
  teamName?: string
  roleName?: string
}

export interface MemberDetail {
  id: string
  name: string
  email: string
  roleId: number
  departmentId?: number | null
  teamId?: number | null
  teamName?: string | null
  managerId?: string | null
  dataVisibility: "own" | "shared" | "partnered" | "team" | "all"
  status: "active" | "inactive" | "suspended"
  permissionOverrides?: {
    permissionId: number
    type: "allow" | "deny"
  }[]
}

interface TeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberToEdit?: MemberDetail | null
  departments: DepartmentItem[]
  roles: RoleItem[]
  permissions: PermissionItem[]
  managers?: ManagerItem[]
  currentUserRoleCode?: string
  onSubmit: (data: any) => Promise<void>
}

export function TeamMemberDialog({
  open,
  onOpenChange,
  memberToEdit,
  departments,
  roles,
  permissions,
  managers = [],
  currentUserRoleCode = "super_admin",
  onSubmit,
}: TeamMemberDialogProps) {
  const isEditing = Boolean(memberToEdit)
  const isSuperAdmin = currentUserRoleCode === "super_admin"
  const [activeTab, setActiveTab] = React.useState<"profile" | "access" | "permissions">("profile")
  const [showPassword, setShowPassword] = React.useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver((isEditing ? updateUserSchema : createUserSchema) as any),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      roleId: roles[0]?.id || 1,
      departmentId: departments[0]?.id || 1,
      teamId: null,
      managerId: null,
      teamName: "",
      dataVisibility: "own" as any,
      status: "active" as any,
      permissions: [],
    },
  })

  // Watch selected role to toggle SuperAdmin vs Manager vs Rep hierarchy
  const selectedRoleId = watch("roleId")
  const selectedRole = roles.find((r) => String(r.id) === String(selectedRoleId))
  const isSuperAdminRole = selectedRole?.code === "super_admin"
  const isManagerRole = Boolean(
    (selectedRole as any)?.isManager || selectedRole?.code === "sales_manager"
  )

  // Current permission overrides in form state
  const currentOverrides: { permissionId: number; type: "allow" | "deny" }[] =
    watch("permissions") || []

  // Keep invariants in sync when role changes
  React.useEffect(() => {
    if (isSuperAdminRole) {
      setValue("managerId", null)
      setValue("teamName", "")
      setValue("dataVisibility", "all")
    } else if (isManagerRole) {
      setValue("managerId", null)
    }
  }, [selectedRoleId, isSuperAdminRole, isManagerRole, setValue])

  // Initialize or reset form values
  React.useEffect(() => {
    if (open) {
      setActiveTab("profile")
      setShowPassword(false)
      if (memberToEdit) {
        const isEditingSuperAdmin = roles.find((r) => r.id === memberToEdit.roleId)?.code === "super_admin"
        reset({
          name: memberToEdit.name,
          email: memberToEdit.email,
          roleId: memberToEdit.roleId,
          departmentId: memberToEdit.departmentId || departments[0]?.id || 1,
          teamId: isEditingSuperAdmin ? null : memberToEdit.teamId || null,
          managerId: isEditingSuperAdmin ? null : memberToEdit.managerId || null,
          teamName: isEditingSuperAdmin ? "" : memberToEdit.teamName || "",
          dataVisibility: isEditingSuperAdmin ? "all" : memberToEdit.dataVisibility || "own",
          status: memberToEdit.status || "active",
          permissions: memberToEdit.permissionOverrides || [],
        })
      } else {
        const firstRole = roles[0]
        const firstIsSuperAdmin = firstRole?.code === "super_admin"
        const firstIsManager = Boolean((firstRole as any)?.isManager || firstRole?.code === "sales_manager")

        reset({
          name: "",
          email: "",
          password: "",
          roleId: firstRole?.id || 1,
          departmentId: departments[0]?.id || 1,
          teamId: null,
          managerId: firstIsSuperAdmin || firstIsManager ? null : managers[0]?.id || null,
          teamName: "",
          dataVisibility: firstIsSuperAdmin ? "all" : "own",
          status: "active",
          permissions: [],
        })
      }
    }
  }, [open, memberToEdit, reset, roles, departments, managers])

  const handleFormSubmit = async (data: any) => {
    // Sanitize and enforce SuperAdmin / Manager invariants
    const sanitizedData = {
      ...data,
      teamName: isSuperAdminRole
        ? undefined
        : isManagerRole
        ? data.teamName && data.teamName.trim()
          ? data.teamName.trim()
          : undefined
        : undefined,
      managerId: isSuperAdminRole || isManagerRole
        ? null
        : data.managerId && data.managerId.trim()
        ? data.managerId.trim()
        : null,
      dataVisibility: isSuperAdminRole ? "all" : data.dataVisibility,
    }
    await onSubmit(sanitizedData)
    onOpenChange(false)
  }

  // Permission override toggle handler
  const handleOverrideChange = (permissionId: number, overrideType: "inherit" | "allow" | "deny") => {
    const filtered = currentOverrides.filter((o) => o.permissionId !== permissionId)
    if (overrideType !== "inherit") {
      filtered.push({ permissionId, type: overrideType })
    }
    setValue("permissions", filtered, { shouldDirty: true })
  }

  // Categorize permissions into functional domains
  const categorizedPermissions = React.useMemo(() => {
    const categories: Record<string, PermissionItem[]> = {
      "Sales & Pipeline": [],
      "Customers & Billing": [],
      "System & Management": [],
    }

    permissions.forEach((perm) => {
      const code = perm.code.toLowerCase()
      if (
        code.startsWith("lead") ||
        code.startsWith("pipeline") ||
        code.startsWith("followup") ||
        code.startsWith("appointment") ||
        code.startsWith("task") ||
        code.startsWith("dashboard")
      ) {
        categories["Sales & Pipeline"].push(perm)
      } else if (
        code.startsWith("customer") ||
        code.startsWith("service") ||
        code.startsWith("quotation") ||
        code.startsWith("invoice") ||
        code.startsWith("payment")
      ) {
        categories["Customers & Billing"].push(perm)
      } else {
        categories["System & Management"].push(perm)
      }
    })

    return categories
  }, [permissions])

  const rootErrors = Object.values(errors).map((err: any) => err?.message).filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border/80">
        {/* Header with Distinct Context Badge */}
        <DialogHeader className="p-5 pb-4 border-b border-border/80 bg-gradient-to-b from-muted/40 to-muted/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border shadow-xs ${
                  isSuperAdminRole
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                    : isManagerRole
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-primary/10 text-primary border-primary/20"
                }`}
              >
                {isSuperAdminRole ? (
                  <Crown className="h-5 w-5" />
                ) : isEditing ? (
                  <UserCheck className="h-5 w-5" />
                ) : (
                  <UserPlus className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                    {isEditing
                      ? isSuperAdmin
                        ? `Edit Member: ${memberToEdit?.name}`
                        : `Edit Access: ${memberToEdit?.name}`
                      : "Add New Team Member"}
                  </DialogTitle>
                  {isEditing && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 ${
                        isSuperAdminRole
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                          : isManagerRole
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {isSuperAdminRole
                        ? "Managing Director"
                        : isManagerRole
                        ? "Sales Manager"
                        : "Sales Rep"}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isEditing
                    ? isSuperAdmin
                      ? "Update staff identity, organizational role, reporting line, and granular permissions."
                      : "Update assigned data visibility tier and active account status."
                    : "Provision staff credentials, assign reporting line, and configure CRM permissions."}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Validation Errors Banner */}
        {rootErrors.length > 0 && (
          <div className="mx-5 mt-3 p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Please fix the following validation errors:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {rootErrors.map((msg, i) => (
                  <li key={i}>{String(msg)}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <Tabs
            value={activeTab}
            onValueChange={(val: any) => setActiveTab(val)}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Tabs Bar */}
            <div className="px-5 pt-3 pb-2 border-b border-border/60 bg-muted/10">
              <TabsList className="grid grid-cols-3 w-full h-9 p-1 bg-muted/50 rounded-lg">
                <TabsTrigger
                  value="profile"
                  className="text-xs font-medium flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>1. Identity & Profile</span>
                </TabsTrigger>
                <TabsTrigger
                  value="access"
                  className="text-xs font-medium flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>2. Role & Hierarchy</span>
                </TabsTrigger>
                <TabsTrigger
                  value="permissions"
                  className="text-xs font-medium flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>3. Permissions Matrix</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: Profile & Identity */}
            <TabsContent value="profile" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
              <div className="space-y-1.5">
                <label htmlFor="member-name" className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Full Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="member-name"
                  placeholder="e.g. Sarah Jenkins"
                  className="text-xs h-9"
                  disabled={isSubmitting || !isSuperAdmin}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-rose-500 font-medium">{String(errors.name.message)}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="member-email" className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Work Email Address</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="e.g. sarah.j@ahs-crm.com"
                    className="text-xs h-9 pl-8"
                    disabled={isSubmitting || !isSuperAdmin}
                    {...register("email")}
                  />
                  <Mail className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-500 font-medium">{String(errors.email.message)}</p>
                )}
              </div>

              {!isEditing && (
                <div className="space-y-1.5">
                  <label htmlFor="initial-password" className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Initial Account Password</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="initial-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters (1 uppercase, 1 lowercase, 1 number)"
                      className="pr-10 text-xs h-9 pl-8"
                      disabled={isSubmitting}
                      {...register("password")}
                    />
                    <Lock className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="text-xs text-rose-500 font-medium">{String(errors.password.message)}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Department
                </label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(Number(val))}
                      disabled={isSubmitting || !isSuperAdmin}
                    >
                      <SelectTrigger className="text-xs h-9 w-full">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={String(dept.id)} className="text-xs">
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </TabsContent>

            {/* TAB 2: Role & Hierarchy */}
            <TabsContent value="access" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Organizational Role <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Determines base permissions and hierarchy tier
                  </span>
                </label>
                <Controller
                  name="roleId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(Number(val))}
                      disabled={isSubmitting || !isSuperAdmin}
                    >
                      <SelectTrigger className="text-xs h-9 w-full">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={String(role.id)} className="text-xs">
                            <span className="font-semibold">{role.name}</span>
                            {role.code === "super_admin" && " — Managing Director (MD), Full System Access"}
                            {role.code === "sales_manager" && " — Leads sales squad & supervises reps"}
                            {role.code === "inside_sales" && " — Lead capture, qualification & booking"}
                            {role.code === "field_sales" && " — On-site visits, measurements & client closing"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Dynamic Hierarchy Configuration */}
              {isSuperAdminRole ? (
                /* SuperAdmin: Managing Director Executive Governance Card */
                <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
                        <Crown className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-foreground">
                            Executive Leadership (Managing Director)
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-medium"
                          >
                            Top Executive Tier
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Autonomous corporate governance with top-level organization authority.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
                      <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-medium">
                        Reporting Line
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        None (Managing Director)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
                      <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-medium">
                        Data Governance
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Unrestricted (All CRM Data)
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground/90 leading-relaxed bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                    As Managing Director, this account does not report to any sales manager and is not restricted to any individual sales team squad. Full organization-wide visibility and administrative authority are active.
                  </p>
                </div>
              ) : isManagerRole ? (
                /* Manager: Managed Team Group Configuration */
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-foreground">
                          Sales Leadership (Managerial Tier)
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium"
                        >
                          Squad Leader
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Supervises sales representatives and manages team quotas and performance.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label htmlFor="team-name-input" className="text-xs font-semibold text-foreground block">
                      Managed Sales Team Group Name
                    </label>
                    <Input
                      id="team-name-input"
                      placeholder="e.g. Commercial Sales North"
                      className="text-xs h-9 bg-background"
                      disabled={isSubmitting || !isSuperAdmin}
                      {...register("teamName")}
                    />
                    {errors.teamName && (
                      <p className="text-xs text-rose-500 font-medium">{String(errors.teamName.message)}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Assigned inside sales and field sales representatives will automatically belong to this group.
                    </p>
                  </div>
                </div>
              ) : (
                /* Non-Manager: Assigned Reporting Manager Selection */
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-xs">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">
                        Assigned Reporting Manager <span className="text-rose-500">*</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Select the supervising Sales Manager. The representative will inherit their team group.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Controller
                      name="managerId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={(val) => field.onChange(val || null)}
                          disabled={isSubmitting || !isSuperAdmin}
                        >
                          <SelectTrigger className="text-xs h-9 w-full bg-background">
                            <SelectValue placeholder="Select Direct Reporting Manager" />
                          </SelectTrigger>
                          <SelectContent>
                            {managers.map((mgr) => (
                              <SelectItem key={mgr.id} value={mgr.id} className="text-xs">
                                <span className="font-semibold">{mgr.name}</span>
                                {mgr.teamName && (
                                  <span className="text-muted-foreground"> — {mgr.teamName}</span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.managerId && (
                      <p className="text-xs text-rose-500 font-medium">{String(errors.managerId.message)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Data Visibility Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Data Visibility Level
                </label>
                {isSuperAdminRole ? (
                  <div className="p-3 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        All Scope — Unrestricted Organization-wide Access
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        SuperAdmin accounts are guaranteed full system data access by system policy.
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
                      Guaranteed
                    </Badge>
                  </div>
                ) : (
                  <Controller
                    name="dataVisibility"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="text-xs h-9 w-full">
                          <SelectValue placeholder="Select Data Scope" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="own" className="text-xs">
                            <span className="font-semibold">Own Scope</span> — Only records explicitly created by or assigned to self
                          </SelectItem>
                          <SelectItem value="team" className="text-xs">
                            <span className="font-semibold">Team Scope</span> — Access records across the assigned sales squad
                          </SelectItem>
                          <SelectItem value="shared" className="text-xs">
                            <span className="font-semibold">Shared Scope</span> — Access explicitly shared corporate records
                          </SelectItem>
                          {isSuperAdmin && (
                            <>
                              <SelectItem value="partnered" className="text-xs">
                                <span className="font-semibold">Partnered Scope</span> — Access self + partnered collaboration leads
                              </SelectItem>
                              <SelectItem value="all" className="text-xs text-primary font-semibold">
                                All Scope — Unrestricted organization-wide data access
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </div>

              {/* Account Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Account Status
                </label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="text-xs h-9 w-full">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active" className="text-xs">
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active Account
                          </span>
                        </SelectItem>
                        <SelectItem value="inactive" className="text-xs">
                          <span className="inline-flex items-center gap-1.5 text-zinc-500 font-medium">
                            <span className="h-2 w-2 rounded-full bg-zinc-400" /> Inactive / Disabled
                          </span>
                        </SelectItem>
                        {isSuperAdmin && (
                          <SelectItem value="suspended" className="text-xs">
                            <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                              <span className="h-2 w-2 rounded-full bg-rose-500" /> Suspended
                            </span>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </TabsContent>

            {/* TAB 3: Permissions Matrix */}
            <TabsContent value="permissions" className="flex-1 overflow-y-auto p-5 space-y-5 m-0">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/80 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground block">
                      Active Role: {selectedRole?.name || "Staff Member"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Green badges indicate permissions included by default with this role. SuperAdmin can configure granular Allow or Deny overrides.
                    </span>
                  </div>
                </div>
              </div>

              {isSuperAdminRole && (
                <div className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span>
                    SuperAdmin accounts inherently possess complete, unrestricted system privileges across all modules. Granular overrides are typically not required.
                  </span>
                </div>
              )}

              {Object.entries(categorizedPermissions).map(([category, items]) => {
                if (items.length === 0) return null
                return (
                  <div key={category} className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground px-1">
                      {category} ({items.length})
                    </h4>
                    <div className="border border-border/80 rounded-xl divide-y divide-border/60 overflow-hidden bg-card shadow-xs">
                      {items.map((perm) => {
                        const isInherited = Boolean(
                          selectedRole?.permissions?.includes(perm.code) ||
                          selectedRole?.code === "super_admin"
                        )
                        const override = currentOverrides.find((o) => o.permissionId === perm.id)
                        const currentOverrideState = override ? override.type : "inherit"

                        return (
                          <div
                            key={perm.id}
                            className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/20 transition-colors"
                          >
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  {perm.name}
                                </span>
                                <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                  {perm.code}
                                </code>
                              </div>
                              {perm.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                  {perm.description}
                                </p>
                              )}
                            </div>

                            {/* Status & Override Controls */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Role Default Indicator */}
                              {isInherited ? (
                                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Role Default
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/80">
                                  Not in Role
                                </Badge>
                              )}

                              {/* SuperAdmin Override Dropdown */}
                              {isSuperAdmin ? (
                                <Select
                                  value={currentOverrideState}
                                  onValueChange={(val: any) =>
                                    handleOverrideChange(perm.id, val)
                                  }
                                  disabled={isSubmitting}
                                >
                                  <SelectTrigger className="h-7 text-[11px] w-28 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="inherit" className="text-xs">
                                      Inherit
                                    </SelectItem>
                                    <SelectItem value="allow" className="text-xs text-emerald-600 font-semibold">
                                      Allow
                                    </SelectItem>
                                    <SelectItem value="deny" className="text-xs text-rose-600 font-semibold">
                                      Deny
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : override ? (
                                <Badge
                                  className={`text-[10px] ${
                                    override.type === "allow"
                                      ? "bg-emerald-500/15 text-emerald-600"
                                      : "bg-rose-500/15 text-rose-600"
                                  }`}
                                >
                                  {override.type.toUpperCase()}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <DialogFooter className="m-0 border-t border-border/80 bg-muted/30 px-6 py-3.5 flex flex-row items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Create Team Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
