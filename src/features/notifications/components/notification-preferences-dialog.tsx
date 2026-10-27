"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Sliders, Bell, Globe, Volume2 } from "lucide-react";
import type {
  NotificationCategory,
  NotificationChannelId,
  NotificationPreferenceItem,
  UserPreferencesMap,
} from "../types";

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPreferences?: UserPreferencesMap;
  onSave?: (items: NotificationPreferenceItem[]) => Promise<void> | void;
  loading?: boolean;
}

const CATEGORY_ROWS: { key: NotificationCategory; label: string; desc: string }[] = [
  {
    key: "leads",
    label: "Leads & Prospects",
    desc: "Assignments, ownership transfers, stage wins/losses, and partnership additions.",
  },
  {
    key: "appointments",
    label: "Appointments & Visits",
    desc: "Field schedule assignments, 30m reminders, and visit completions.",
  },
  {
    key: "tasks",
    label: "Tasks & To-Dos",
    desc: "Task assignments, overdue alerts, and team checklist updates.",
  },
  {
    key: "financials",
    label: "Financials & Payments",
    desc: "Payments recorded, overdue invoices, and balance updates.",
  },
];

/**
 * Functional dialog to configure user channel & category notification preferences
 */
export function NotificationPreferencesDialog({
  open,
  onOpenChange,
  initialPreferences,
  onSave,
  loading = false,
}: NotificationPreferencesDialogProps) {
  // State maps [channel][category] = boolean
  const [prefs, setPrefs] = React.useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = React.useState<boolean>(false);

  // Initialize from props
  React.useEffect(() => {
    if (open) {
      const state: Record<string, Record<string, boolean>> = {
        in_app: {},
        push: {},
        sound: {},
      };

      CATEGORY_ROWS.forEach(({ key }) => {
        state.in_app[key] = initialPreferences?.in_app?.[key] ?? true;
        state.push[key] = initialPreferences?.push?.[key] ?? true;
        state.sound[key] = initialPreferences?.sound?.[key] ?? true;
      });

      setPrefs(state);
    }
  }, [open, initialPreferences]);

  const toggle = (channel: NotificationChannelId, category: NotificationCategory) => {
    setPrefs((prev) => {
      const currentChannel = prev[channel] || {};
      const currentVal = currentChannel[category] ?? true;
      return {
        ...prev,
        [channel]: {
          ...currentChannel,
          [category]: !currentVal,
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items: NotificationPreferenceItem[] = [];

      (["in_app", "push", "sound"] as NotificationChannelId[]).forEach((channel) => {
        CATEGORY_ROWS.forEach(({ key }) => {
          items.push({
            channel,
            type: key,
            enabled: prefs[channel]?.[key] ?? true,
          });
        });
      });

      if (onSave) {
        await onSave(items);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save notification preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const defaultState: Record<string, Record<string, boolean>> = {
      in_app: {},
      push: {},
      sound: {},
    };
    CATEGORY_ROWS.forEach(({ key }) => {
      defaultState.in_app[key] = true;
      defaultState.push[key] = true;
      defaultState.sound[key] = true;
    });
    setPrefs(defaultState);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sliders className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Notification Preferences
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Control which channels deliver alerts for each operational category.
          </DialogDescription>
        </DialogHeader>

        {/* Matrix Table */}
        <div className="mt-3 rounded-lg border border-border/80 overflow-hidden divide-y divide-border/60">
          {/* Header */}
          <div className="grid grid-cols-12 bg-muted/40 p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-6">Category</div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1">
              <Bell className="h-3 w-3" /> In-App
            </div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1">
              <Globe className="h-3 w-3" /> Push
            </div>
            <div className="col-span-2 text-center flex items-center justify-center gap-1">
              <Volume2 className="h-3 w-3" /> Sound
            </div>
          </div>

          {/* Rows */}
          {CATEGORY_ROWS.map(({ key, label, desc }) => (
            <div
              key={key}
              className="grid grid-cols-12 items-center p-3 text-xs hover:bg-muted/15 transition-colors gap-1"
            >
              <div className="col-span-6 pr-2">
                <div className="font-medium text-foreground">{label}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">
                  {desc}
                </div>
              </div>

              {/* In-App Toggle */}
              <div className="col-span-2 flex justify-center">
                <Switch
                  checked={prefs.in_app?.[key] ?? true}
                  onCheckedChange={() => toggle("in_app", key)}
                  aria-label={`${label} in-app toggle`}
                />
              </div>

              {/* Web Push Toggle */}
              <div className="col-span-2 flex justify-center">
                <Switch
                  checked={prefs.push?.[key] ?? true}
                  onCheckedChange={() => toggle("push", key)}
                  aria-label={`${label} push toggle`}
                />
              </div>

              {/* Sound Toggle */}
              <div className="col-span-2 flex justify-center">
                <Switch
                  checked={prefs.sound?.[key] ?? true}
                  onCheckedChange={() => toggle("sound", key)}
                  aria-label={`${label} sound toggle`}
                />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-4 flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset Defaults
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || loading}
              className="text-xs font-semibold"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
