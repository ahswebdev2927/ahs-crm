"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { navigationConfig } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { CommandMenu } from "./command-menu"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"

export function CrmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { hasPermission } = useAuth()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Load sidebar collapse preference from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem("ahs-sidebar-collapsed")
    if (saved !== null) {
      setTimeout(() => {
        setCollapsed(saved === "true")
      }, 0)
    }
  }, [])

  const handleSetCollapsed = (val: boolean) => {
    setCollapsed(val)
    localStorage.setItem("ahs-sidebar-collapsed", String(val))
  }

  // Auto-close mobile sidebar when navigating routes
  React.useEffect(() => {
    setTimeout(() => {
      setMobileOpen(false)
    }, 0)
  }, [pathname])

  const filteredNavGroups = React.useMemo(() => {
    return navigationConfig
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasPermission(item.permission))
      }))
      .filter((group) => group.items.length > 0)
  }, [hasPermission])

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        {/* Desktop Sidebar (hidden on mobile, controlled by collapsed state) */}
        <Sidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} />

        {/* Mobile Drawer Sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col h-full bg-background border-r border-border dark:border-input/10">
            {/* Mobile Sidebar Header */}
            <div className="flex h-16 items-center px-6 border-b border-border/60 dark:border-input/5">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black tracking-tighter">
                  A
                </div>
                <span className="font-extrabold text-sm tracking-widest text-foreground uppercase">
                  AHS <span className="font-light text-muted-foreground">CRM</span>
                </span>
              </Link>
            </div>

            {/* Mobile Sidebar Navigation */}
            <div className="flex-1 overflow-y-auto py-5 px-4 space-y-6">
              {filteredNavGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-2">
                  {group.groupName && (
                    <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none">
                      {group.groupName}
                    </h4>
                  )}
                  <nav className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors select-none",
                            isActive
                              ? "bg-accent text-foreground border-l-2 border-primary rounded-l-none pl-2.5"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-foreground" : "text-muted-foreground/75")} />
                          <span className="truncate leading-none">{item.label}</span>
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Application Container */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Header/Topbar */}
          <Topbar
            onToggleMobileSidebar={() => setMobileOpen(true)}
            onToggleSidebar={() => handleSetCollapsed(!collapsed)}
          />

          {/* Page Body Viewport */}
          <main
            className={cn(
              "flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full bg-zinc-50/40 dark:bg-zinc-950/20",
              pathname.startsWith("/sales/pipeline") ? "overflow-hidden" : "overflow-y-auto"
            )}
          >
            {children}
          </main>
        </div>

        {/* Search Command Palette Overlay */}
        <CommandMenu />
      </div>
    </TooltipProvider>
  )
}
