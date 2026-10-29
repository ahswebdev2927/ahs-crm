"use client";

import * as React from "react";
import { BellRing, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

const BANNER_DISMISSED_KEY = "ahs_push_banner_dismissed";

interface PushPermissionBannerProps {
  onEnable?: () => Promise<unknown> | unknown;
  errorMessage?: string | null;
  className?: string;
}

/**
 * Contextual soft-prompt banner inviting the user to enable background Web Push notifications.
 * Disappears once granted, denied, or dismissed.
 */
export function PushPermissionBanner({
  onEnable,
  errorMessage,
  className = "",
}: PushPermissionBannerProps) {
  const [visible, setVisible] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const isDismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === "true";
    if (Notification.permission === "default" && !isDismissed) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(BANNER_DISMISSED_KEY, "true");
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      if (onEnable) {
        const result = await onEnable();
        if (result === false) {
          toast.add({
            type: "warning",
            title: "Push Service Notice",
            description: errorMessage || "Could not register push notifications. In-app alerts remain active.",
          });
          return;
        }
      } else if (typeof window !== "undefined" && "Notification" in window) {
        await Notification.requestPermission();
      }

      toast.add({
        type: "success",
        title: "Notifications Enabled",
        description: "You will receive desktop and mobile push alerts.",
      });
      setVisible(false);
    } catch (err) {
      console.warn("Push permission request notice:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5 shadow-2xs ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BellRing className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              Enable Background Notifications
            </h4>
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <ShieldCheck className="h-3 w-3" /> Real-time
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Get instant desktop and mobile push alerts for newly assigned leads, appointments, and urgent tasks—even when CRM is closed.
          </p>
          {errorMessage && (
            <p className="mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleDismiss}
          className="h-8 text-xs text-muted-foreground"
        >
          Maybe Later
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleEnable}
          disabled={loading}
          className="h-8 text-xs font-semibold shadow-xs"
        >
          {loading ? "Enabling..." : "Enable Alerts"}
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
