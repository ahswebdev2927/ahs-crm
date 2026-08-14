"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Menu, Search, ChevronRight } from "lucide-react"
import { UserMenu } from "./user-menu"
import { NotificationMenu } from "./notification-menu"

interface TopbarProps {
  onToggleMobileSidebar: () => void
}

export function Topbar({ onToggleMobileSidebar }: TopbarProps) {
  const pathname = usePathname()

  // Generate breadcrumb items from URL
  const breadcrumbItems = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    
    const segmentNameMap: Record<string, string> = {
      dashboard: "Dashboard",
      sales: "Sales",
      leads: "Leads",
      pipeline: "Pipeline",
      "follow-ups": "Follow-ups",
      appointments: "Appointments",
      tasks: "Tasks",
      customers: "Customers",
      services: "Services",
      quotations: "Quotations",
      invoices: "Invoices",
      payments: "Payments",
      reports: "Reports",
      notifications: "Notifications",
      team: "Team Management",
      settings: "Settings"
    }

    return segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/")
      const label = segmentNameMap[segment] || (segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "))
      const isLast = index === segments.length - 1
      
      return { label, href, isLast }
    })
  }, [pathname])

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent("ahs-toggle-command-menu"))
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-4 md:px-6 backdrop-blur-md dark:border-input/10 select-none">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground md:hidden dark:border-input/10 cursor-pointer"
          aria-label="Toggle Mobile Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-muted-foreground min-w-0">
          <Link href="/dashboard" className="hover:text-foreground transition-colors shrink-0">
            CRM
          </Link>
          {breadcrumbItems.length > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
          {breadcrumbItems.map((item, idx) => (
            <React.Fragment key={item.href}>
              {idx > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
              {item.isLast ? (
                <span className="text-foreground truncate font-bold max-w-[120px] md:max-w-[200px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors truncate max-w-[120px] md:max-w-[200px]"
                >
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Command Menu Search Trigger */}
        <button
          onClick={handleOpenSearch}
          className="hidden sm:flex h-9 w-60 items-center justify-between rounded-lg border border-border/80 bg-muted/30 px-3 text-xs text-muted-foreground hover:bg-muted/65 hover:text-foreground transition-all duration-150 cursor-pointer dark:border-input/10"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search routes, simulator...</span>
          </span>
          <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground font-mono">Ctrl+K</kbd>
        </button>
        
        {/* Mobile-only Search Button */}
        <button
          onClick={handleOpenSearch}
          className="flex sm:hidden h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground dark:border-input/10 cursor-pointer"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications Popover */}
        <NotificationMenu />

        {/* User Dropdown Menu */}
        <UserMenu />
      </div>
    </header>
  )
}
