"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  CheckCheck,
  Target,
  Calendar,
  CheckSquare,
  IndianRupee,
  UserCheck,
  Circle,
} from "lucide-react";
import { useNotifications } from "@/features/notifications/hooks";
import {
  NotificationBadge,
  NotificationSoundToggle,
} from "@/features/notifications/components";
import { formatRelativeTime } from "@/features/notifications/components/notification-card";
import type { NotificationCategory } from "@/features/notifications/types";

function getCategoryIcon(category: NotificationCategory) {
  switch (category) {
    case "leads":
      return <Target className="h-4 w-4 text-emerald-500" />;
    case "appointments":
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case "tasks":
      return <CheckSquare className="h-4 w-4 text-violet-500" />;
    case "financials":
      return <IndianRupee className="h-4 w-4 text-amber-500" />;
    case "customers":
      return <UserCheck className="h-4 w-4 text-cyan-500" />;
    case "system":
    default:
      return <Bell className="h-4 w-4 text-zinc-500" />;
  }
}

/**
 * Top Navbar notification bell popover wired to live reactive data,
 * Web Audio chime toggle, and real-time Service Worker sync.
 */
export function NotificationMenu() {
  const { hasPermission } = useAuth();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading,
  } = useNotifications({ page: 1, limit: 6 });

  // Only render notifications entry point if user has permission
  if (!hasPermission("notifications:view")) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground dark:border-input/10 cursor-pointer transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="View notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            <NotificationBadge
              count={unreadCount}
              className="absolute -top-1 -right-1"
            />
          </button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-88 p-1.5 border-border shadow-md dark:border-input/10"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full tabular-nums">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <NotificationSoundToggle />
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline px-1 py-0.5 rounded cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" /> All read
                </button>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1 border-border/60 dark:border-input/5" />

        <div className="max-h-72 overflow-y-auto divide-y divide-border/30">
          {isLoading && notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading alerts...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground select-none">
              All caught up! No notifications.
            </div>
          ) : (
            notifications.map((item) => {
              const itemContent = (
                <div
                  className={`flex items-start gap-2.5 p-2.5 my-0.5 cursor-pointer rounded-md transition-colors hover:bg-muted/60 ${
                    !item.isRead ? "bg-primary/5 font-medium" : ""
                  }`}
                  onClick={() => {
                    if (!item.isRead) markAsRead(item.id);
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs text-foreground font-semibold truncate leading-tight">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 leading-tight">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                  {!item.isRead && (
                    <div className="mt-1 shrink-0">
                      <Circle className="h-1.5 w-1.5 fill-primary text-primary" />
                    </div>
                  )}
                </div>
              );

              if (item.actionUrl) {
                return (
                  <Link
                    key={item.id}
                    href={item.actionUrl}
                    className="block no-underline"
                    onClick={() => {
                      if (!item.isRead) markAsRead(item.id);
                    }}
                  >
                    {itemContent}
                  </Link>
                );
              }

              return (
                <div key={item.id}>
                  {itemContent}
                </div>
              );
            })
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
              View all notifications in Inbox →
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
