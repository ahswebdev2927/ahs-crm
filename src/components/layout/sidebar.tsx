"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { navigationConfig } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  className?: string
}

export function Sidebar({ collapsed, setCollapsed, className }: SidebarProps) {
  const pathname = usePathname()
  const { hasPermission } = useAuth()

  // Filter navigation config based on permissions
  const filteredNavGroups = React.useMemo(() => {
    return navigationConfig
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasPermission(item.permission))
      }))
      .filter((group) => group.items.length > 0)
  }, [hasPermission])

  return (
    <aside
      className={cn(
        "relative hidden md:flex flex-col border-r border-border bg-background transition-all duration-300 ease-in-out shrink-0 select-none dark:border-input/10",
        collapsed ? "w-[68px]" : "w-60 xl:w-64",
        className
      )}
    >
      {/* Brand logo container */}
      <div className="flex h-14 md:h-15 items-center justify-between px-4 xl:px-5 border-b border-border/60 dark:border-input/5">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 xl:h-9 xl:w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black tracking-tighter text-sm xl:text-base">
            A
          </div>
          {!collapsed && (
            <span className="font-extrabold text-xs xl:text-sm tracking-widest text-foreground uppercase animate-in fade-in duration-300">
              AHS <span className="font-light text-muted-foreground">CRM</span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3.5 px-2.5 space-y-4 no-scrollbar">
        {filteredNavGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {/* Group Name eyebrow */}
            {group.groupName && !collapsed && (
              <h4 className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none select-none animate-in fade-in duration-300 mb-1">
                {group.groupName}
              </h4>
            )}
            {group.groupName && collapsed && (
              <div className="h-px bg-border/40 mx-2 my-2 dark:bg-input/5" />
            )}

            {/* Group items */}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                const itemEl = (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs xl:text-sm font-medium transition-all group/item select-none cursor-pointer duration-150 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
                      isActive
                        ? "bg-accent/60 text-foreground border-l-2 border-primary rounded-l-none pl-2"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover/item:scale-105 duration-150",
                        isActive ? "text-foreground" : "text-muted-foreground/75 group-hover/item:text-foreground"
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate leading-none">{item.label}</span>
                    )}
                  </Link>
                )

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger render={itemEl} />
                      <TooltipContent side="right" className="font-semibold text-xs border border-border/80 dark:border-input/10">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return <React.Fragment key={item.href}>{itemEl}</React.Fragment>
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  )
}
