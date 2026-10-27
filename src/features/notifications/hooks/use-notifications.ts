"use client";

import * as React from "react";
import type {
  NotificationItem,
  NotificationListFilter,
  PaginatedNotifications,
} from "../types";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  clearReadNotificationsAction,
} from "../actions/notification-actions";
import { playNotificationSound } from "../components/notification-sound";

interface UseNotificationsOptions {
  pollingIntervalMs?: number; // default 30,000ms (30s)
  enableAudioChime?: boolean;
}

export interface UseNotificationsReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  filter: NotificationListFilter;
  setFilter: React.Dispatch<React.SetStateAction<NotificationListFilter>>;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearRead: () => Promise<void>;
}

/**
 * Functional React hook providing reactive notification data,
 * optimistic updates, 30s background polling, and real-time Service Worker sync.
 */
export function useNotifications(
  initialFilter: NotificationListFilter = {},
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { pollingIntervalMs = 30000, enableAudioChime = true } = options;

  const [filter, setFilter] = React.useState<NotificationListFilter>(initialFilter);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [total, setTotal] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [limit, setLimit] = React.useState<number>(20);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const prevUnreadRef = React.useRef<number>(0);

  const fetchList = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.page) params.set("page", String(filter.page));
      if (filter.limit) params.set("limit", String(filter.limit));
      if (filter.category) params.set("category", filter.category);
      if (filter.isRead !== undefined) params.set("isRead", String(filter.isRead));
      if (filter.search) params.set("search", filter.search);

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) return;

      const json = await res.json();
      const data: PaginatedNotifications = json.data;

      setNotifications(data.items);
      setTotal(data.total);
      setPage(data.page);
      setLimit(data.limit);
      setTotalPages(data.totalPages);
      setUnreadCount(data.unreadCount);

      // If new unread notifications arrived while viewing, chime
      if (enableAudioChime && prevUnreadRef.current !== 0 && data.unreadCount > prevUnreadRef.current) {
        playNotificationSound();
      }
      prevUnreadRef.current = data.unreadCount;
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filter, enableAudioChime]);

  // Initial and on-filter-change fetch
  React.useEffect(() => {
    setIsLoading(true);
    fetchList();
  }, [fetchList]);

  // Background 30-second interval polling for active tab
  React.useEffect(() => {
    if (pollingIntervalMs <= 0) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (!res.ok) return;
        const json = await res.json();
        const currentCount: number = json.data?.unreadCount ?? 0;

        if (currentCount > prevUnreadRef.current) {
          if (enableAudioChime) {
            playNotificationSound();
          }
          fetchList();
        } else if (currentCount !== prevUnreadRef.current) {
          setUnreadCount(currentCount);
        }
        prevUnreadRef.current = currentCount;
      } catch (err) {
        // Silent background polling catch
      }
    }, pollingIntervalMs);

    return () => clearInterval(intervalId);
  }, [pollingIntervalMs, enableAudioChime, fetchList]);

  // Listen for Service Worker background push broadcast messages
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_NOTIFICATION_RECEIVED") {
        if (enableAudioChime) {
          playNotificationSound();
        }
        fetchList();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [enableAudioChime, fetchList]);

  // Optimistic Mark As Read
  const markAsRead = React.useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isRead: true, readAt: new Date() } : item
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await markNotificationReadAction(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      fetchList(); // Rollback on failure
    }
  }, [fetchList]);

  // Optimistic Mark All As Read
  const markAllAsRead = React.useCallback(async () => {
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, isRead: true, readAt: new Date() }))
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsReadAction();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      fetchList();
    }
  }, [fetchList]);

  // Optimistic Clear Read
  const clearRead = React.useCallback(async () => {
    setNotifications((prev) => prev.filter((item) => !item.isRead));

    try {
      await clearReadNotificationsAction();
    } catch (err) {
      console.error("Failed to clear read notifications:", err);
      fetchList();
    }
  }, [fetchList]);

  return {
    notifications,
    unreadCount,
    total,
    page,
    limit,
    totalPages,
    isLoading,
    filter,
    setFilter,
    refetch: fetchList,
    markAsRead,
    markAllAsRead,
    clearRead,
  };
}
