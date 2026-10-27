"use client";

import * as React from "react";

interface NotificationBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  className?: string;
}

/**
 * Functional unread notification count badge with tabular numbers
 * and subtle pulse indicator.
 */
export function NotificationBadge({
  count,
  max = 99,
  showZero = false,
  className = "",
}: NotificationBadgeProps) {
  if (count <= 0 && !showZero) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : `${count}`;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-rose-500 text-white font-extrabold text-[10px] leading-none tabular-nums px-1.5 py-0.5 min-w-[18px] h-[18px] ring-2 ring-background shadow-xs select-none transition-transform duration-200 ${className}`}
      aria-label={`${count} unread notifications`}
    >
      {displayCount}
    </span>
  );
}
