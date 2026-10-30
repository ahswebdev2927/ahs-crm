"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DATE_FILTER_PRESETS,
  DateFilterPreset,
  detectPresetFromRange,
  formatDateRangeForApi,
  getDateRangeFromPreset,
  parseDateRangeFromApi,
} from "@/lib/date-filters";

export interface TableDateFilterProps {
  label?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  onDateRangeChange: (range: {
    dateFrom?: string;
    dateTo?: string;
    preset?: DateFilterPreset;
  }) => void;
  className?: string;
  disabled?: boolean;
}

export function TableDateFilter({
  label = "Date",
  dateFrom,
  dateTo,
  onDateRangeChange,
  className,
  disabled = false,
}: TableDateFilterProps) {
  const [open, setOpen] = React.useState(false);

  // Parse strings into Date objects
  const { from, to } = React.useMemo(
    () => parseDateRangeFromApi(dateFrom, dateTo),
    [dateFrom, dateTo]
  );

  const activePreset = React.useMemo(
    () => detectPresetFromRange(from, to),
    [from, to]
  );

  // Local calendar range state for interactive picking before commit
  const [interactiveRange, setInteractiveRange] = React.useState<DateRange | undefined>(undefined);

  const effectiveCalendarRange = interactiveRange ?? (from ? { from, to: to || from } : undefined);

  const handleSelectPreset = (preset: DateFilterPreset) => {
    if (preset === "all_time") {
      onDateRangeChange({ dateFrom: undefined, dateTo: undefined, preset: "all_time" });
      setInteractiveRange(undefined);
      setOpen(false);
      return;
    }

    const calculated = getDateRangeFromPreset(preset);
    const apiRange = formatDateRangeForApi(calculated);
    onDateRangeChange({ ...apiRange, preset });
    setInteractiveRange(undefined);
    setOpen(false);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setInteractiveRange(range);
    if (range?.from && range?.to) {
      const apiRange = formatDateRangeForApi({ from: range.from, to: range.to });
      onDateRangeChange({ ...apiRange, preset: "custom" });
      setInteractiveRange(undefined);
      setOpen(false);
    } else if (range?.from && !range?.to) {
      // Single date selected so far
      const apiRange = formatDateRangeForApi({ from: range.from, to: range.from });
      onDateRangeChange({ ...apiRange, preset: "custom" });
    } else if (!range) {
      onDateRangeChange({ dateFrom: undefined, dateTo: undefined, preset: "all_time" });
      setInteractiveRange(undefined);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateRangeChange({ dateFrom: undefined, dateTo: undefined, preset: "all_time" });
    setInteractiveRange(undefined);
  };

  // Determine display text for the trigger button
  const triggerLabel = React.useMemo(() => {
    if (!from && !to) {
      return `${label}: All`;
    }

    if (activePreset !== "custom") {
      const option = DATE_FILTER_PRESETS.find((p) => p.id === activePreset);
      return `${label}: ${option ? option.label : "Active"}`;
    }

    if (from && to && !Boolean(from.getTime() === to.getTime())) {
      return `${label}: ${format(from, "MMM d")} - ${format(to, "MMM d, yyyy")}`;
    }

    if (from) {
      return `${label}: ${format(from, "MMM d, yyyy")}`;
    }

    return `${label}: All`;
  }, [from, to, activePreset, label]);

  const isFiltered = Boolean(from || to);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              "h-9 justify-start text-xs font-normal border-border bg-background hover:bg-muted/60 dark:border-input dark:bg-input/20 px-2.5 group relative",
              isFiltered && "border-primary/50 text-foreground bg-primary/5 font-medium",
              className
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
            <span className="truncate max-w-[180px]">{triggerLabel}</span>
            {isFiltered && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
                className="ml-1.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear date filter"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent
        className="w-auto p-0 border border-border bg-popover rounded-xl shadow-lg flex flex-col md:flex-row overflow-hidden z-50"
        align="start"
      >
        {/* Presets Sidebar */}
        <div className="flex flex-col gap-1 p-3 border-b md:border-b-0 md:border-r border-border bg-muted/20 min-w-[140px]">
          <span className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
            Presets
          </span>
          {DATE_FILTER_PRESETS.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <Button
                key={preset.id}
                type="button"
                variant={isSelected ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleSelectPreset(preset.id)}
                className={cn(
                  "justify-start text-xs h-7 px-2 font-normal rounded-md text-left",
                  isSelected && "font-semibold bg-primary/10 text-primary hover:bg-primary/15"
                )}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>

        {/* Custom Calendar Range Picker */}
        <div className="p-3">
          <Calendar
            mode="range"
            defaultMonth={from || new Date()}
            selected={effectiveCalendarRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={1}
            className="rounded-md"
          />
          <div className="flex items-center justify-between pt-2 border-t border-border mt-2 text-xs">
            <span className="text-muted-foreground text-[11px]">
              {from ? (
                <>
                  {format(from, "MMM d, yyyy")}
                  {to && ` - ${format(to, "MMM d, yyyy")}`}
                </>
              ) : (
                "Select start & end date"
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSelectPreset("all_time")}
              className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2"
            >
              Reset
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
