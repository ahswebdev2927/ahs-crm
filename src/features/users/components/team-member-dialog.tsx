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
  const [activeTab, setActiveTab] = React.useState("profile")
  const [showPassword, setShowPassword] = React.useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      roleId: roles[0]?.id || 1,
      departmentId: departments[0]?.id || null,
      teamId: null,
      managerId: null,
      teamName: "",
      dataVisibility: "own" as any,
      status: "active" as any,
      permissions: [],
    },
  })

  // Watch selected role to toggle Manager vs Non-Manager fields
  const selectedRoleId = watch("roleId")
  const selectedRole = roles.find((r) => String(r.id) === String(selectedRoleId))
  const isManagerRole = Boolean(
    (selectedRole as any)?.isManager || selectedRole?.code === "sales_manager"
  )

  React.useEffect(() => {
    if (open) {
      if (memberToEdit) {
        reset({
          name: memberToEdit.name,
          email: memberToEdit.email,
          roleId: memberToEdit.roleId,
          departmentId: memberToEdit.departmentId || null,
          teamId: memberToEdit.teamId || null,
          managerId: memberToEdit.managerId || null,
          teamName: "",
          dataVisibility: memberToEdit.dataVisibility || "own",
          status: memberToEdit.status || "active",
          permissions: [],
        })
      } else {
        reset({
          name: "",
          email: "",
          password: "",
          roleId: roles[0]?.id || 1,
          departmentId: departments[0]?.id || null,
          teamId: null,
          managerId: null,
          teamName: "",
          dataVisibility: "own",
          status: "active",
          permissions: [],
        })
      }
    }
  }, [open, memberToEdit, reset, roles, departments])

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data)
    onOpenChange(false)
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
                {isEditing
                  ? isSuperAdmin
                    ? `Edit Team Member: ${memberToEdit?.name}`
                    : `Edit Access & Status: ${memberToEdit?.name}`
                  : "Add New Team Member"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? isSuperAdmin
                    ? "Update staff details, role, data visibility, or status."
                    : "Update team member data access levels and account status (Active/Inactive)."
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

            <TabsContent value="profile" className="space-y-4 pt-4 min-h-[220px]">
              <div className="space-y-2">
                <label htmlFor="member-name" className="text-xs font-semibold block">
                  Full Name
                </label>
                <Input
                  id="member-name"
                  placeholder="e.g. Sarah Jenkins"
                  className="text-xs"
                  disabled={isSubmitting || !isSuperAdmin}
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
                  disabled={isSubmitting || !isSuperAdmin}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-rose-500 font-medium">{errors.email.message as string}</p>
                )}
              </div>

              {!isEditing && (
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
                      disabled={isSubmitting || !isSuperAdmin}
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
                </div>
              )}
            </TabsContent>

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
                        disabled={isSubmitting || !isSuperAdmin}
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
                        disabled={isSubmitting || !isSuperAdmin}
                      >
                        <SelectTrigger className="text-xs w-full">
                          <SelectValue placeholder="Select Role">
                            {selectedRoleItem ? selectedRoleItem.name : "Select Role"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={String(role.id)} className="text-xs">
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  }}
                />
              </div>

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
                          <SelectItem value="team" className="text-xs">
                            Team (Sales team records & shared assignments)
                          </SelectItem>
                          <SelectItem value="shared" className="text-xs">
                            Shared (Explicitly shared company records)
                          </SelectItem>
                          <SelectItem value="own" className="text-xs">
                            Own (Only leads/records assigned to self)
                          </SelectItem>
                          {isSuperAdmin && (
                            <>
                              <SelectItem value="partnered" className="text-xs">
                                Partnered (Own + Partnered leads)
                              </SelectItem>
                              <SelectItem value="all" className="text-xs">
                                All (Organization-wide data access)
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Account Status</label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                      <SelectTrigger className="text-xs w-full">
                        <SelectValue placeholder="Select Status">
                          {field.value === "active"
                            ? "Active"
                            : field.value === "inactive"
                            ? "Inactive"
                            : field.value === "suspended"
                            ? "Suspended"
                            : field.value}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active" className="text-xs">
                          Active
                        </SelectItem>
                        <SelectItem value="inactive" className="text-xs">
                          Inactive
                        </SelectItem>
                        {isSuperAdmin && (
                          <SelectItem value="suspended" className="text-xs text-rose-600">
                            Suspended
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
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
