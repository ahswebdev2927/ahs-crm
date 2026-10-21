import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isPast, isTomorrow, parseISO } from "date-fns";
import { AlertCircle, Clock, CheckCircle2, Flame } from "lucide-react";
import type { TaskPriority, TaskStatus } from "../types/task.types";

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  switch (priority) {
    case "critical":
      return (
        <Badge
          variant="outline"
          className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 font-semibold text-[10px] uppercase tracking-wider gap-1"
        >
          <Flame className="h-3 w-3 text-rose-600 dark:text-rose-400" />
          Critical
        </Badge>
      );
    case "high":
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 font-semibold text-[10px] uppercase tracking-wider"
        >
          High
        </Badge>
      );
    case "medium":
      return (
        <Badge
          variant="outline"
          className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60 text-[10px] uppercase tracking-wider"
        >
          Medium
        </Badge>
      );
    case "low":
    default:
      return (
        <Badge
          variant="outline"
          className="bg-muted text-muted-foreground border-border text-[10px] uppercase tracking-wider"
        >
          Low
        </Badge>
      );
  }
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 text-[10px] uppercase tracking-wider font-semibold gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    case "in_progress":
      return (
        <Badge
          variant="outline"
          className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60 text-[10px] uppercase tracking-wider font-semibold"
        >
          In Progress
        </Badge>
      );
    case "deferred":
      return (
        <Badge
          variant="outline"
          className="bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider"
        >
          Deferred
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 text-[10px] uppercase tracking-wider font-semibold"
        >
          Pending
        </Badge>
      );
  }
}

export function TaskDueDateBadge({
  dueDate,
  status,
}: {
  dueDate: Date | string | null;
  status: TaskStatus;
}) {
  if (!dueDate) {
    return <span className="text-muted-foreground text-xs">No due date</span>;
  }

  const dateObj = typeof dueDate === "string" ? parseISO(dueDate) : new Date(dueDate);

  if (isNaN(dateObj.getTime())) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const isCompleted = status === "completed";
  const overdue = !isCompleted && isPast(dateObj) && !isToday(dateObj);

  let label = format(dateObj, "MMM d, yyyy");
  if (isToday(dateObj)) {
    label = "Today";
  } else if (isTomorrow(dateObj)) {
    label = "Tomorrow";
  }

  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
        <AlertCircle className="h-3 w-3 shrink-0" />
        Overdue ({label})
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        isCompleted
          ? "text-muted-foreground line-through"
          : isToday(dateObj)
          ? "font-semibold text-amber-600 dark:text-amber-400"
          : "text-muted-foreground"
      }`}
    >
      <Clock className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}
