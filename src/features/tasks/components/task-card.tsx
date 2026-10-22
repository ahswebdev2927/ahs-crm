"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  User,
  Briefcase,
  Eye,
  Edit,
  Trash2,
  ArrowRight,
  CheckSquare,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { TaskPriorityBadge, TaskDueDateBadge } from "./task-badge";
import type { TaskItem, TaskStatus } from "../types/task.types";

interface TaskCardProps {
  task: TaskItem;
  onView?: (task: TaskItem) => void;
  onEdit?: (task: TaskItem) => void;
  onDelete?: (task: TaskItem) => void;
  onStatusChange?: (task: TaskItem, newStatus: TaskStatus) => void;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  isDragging = false,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";

  const handleCheckboxToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: TaskStatus = isCompleted ? "pending" : "completed";
    onStatusChange?.(task, newStatus);
  };

  return (
    <div
      onClick={() => onView?.(task)}
      className={`group relative flex flex-col gap-2 rounded-lg border border-border/80 bg-card p-3 shadow-2xs hover:shadow-xs hover:border-primary/40 transition-all cursor-pointer ${
        isDragging ? "ring-2 ring-primary/40 shadow-lg" : ""
      } ${isCompleted ? "opacity-75 bg-muted/20" : ""}`}
    >
      {/* Top Header: Checkbox + Title + More menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div onClick={handleCheckboxToggle} className="pt-0.5 shrink-0">
            <Checkbox
              checked={isCompleted}
              aria-label={`Mark task ${task.title} as ${isCompleted ? "pending" : "completed"}`}
            />
          </div>
          <span
            className={`text-xs font-medium text-foreground line-clamp-2 ${
              isCompleted ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </span>
        </div>

        {/* Action Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0 -mr-1 -mt-1"
                aria-label="Task options"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44 text-xs">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onView?.(task);
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(task);
              }}
            >
              <Edit className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Edit Task
            </DropdownMenuItem>
            {task.status !== "completed" ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange?.(task, "completed");
                }}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-2 text-emerald-600 dark:text-emerald-400" />
                Mark Completed
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange?.(task, "pending");
                }}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-2 text-amber-600 dark:text-amber-400" />
                Mark Pending
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(task);
              }}
              className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description excerpt (if present) */}
      {task.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 pl-6">
          {task.description}
        </p>
      )}

      {/* Priority & Due Date Badges + Checklist & Notes Counters */}
      <div className="flex flex-wrap items-center gap-1.5 pl-6 pt-0.5">
        <TaskPriorityBadge priority={task.priority} />
        <TaskDueDateBadge dueDate={task.dueDate} status={task.status} />

        {task.todoCount !== undefined && task.todoCount > 0 && (
          <div
            className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted/60"
            title={`${task.completedTodoCount ?? 0} of ${task.todoCount} checklist items completed`}
          >
            <CheckSquare className="h-3 w-3 text-muted-foreground" />
            <span>
              {task.completedTodoCount ?? 0}/{task.todoCount}
            </span>
          </div>
        )}

        {task.notesCount !== undefined && task.notesCount > 0 && (
          <div
            className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted/60"
            title={`${task.notesCount} note${task.notesCount > 1 ? "s" : ""}`}
          >
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <span>{task.notesCount}</span>
          </div>
        )}
      </div>

      {/* Footer: Linked Lead / Customer + Assignee Avatar */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
        {/* Linked Entity */}
        <div className="min-w-0 flex-1 truncate">
          {task.lead ? (
            <Link
              href={`/sales/leads/${task.lead.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium truncate"
              title={`Lead: ${task.lead.contactName}`}
            >
              <Briefcase className="h-3 w-3 shrink-0" />
              <span className="truncate">{task.lead.contactName}</span>
            </Link>
          ) : task.customer ? (
            <Link
              href={`/sales/customers/${task.customer.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium truncate"
              title={`Customer: ${task.customer.name}`}
            >
              <Briefcase className="h-3 w-3 shrink-0" />
              <span className="truncate">{task.customer.name}</span>
            </Link>
          ) : (
            <span className="text-muted-foreground/60">General task</span>
          )}
        </div>

        {/* Assignee */}
        <div
          className="flex items-center gap-1 shrink-0 text-muted-foreground font-medium"
          title={task.assignedTo ? `Assigned to ${task.assignedTo.name}` : "Unassigned"}
        >
          {task.assignedTo ? (
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
                {task.assignedTo.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] max-w-[80px] truncate">{task.assignedTo.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground/50">
              <User className="h-3 w-3" />
              <span className="text-[10px]">Unassigned</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
