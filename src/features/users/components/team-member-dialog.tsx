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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "../schemas/user.schema"
import { UserPlus, UserCheck, Shield, Key, Sliders, Eye, EyeOff } from "lucide-react"

interface PermissionItem {
  id: number
  code: string
  name: string
  description?: string | null
}

interface RoleItem {
  id: number
  name: string
  code: string
  departmentId?: number | null
}

interface DepartmentItem {
  id: number
  name: string
  code: string
}

interface ManagerItem {
  id: string
  name: string
  email: string
  teamName?: string
  roleName?: string
}

interface MemberDetail {
  id: string
  name: string
  email: string
  roleId: number
  departmentId?: number | null
  teamId?: number | null
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
  onSubmit,
}: TeamMemberDialogProps) {
  const isEditing = Boolean(memberToEdit)
  const [activeTab, setActiveTab] = React.useState("profile")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Map permission override states: { [permissionId]: 'default' | 'allow' | 'deny' }
  const [permissionStates, setPermissionStates] = React.useState<
    Record<number, "default" | "allow" | "deny">
  >({})

  const schema = isEditing ? updateUserSchema : createUserSchema

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      roleId: roles[0]?.id || 1,
      departmentId: departments[0]?.id || 1,
      managerId: "",
      teamName: "",
      dataVisibility: "own",
    },
  })

  const selectedRoleId = watch("roleId")
  const selectedRole = roles.find((r) => String(r.id) === String(selectedRoleId))
  const isManagerRole = Boolean((selectedRole as any)?.isManager || selectedRole?.code === "sales_manager")

  React.useEffect(() => {
    if (open) {
      if (memberToEdit) {
        reset({
          name: memberToEdit.name,
          email: memberToEdit.email,
          roleId: memberToEdit.roleId,
          departmentId: memberToEdit.departmentId || departments[0]?.id || 1,
          managerId: memberToEdit.managerId || "",
          dataVisibility: memberToEdit.dataVisibility,
        })
        const initialOverrides: Record<number, "default" | "allow" | "deny"> = {}
        memberToEdit.permissionOverrides?.forEach((o) => {
          initialOverrides[o.permissionId] = o.type
        })
        setPermissionStates(initialOverrides)
      } else {
        reset({
          name: "",
          email: "",
          password: "",
          roleId: roles.find((r) => r.code === "inside_sales")?.id || roles[0]?.id || 1,
          departmentId: departments[0]?.id || 1,
          managerId: managers[0]?.id || "",
          teamName: "",
          dataVisibility: "own",
        })
        setPermissionStates({})
      }
      setActiveTab("profile")
      setShowPassword(false)
    }
  }, [open, memberToEdit, reset, departments, roles, managers])

  const handleFormSubmit = async (values: any) => {
    setIsSubmitting(true)
    try {
      // Build permission overrides list
      const customPermissions: { permissionId: number; type: "allow" | "deny" }[] = []
      Object.entries(permissionStates).forEach(([permIdStr, state]) => {
        if (state !== "default") {
          customPermissions.push({
            permissionId: Number(permIdStr),
            type: state,
          })
        }
      })

      const payload = {
        ...values,
        permissions: customPermissions,
      }

      await onSubmit(payload)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePermissionState = (permId: number) => {
    setPermissionStates((prev) => {
      const current = prev[permId] || "default"
      let next: "default" | "allow" | "deny" = "default"
      if (current === "default") next = "allow"
      else if (current === "allow") next = "deny"
      else next = "default"
      return { ...prev, [permId]: next }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {isEditing ? <UserCheck className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {isEditing ? `Edit Team Member: ${memberToEdit?.name}` : "Add New Team Member"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? "Update staff details, role, data visibility, or granular permissions."
                  : "Configure credentials, assign Sales department role and data access."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col min-h-0 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="profile" className="text-xs">
                Basic Profile
              </TabsTrigger>
              <TabsTrigger value="access" className="text-xs">
                Role & Access
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: BASIC PROFILE */}
            <TabsContent value="profile" className="space-y-4 pt-4 min-h-[220px]">
              <div className="space-y-2">
                <label htmlFor="member-name" className="text-xs font-semibold block">
                  Full Name
                </label>
                <Input
                  id="member-name"
                  placeholder="e.g. Sarah Jenkins"
                  className="text-xs"
                  disabled={isSubmitting}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-rose-500 font-medium">{errors.name.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="member-email" className="text-xs font-semibold block">
                  Work Email Address
                </label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="sarah.j@ahs-crm.com"
                  className="text-xs"
                  disabled={isSubmitting}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-rose-500 font-medium">{errors.email.message as string}</p>
                )}
              </div>

              {!isEditing ? (
                <div className="space-y-2">
                  <label htmlFor="initial-password" className="text-xs font-semibold block">
                    Initial Password
                  </label>
                  <div className="relative">
                    <Input
                      id="initial-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 chars, 1 uppercase, 1 number"
                      className="pr-10 text-xs"
                      disabled={isSubmitting}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-rose-500 font-medium">{errors.password.message as string}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    SuperAdmin sets initial credential. Share securely with the team member.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Password updates are managed via SuperAdmin Direct Reset.</span>
                  <span className="font-semibold text-foreground">Password Set</span>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: ROLE & ACCESS */}
            <TabsContent value="access" className="space-y-4 pt-4 min-h-[220px]">
              <div className="space-y-2">
                <label className="text-xs font-semibold block">Department</label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => {
                    const selectedDept = departments.find((d) => String(d.id) === String(field.value))
                    return (
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(val) => field.onChange(Number(val))}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="text-xs w-full">
                          <SelectValue placeholder="Select Department">
                            {selectedDept ? selectedDept.name : "Select Department"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={String(dept.id)} className="text-xs">
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Role</label>
                <Controller
                  name="roleId"
                  control={control}
                  render={({ field }) => {
                    const selectedRoleItem = roles.find((r) => String(r.id) === String(field.value))
                    return (
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(val) => field.onChange(Number(val))}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="text-xs w-full">
                          <SelectValue placeholder="Select Role">
                            {selectedRoleItem ? selectedRoleItem.name : "Select Role"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={String(role.id)} className="text-xs">
                              {role.name} {(role as any).isManager ? "👑 (Manager)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  }}
                />
              </div>

              {/* MANAGER VS NON-MANAGER CREATION LOGIC */}
              {isManagerRole ? (
                <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <label className="text-xs font-semibold text-primary block">
                    Owned Team Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Sales Team Alpha, Sales Team Beta"
                    className="text-xs bg-background"
                    disabled={isSubmitting}
                    {...register("teamName")}
                  />
                  {errors.teamName && (
                    <p className="text-xs text-rose-500 font-medium">{errors.teamName.message as string}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    An Admin must enter a unique Team Name when creating any Manager account.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold block">
                    Assigned Manager <span className="text-rose-500">*</span>
                  </label>
                  <Controller
                    name="managerId"
                    control={control}
                    render={({ field }) => {
                      const selectedManagerItem = managers.find((m) => m.id === field.value)
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          disabled={isSubmitting || managers.length === 0}
                        >
                          <SelectTrigger className="text-xs w-full">
                            <SelectValue placeholder={managers.length > 0 ? "Select Manager" : "No active managers available"}>
                              {selectedManagerItem
                                ? `${selectedManagerItem.name} (${selectedManagerItem.teamName || "Manager"})`
                                : "Select Manager"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {managers.map((mgr) => (
                              <SelectItem key={mgr.id} value={mgr.id} className="text-xs">
                                {mgr.name} — {mgr.teamName || "Manager"} ({mgr.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Non-manager team members must be assigned to an active Manager to join their Team group.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Data Visibility Level</label>
                <Controller
                  name="dataVisibility"
                  control={control}
                  render={({ field }) => {
                    const visibilityLabels: Record<string, string> = {
                      own: "Own (Only leads/records assigned to self)",
                      team: "Team (Sales team records & shared assignments)",
                      partnered: "Partnered (Own + Partnered leads)",
                      shared: "Shared (Explicitly shared company records)",
                      all: "All (Organization-wide data access)",
                    }
                    return (
                      <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                        <SelectTrigger className="text-xs w-full">
                          <SelectValue placeholder="Select Visibility">
                            {visibilityLabels[field.value] || field.value || "Select Visibility"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="own" className="text-xs">
                            Own (Only leads/records assigned to self)
                          </SelectItem>
                          <SelectItem value="team" className="text-xs">
                            Team (Sales team records & shared assignments)
                          </SelectItem>
                          <SelectItem value="partnered" className="text-xs">
                            Partnered (Own + Partnered leads)
                          </SelectItem>
                          <SelectItem value="shared" className="text-xs">
                            Shared (Explicitly shared company records)
                          </SelectItem>
                          <SelectItem value="all" className="text-xs">
                            All (Organization-wide data access)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
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
