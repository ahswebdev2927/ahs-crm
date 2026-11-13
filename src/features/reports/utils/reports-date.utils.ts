import { 
  startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, 
  subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  format
} from "date-fns";
import type { ReportDatePreset, DateRangeBounds } from "../types/reports.types";

/**
 * Resolves DateRangeBounds (start/end Date and timestamps) from a preset or custom date range.
 * Pure functional implementation with zero side effects.
 */
export const resolveReportDateBounds = (
  preset: ReportDatePreset,
  fromDate?: string,
  toDate?: string
): DateRangeBounds => {
  const now = new Date();
  let start: Date;
  let end: Date = endOfDay(now);

  if (preset === "custom" && fromDate && toDate) {
    start = startOfDay(new Date(fromDate));
    end = endOfDay(new Date(toDate));
    return {
      startDate: start,
      endDate: end,
      startMs: start.getTime(),
      endMs: end.getTime(),
    };
  }

  switch (preset) {
    case "today":
      start = startOfDay(now);
      break;
    case "7d":
      start = startOfDay(subDays(now, 7));
      break;
    case "30d":
      start = startOfDay(subDays(now, 30));
      break;
    case "this_month":
      start = startOfMonth(now);
      break;
    case "last_month": {
      const prev = subMonths(now, 1);
      start = startOfMonth(prev);
      end = endOfMonth(prev);
      break;
    }
    case "this_quarter":
      start = startOfQuarter(now);
      end = endOfQuarter(now);
      break;
    case "this_year":
      start = startOfYear(now);
      end = endOfYear(now);
      break;
    default:
      start = startOfDay(subDays(now, 30));
      break;
  }

  return {
    startDate: start,
    endDate: end,
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
};

/**
 * Generates discrete time-series bucket intervals for trend charts.
 * - Daily buckets for ranges <= 35 days
 * - Weekly/Monthly buckets for longer ranges
 */
export const generateTrendIntervalBuckets = (
  bounds: DateRangeBounds
): Array<{ startMs: number; endMs: number; label: string }> => {
  const totalDays = Math.ceil((bounds.endMs - bounds.startMs) / (1000 * 60 * 60 * 24));
  const buckets: Array<{ startMs: number; endMs: number; label: string }> = [];

  if (totalDays <= 35) {
    // Daily buckets
    const current = new Date(bounds.startDate);
    while (current.getTime() <= bounds.endMs) {
      const dayStart = startOfDay(current);
      const dayEnd = endOfDay(current);
      buckets.push({
        startMs: dayStart.getTime(),
        endMs: Math.min(dayEnd.getTime(), bounds.endMs),
        label: format(dayStart, "dd MMM"),
      });
      current.setDate(current.getDate() + 1);
    }
  } else {
    // Monthly buckets
    let current = startOfMonth(bounds.startDate);
    while (current.getTime() <= bounds.endMs) {
      const mStart = startOfMonth(current);
      const mEnd = endOfMonth(current);
      buckets.push({
        startMs: Math.max(mStart.getTime(), bounds.startMs),
        endMs: Math.min(mEnd.getTime(), bounds.endMs),
        label: format(mStart, "MMM yyyy"),
      });
      current = startOfMonth(subMonths(current, -1)); // Add 1 month
    }
  }

  return buckets;
};
