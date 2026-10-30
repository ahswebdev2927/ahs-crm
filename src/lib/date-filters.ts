import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  isSameDay,
} from "date-fns";

export type DateFilterPreset =
  | "all_time"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "this_month"
  | "last_month"
  | "custom";

export interface DateFilterPresetOption {
  id: DateFilterPreset;
  label: string;
}

export const DATE_FILTER_PRESETS: DateFilterPresetOption[] = [
  { id: "all_time", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last_7_days", label: "Last 7 Days" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "custom", label: "Custom Range" },
];

export interface DateRangeSelection {
  from?: Date;
  to?: Date;
  preset?: DateFilterPreset;
}

/**
 * Calculates start and end Date objects for a given quick filter preset.
 */
export function getDateRangeFromPreset(
  preset: DateFilterPreset,
  referenceDate: Date = new Date()
): { from?: Date; to?: Date } {
  switch (preset) {
    case "today": {
      return {
        from: startOfDay(referenceDate),
        to: endOfDay(referenceDate),
      };
    }
    case "yesterday": {
      const yesterday = subDays(referenceDate, 1);
      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      };
    }
    case "last_7_days": {
      return {
        from: startOfDay(subDays(referenceDate, 6)),
        to: endOfDay(referenceDate),
      };
    }
    case "this_month": {
      return {
        from: startOfMonth(referenceDate),
        to: endOfMonth(referenceDate),
      };
    }
    case "last_month": {
      const lastMonth = subMonths(referenceDate, 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    }
    case "all_time":
    case "custom":
    default:
      return { from: undefined, to: undefined };
  }
}

/**
 * Serializes Date objects into ISO 8601 strings for API query parameters.
 * Handles boundary expansion: `from` is clamped to start of day, `to` is clamped to end of day.
 */
export function formatDateRangeForApi(range?: {
  from?: Date;
  to?: Date;
}): { dateFrom?: string; dateTo?: string } {
  if (!range) return {};
  const result: { dateFrom?: string; dateTo?: string } = {};

  if (range.from) {
    result.dateFrom = startOfDay(range.from).toISOString();
  }

  if (range.to) {
    result.dateTo = endOfDay(range.to).toISOString();
  } else if (range.from) {
    // If only 'from' is selected, set 'to' to end of the same day for a single-day query
    result.dateTo = endOfDay(range.from).toISOString();
  }

  return result;
}

/**
 * Deserializes ISO strings from query parameters into Date objects.
 */
export function parseDateRangeFromApi(
  dateFrom?: string | null,
  dateTo?: string | null
): { from?: Date; to?: Date } {
  const from = dateFrom ? new Date(dateFrom) : undefined;
  const to = dateTo ? new Date(dateTo) : undefined;

  const validFrom = from && !isNaN(from.getTime()) ? from : undefined;
  const validTo = to && !isNaN(to.getTime()) ? to : undefined;

  return { from: validFrom, to: validTo };
}

/**
 * Matches an existing date range against known presets (e.g. today, yesterday, last 7 days).
 */
export function detectPresetFromRange(
  from?: Date,
  to?: Date,
  referenceDate: Date = new Date()
): DateFilterPreset {
  if (!from && !to) {
    return "all_time";
  }

  if (!from) return "custom";
  const effectiveTo = to || from;

  for (const preset of ["today", "yesterday", "last_7_days", "this_month", "last_month"] as const) {
    const range = getDateRangeFromPreset(preset, referenceDate);
    if (
      range.from &&
      range.to &&
      isSameDay(range.from, from) &&
      isSameDay(range.to, effectiveTo)
    ) {
      return preset;
    }
  }

  return "custom";
}
