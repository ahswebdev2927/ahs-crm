"use client"

import * as React from "react"
import { toast } from "@/components/ui/toast"

export type RoleCode = "super_admin" | "sales_manager" | "inside_sales" | "field_sales"

export interface UserProfile {
  id: string
  name: string
  email: string
  roleCode: RoleCode
  roleName: string
  avatarUrl?: string
  permissions: string[]
}

// Full Permissions list for references
const ALL_PERMISSIONS = [
  "dashboard:view",
  "leads:view",
  "leads:create",
  "leads:edit",
  "pipeline:view",
  "followups:view",
  "followups:create",
  "appointments:view",
  "appointments:create",
  "tasks:view",
  "tasks:create",
  "customers:view",
  "services:view",
  "quotations:view",
  "quotations:create",
  "invoices:view",
  "payments:view",
  "reports:view",
  "notifications:view",
  "team:view",
  "settings:view"
]

export const SIMULATED_USERS: Record<RoleCode, UserProfile> = {
  super_admin: {
    id: "user-admin",
    name: "Alex Thorne",
    email: "alex.thorne@ahs-crm.com",
    roleCode: "super_admin",
    roleName: "Super Admin",
    avatarUrl: undefined,
    permissions: ALL_PERMISSIONS // has all permissions
  },
  sales_manager: {
    id: "user-manager",
    name: "Marcus Vance",
    email: "marcus.vance@ahs-crm.com",
    roleCode: "sales_manager",
    roleName: "Sales Manager",
    avatarUrl: undefined,
    permissions: [
      "dashboard:view",
      "leads:view",
      "leads:create",
      "leads:edit",
      "pipeline:view",
      "followups:view",
      "followups:create",
      "appointments:view",
      "appointments:create",
      "tasks:view",
      "tasks:create",
      "customers:view",
      "services:view",
      "quotations:view",
      "quotations:create",
      "invoices:view",
      "payments:view",
      "reports:view",
      "notifications:view",
      "team:view"
    ]
  },
  inside_sales: {
    id: "user-inside",
    name: "Sarah Jenkins",
    email: "sarah.j@ahs-crm.com",
    roleCode: "inside_sales",
    roleName: "Inside Sales",
    avatarUrl: undefined,
    permissions: [
      "dashboard:view",
      "leads:view",
      "leads:create",
      "leads:edit",
      "pipeline:view",
      "followups:view",
      "followups:create",
      "appointments:view",
      "tasks:view",
      "tasks:create",
      "customers:view",
      "services:view",
      "quotations:view",
      "quotations:create",
      "notifications:view"
    ]
  },
  field_sales: {
    id: "user-field",
    name: "David Miller",
    email: "david.m@ahs-crm.com",
    roleCode: "field_sales",
    roleName: "Field Sales Representative",
    avatarUrl: undefined,
    permissions: [
      "dashboard:view",
      "leads:view",
      "leads:create",
      "leads:edit",
      "pipeline:view",
      "followups:view",
      "followups:create",
      "appointments:view",
      "appointments:create",
      "tasks:view",
      "customers:view",
      "services:view",
      "quotations:view",
      "notifications:view"
    ]
  }
}

interface AuthContextType {
  user: UserProfile
  switchRole: (role: RoleCode) => void
  hasPermission: (permission: string) => boolean
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize with SuperAdmin by default
  const [user, setUser] = React.useState<UserProfile>(SIMULATED_USERS.super_admin)

  // Switch role action
  const switchRole = React.useCallback((roleCode: RoleCode) => {
    const selectedUser = SIMULATED_USERS[roleCode]
    setUser(selectedUser)
    
    // Notify the user visually
    toast.add({
      title: "Role Swapped Successfully",
      description: `Simulating CRM view as ${selectedUser.roleName} (${selectedUser.email})`,
      type: "success"
    })
  }, [])

  // Check permission helper
  const hasPermission = React.useCallback(
    (permission: string) => {
      // Super admin bypasses all checks
      if (user.roleCode === "super_admin") return true
      return user.permissions.includes(permission)
    },
    [user]
  )

  const value = React.useMemo(
    () => ({
      user,
      switchRole,
      hasPermission
    }),
    [user, switchRole, hasPermission]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
