"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  CheckCheck,
  Trash2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  BellRing,
} from "lucide-react";
import {
  useNotifications,
  usePushSubscription,
} from "@/features/notifications/hooks";
import {
  NotificationCard,
  NotificationFilters,
  PushPermissionBanner,
  NotificationEmpty,
  NotificationPreferencesDialog,
  type NotificationFilterState,
} from "@/features/notifications/components";
import { updateNotificationPreferencesAction } from "@/features/notifications/actions";
import type {
  NotificationCategory,
  NotificationPreferenceItem,
} from "@/features/notifications/types";

export default function NotificationsPage() {
  const [filterState, setFilterState] = React.useState<NotificationFilterState>({
    readStatus: "all",
    category: "all",
    search: "",
  });

  const [prefsOpen, setPrefsOpen] = React.useState<boolean>(false);

  // Compute hook filter input from filterState
  const hookFilter = React.useMemo(() => {
    return {
      page: 1,
      limit: 15,
      category: filterState.category !== "all" ? (filterState.category as NotificationCategory) : undefined,
      isRead:
        filterState.readStatus === "unread"
          ? false
          : filterState.readStatus === "read"
          ? true
          : undefined,
      search: filterState.search.trim() || undefined,
    };
  }, [filterState]);

  const {
    notifications,
    unreadCount,
    total,
    page,
    limit,
    totalPages,
    isLoading,
    setFilter,
    markAsRead,
    markAllAsRead,
    clearRead,
  } = useNotifications(hookFilter);

  const { subscribeToPush } = usePushSubscription();

  // Keep hook filter synced with UI filter state
  React.useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      page: 1,
      category: hookFilter.category,
      isRead: hookFilter.isRead,
      search: hookFilter.search,
    }));
  }, [hookFilter, setFilter]);

  const handlePageChange = (newPage: number) => {
    setFilter((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetFilters = () => {
    setFilterState({
      readStatus: "all",
      category: "all",
      search: "",
    });
  };

  const handleSavePreferences = async (items: NotificationPreferenceItem[]) => {
    await updateNotificationPreferencesAction({ preferences: items });
  };

  const isFiltered =
    filterState.readStatus !== "all" ||
    filterState.category !== "all" ||
    Boolean(filterState.search.trim());

  const startRecord = total > 0 ? (page - 1) * limit + 1 : 0;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="flex-1 pb-12">
      <PageHeader
        title="Notification Center"
        description="Review all messages, system reminders, lead events, and operational alarms."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "System", href: "/notifications" },
          { label: "Notifications" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPrefsOpen(true)}
              className="h-8 text-xs gap-1.5"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Preferences</span>
            </Button>

            {unreadCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => markAllAsRead()}
                className="h-8 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark All Read</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => clearRead()}
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
              title="Delete all read notifications"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Read</span>
            </Button>
          </div>
        }
      />

      <div className="w-full max-w-5xl mx-auto p-4 sm:p-5 xl:p-6 space-y-4">
        {/* Soft Push Opt-in Banner */}
        <PushPermissionBanner onEnable={subscribeToPush} />

        {/* Filter Toolbar */}
        <NotificationFilters
          filter={filterState}
          onFilterChange={setFilterState}
          unreadCount={unreadCount}
          totalCount={total}
        />

        {/* Notification Stream */}
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-lg border border-border/60 bg-muted/20 animate-pulse"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <NotificationEmpty
            isFiltered={isFiltered}
            onResetFilters={handleResetFilters}
          />
        ) : (
          <div className="space-y-2.5">
            {notifications.map((item) => (
              <NotificationCard
                key={item.id}
                notification={item}
                onMarkRead={markAsRead}
              />
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 pt-4 px-1 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-semibold text-foreground">{startRecord}</span> to{" "}
              <span className="font-semibold text-foreground">{endRecord}</span> of{" "}
              <span className="font-semibold text-foreground">{total}</span> notifications
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page <= 1 || isLoading}
                className="h-8 px-2 text-xs gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </Button>

              <span className="px-2 font-medium text-foreground">
                Page {page} of {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || isLoading}
                className="h-8 px-2 text-xs gap-1"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Preferences Dialog */}
      <NotificationPreferencesDialog
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        onSave={handleSavePreferences}
      />
    </div>
  );
}
