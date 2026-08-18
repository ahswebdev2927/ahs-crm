"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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

export const SIMULATED_USERS: Record<RoleCode, UserProfile> = {
  super_admin: {
    id: "user-admin",
    name: "Alex Thorne",
    email: "alex.thorne@ahs-crm.com",
    roleCode: "super_admin",
    roleName: "Super Admin",
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
      "team:view",
      "settings:view"
    ]
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
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  switchRole: (role: RoleCode) => void
  hasPermission: (permission: string) => boolean
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

/**
 * Maps raw backend API user profile properties to the client UserProfile format
 */
const mapBackendUser = (backendUser: any): UserProfile => {
  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    roleCode: backendUser.role.code as RoleCode,
    roleName: backendUser.role.name,
    permissions: backendUser.permissions || []
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  // Initialize with simulated SuperAdmin as fallback to satisfy static layouts before session check
  const [user, setUser] = React.useState<UserProfile>(SIMULATED_USERS.super_admin)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)

  // 1. Initial Session Check on mount
  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session")
        if (response.ok) {
          const res = await response.json()
          if (res.status && res.data?.user) {
            setUser(mapBackendUser(res.data.user))
          }
        }
      } catch (error) {
        console.error("Session mounting check failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  // 2. Login Action
  const loginAction = React.useCallback(async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })

    const res = await response.json()

    if (!response.ok || !res.status) {
      throw new Error(res.message || "Failed to log in.")
    }

    const mappedUser = mapBackendUser(res.data.user)
    setUser(mappedUser)

    toast.add({
      title: "Welcome Back",
      description: `Logged in successfully as ${mappedUser.name}.`,
      type: "success"
    })
  }, [])

  // 3. Logout Action
  const logoutAction = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.warn("Logout request failed, clearing local state anyway:", error)
    } finally {
      setUser(SIMULATED_USERS.super_admin) // reset to fallback state
      toast.add({
        title: "Logged Out",
        description: "Your session has been terminated.",
        type: "success"
      })
      router.push("/login")
    }
  }, [router])

  // 4. Role Swapping (Development Simulator Toggle Only)
  const switchRole = React.useCallback((roleCode: RoleCode) => {
    if (process.env.NODE_ENV !== "development") {
      toast.add({
        title: "Action Restricted",
        description: "Role simulator is restricted to development mode.",
        type: "error"
      })
      return
    }

    const selectedUser = SIMULATED_USERS[roleCode]
    setUser(selectedUser)
    
    toast.add({
      title: "Simulator: Role Swapped",
      description: `Now viewing layout as ${selectedUser.roleName} (Client-only simulation).`,
      type: "success"
    })
  }, [])

  // 5. Permission Check Helper
  const hasPermission = React.useCallback((permission: string) => {
    // Super Admin bypasses all checks
    if (user.roleCode === "super_admin") return true
    return user.permissions.includes(permission)
  }, [user])

  const value = React.useMemo(() => ({
    user,
    isLoading,
    login: loginAction,
    logout: logoutAction,
    switchRole,
    hasPermission
  }), [user, isLoading, loginAction, logoutAction, switchRole, hasPermission])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
