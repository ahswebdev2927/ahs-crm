"use client";

import * as React from "react";
import Link from "next/link";
import {
  Target,
  Calendar,
  CheckSquare,
  IndianRupee,
  UserCheck,
  Bell,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotificationItem, NotificationCategory } from "../types";

/**
 * Formats a Date object into a readable relative time string (e.g., 'Just now', '15m ago', '2h ago', 'Yesterday')
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(date).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

function getCategoryConfig(category: NotificationCategory) {
  switch (category) {
    case "leads":
      return {
        icon: Target,
        badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        label: "Lead",
      };
    case "appointments":
      return {
        icon: Calendar,
        badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        label: "Appointment",
      };
    case "tasks":
      return {
        icon: CheckSquare,
        badgeBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
        iconColor: "text-violet-600 dark:text-violet-400",
        label: "Task",
      };
    case "financials":
      return {
        icon: IndianRupee,
        badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        iconColor: "text-amber-600 dark:text-amber-400",
        label: "Financial",
      };
    case "customers":
      return {
        icon: UserCheck,
        badgeBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
        iconColor: "text-cyan-600 dark:text-cyan-400",
        label: "Customer",
      };
    case "system":
    default:
      return {
        icon: Bell,
        badgeBg: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
        iconColor: "text-zinc-600 dark:text-zinc-400",
        label: "System",
      };
  }
}

interface NotificationCardProps {
  notification: NotificationItem;
  onMarkRead?: (id: string) => void;
  onClick?: (notification: NotificationItem) => void;
  compact?: boolean;
}

/**
 * Functional component displaying an individual notification item
 * with category-coded styling, action links, and quick mark-read control.
 */
export function NotificationCard({
  notification,
  onMarkRead,
  onClick,
  compact = false,
}: NotificationCardProps) {
  const config = getCategoryConfig(notification.category);
  const IconComponent = config.icon;
  const isUnread = !notification.isRead;

  const handleMarkRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkRead?.(notification.id);
  };

  const content = (
    <div
      onClick={() => onClick?.(notification)}
      className={`group relative flex items-start gap-3 rounded-lg border transition-all duration-150 ${
        compact ? "p-2.5 text-xs" : "p-4 text-sm"
      } ${
        isUnread
          ? "border-primary/30 bg-primary/5 hover:bg-primary/10 shadow-2xs"
          : "border-border/60 bg-card hover:bg-muted/30 opacity-80 hover:opacity-100"
      }`}
    >
      {/* Category Icon */}
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg border ${config.badgeBg} ${
          compact ? "h-7 w-7" : "h-9 w-9"
        }`}
      >
        <IconComponent className={compact ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} />
      </div>

      {/* Message & Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-foreground truncate">
              {notification.title}
            </span>
            {isUnread && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            )}
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>

        <p className={`mt-0.5 text-muted-foreground line-clamp-2 ${compact ? "text-[11px]" : "text-xs leading-relaxed"}`}>
          {notification.message}
        </p>

        {/* Footer info: Category badge & Action hint */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.badgeBg}`}>
            {config.label}
          </span>

          <div className="flex items-center gap-1">
            {notification.actionUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                View <ExternalLink className="h-3 w-3" />
              </span>
            )}

            {isUnread && onMarkRead && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMarkRead}
                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                title="Mark as read"
              >
                <Check className="h-3 w-3 mr-1" />
                Read
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
