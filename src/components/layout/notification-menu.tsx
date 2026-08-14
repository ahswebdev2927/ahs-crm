"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Circle, Calendar, Target, PhoneCall } from "lucide-react"

interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  type: "lead" | "appointment" | "followup"
}

export function NotificationMenu() {
  const { hasPermission } = useAuth()
  
  // Simulated notifications
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([
    {
      id: "1",
      title: "New Lead Assigned",
      description: "Acme Corp (Sarah Jenkins) has been assigned to you.",
      time: "10m ago",
      read: false,
      type: "lead"
    },
    {
      id: "2",
      title: "Follow-up Reminder",
      description: "Call Globex Inc regarding contract review.",
      time: "2h ago",
      read: false,
      type: "followup"
    },
    {
      id: "3",
      title: "Appointment Scheduled",
      description: "Onsite visit with Initech set for tomorrow at 2:00 PM.",
      time: "5h ago",
      read: true,
      type: "appointment"
    }
  ])

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.read).length
  }, [notifications])

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "lead":
        return <Target className="h-4 w-4 text-emerald-500" />
      case "appointment":
        return <Calendar className="h-4 w-4 text-blue-500" />
      case "followup":
        return <PhoneCall className="h-4 w-4 text-amber-500" />
    }
  }

  // Only render notifications entry point if user can view notifications
  if (!hasPermission("notifications:view")) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground dark:border-input/10 cursor-pointer transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white tabular-nums ring-2 ring-background">
                {unreadCount}
              </span>
            )}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 p-1.5 border-border shadow-md dark:border-input/10">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between px-2.5 py-2">
            <span className="text-sm font-semibold text-foreground tracking-tight">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-medium text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator className="my-1 border-border/60 dark:border-input/5" />
        
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground select-none">
              All caught up! No notifications.
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleMarkAsRead(n.id)}
                className={`flex items-start gap-3 p-2.5 my-0.5 cursor-pointer rounded-md transition-colors ${!n.read ? "bg-muted/40 font-medium" : ""}`}
              >
                <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                <div className="flex-1 space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs text-foreground font-semibold truncate leading-tight">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 leading-tight">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">
                    {n.description}
                  </p>
                </div>
                {!n.read && (
                  <div className="mt-1 shrink-0">
                    <Circle className="h-1.5 w-1.5 fill-rose-500 text-rose-500" />
                  </div>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
        
        <DropdownMenuSeparator className="my-1 border-border/60 dark:border-input/5" />
        
        <DropdownMenuItem
          className="p-0 justify-center animate-none"
          render={
            <Link
              href="/notifications"
              className="flex w-full items-center justify-center py-2 text-xs font-semibold text-primary hover:text-primary-foreground focus:text-primary-foreground transition-colors hover:bg-muted/80"
            >
              View all notifications
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
