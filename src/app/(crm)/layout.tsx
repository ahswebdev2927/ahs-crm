"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { CrmShell } from "@/components/layout/crm-shell"
import { navigationConfig } from "@/lib/navigation"
import { ErrorState } from "@/components/shared/error-state"

function PermissionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { hasPermission, user } = useAuth()

  // Find the required permission code for the active route
  const requiredPermission = React.useMemo(() => {
    // Loop through the groups and items to find a matching prefix
    for (const group of navigationConfig) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(item.href + "/")) {
          return item.permission
        }
      }
    }
    return null
  }, [pathname])

  // Validate permission
  const isAuthorized = React.useMemo(() => {
    if (!requiredPermission) return true
    return hasPermission(requiredPermission)
  }, [requiredPermission, hasPermission])

  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto p-8 py-16 animate-in fade-in duration-300">
        <ErrorState
          title="Access Denied"
          message={`Your current role (${user.roleName}) is not authorized to access this module (${pathname}). Use the user menu dropdown in the top-right to simulate a role with higher privileges.`}
        />
      </div>
    )
  }

  return <>{children}</>
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CrmShell>
        <PermissionGuard>{children}</PermissionGuard>
      </CrmShell>
    </AuthProvider>
  )
}
