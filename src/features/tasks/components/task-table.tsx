"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowRight,
  Briefcase,
  User,
  CheckSquare,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { TaskPriorityBadge, TaskStatusBadge, TaskDueDateBadge } from "./task-badge";
import type { TaskItem, TaskStatus } from "../types/task.types";

interface TaskTableProps {
  tasks: TaskItem[];
  onViewTask: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (task: TaskItem) => void;
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => void;
  onCreateTask?: () => void;
  isLoading?: boolean;
}

export function TaskTable({
  tasks,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onCreateTask,
  isLoading = false,
}: TaskTableProps) {
  if (tasks.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-border bg-card">
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <CheckSquare className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No tasks found</h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
          No tasks match the selected filters or there are no tasks created yet.
        </p>
        {onCreateTask && (
          <Button size="sm" onClick={onCreateTask} className="text-xs">
            Create First Task
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-border/70 bg-card overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-10 text-center">Done</TableHead>
              <TableHead className="min-w-[220px]">Task Title</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[130px]">Due Date</TableHead>
              <TableHead className="min-w-[150px]">Associated To</TableHead>
              <TableHead className="w-[140px]">Assignee</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const isCompleted = task.status === "completed";

              return (
                <TableRow
                  key={task.id}
                  className={`group transition-colors hover:bg-muted/40 ${
                    isCompleted ? "opacity-75 bg-muted/10" : ""
                  }`}
                >
                  {/* Done Fast-Toggle Checkbox */}
                  <TableCell className="text-center py-2.5">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={(checked) => {
                        onStatusChange(task, checked ? "completed" : "pending");
                      }}
                      aria-label={`Toggle task completion: ${task.title}`}
                    />
                  </TableCell>

                  {/* Task Title & Description */}
                  <TableCell className="py-2.5">
                    <div
                      onClick={() => onViewTask(task)}
                      className="cursor-pointer group/title"
                    >
                      <div
                        className={`text-xs font-semibold group-hover/title:text-primary transition-colors line-clamp-1 ${
                          isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {task.description}
                        </p>
                      )}
                      {((task.todoCount !== undefined && task.todoCount > 0) ||
                        (task.notesCount !== undefined && task.notesCount > 0)) && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {task.todoCount !== undefined && task.todoCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded font-medium"
                              title={`${task.completedTodoCount ?? 0} of ${task.todoCount} checklist items completed`}
                            >
                              <CheckSquare className="h-3 w-3" />
                              {task.completedTodoCount ?? 0}/{task.todoCount}
                            </span>
                          )}
                          {task.notesCount !== undefined && task.notesCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded font-medium"
                              title={`${task.notesCount} note${task.notesCount > 1 ? "s" : ""}`}
                            >
                              <MessageSquare className="h-3 w-3" />
                              {task.notesCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Priority */}
                  <TableCell className="py-2.5">
                    <TaskPriorityBadge priority={task.priority} />
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-2.5">
                    <TaskStatusBadge status={task.status} />
                  </TableCell>

                  {/* Due Date */}
                  <TableCell className="py-2.5">
                    <TaskDueDateBadge dueDate={task.dueDate} status={task.status} />
                  </TableCell>

                  {/* Associated Lead or Customer */}
                  <TableCell className="py-2.5 text-xs">
                    {task.lead ? (
                      <Link
                        href={`/sales/leads/${task.lead.id}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium truncate max-w-[170px]"
                      >
                        <Briefcase className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{task.lead.contactName}</span>
                      </Link>
                    ) : task.customer ? (
                      <Link
                        href={`/sales/customers/${task.customer.id}`}
                        className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-medium truncate max-w-[170px]"
                      >
                        <Briefcase className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{task.customer.name}</span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground/60 text-[11px]">—</span>
                    )}
                  </TableCell>

                  {/* Assignee */}
                  <TableCell className="py-2.5 text-xs">
                    {task.assignedTo ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                          {task.assignedTo.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[110px] text-[11px] font-medium text-foreground">
                          {task.assignedTo.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground/60 text-[11px]">
                        <User className="h-3 w-3" />
                        <span>Unassigned</span>
                      </div>
                    )}
                  </TableCell>

                  {/* Row Actions Dropdown */}
                  <TableCell className="text-right py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            aria-label="Actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-44 text-xs">
                        <DropdownMenuItem onClick={() => onViewTask(task)}>
                          <Eye className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditTask(task)}>
                          <Edit className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                          Edit Task
                        </DropdownMenuItem>
                        {task.status !== "completed" ? (
                          <DropdownMenuItem onClick={() => onStatusChange(task, "completed")}>
                            <ArrowRight className="h-3.5 w-3.5 mr-2 text-emerald-600 dark:text-emerald-400" />
                            Mark Completed
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => onStatusChange(task, "pending")}>
                            <ArrowRight className="h-3.5 w-3.5 mr-2 text-amber-600 dark:text-amber-400" />
                            Mark Pending
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteTask(task)}
                          className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
