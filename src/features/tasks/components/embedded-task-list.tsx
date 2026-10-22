"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, CheckSquare, MessageSquare, MoreHorizontal, Edit, Trash2, Eye, User, Loader2 } from "lucide-react";
import { TaskPriorityBadge, TaskDueDateBadge } from "./task-badge";
import { TaskDialog } from "./task-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import type { TaskItem, TaskStatus } from "../types/task.types";

interface EmbeddedTaskListProps {
  leadId?: string;
  customerId?: string;
  canUserEdit?: boolean;
}

export function EmbeddedTaskList({
  leadId,
  customerId,
  canUserEdit = true,
}: EmbeddedTaskListProps) {
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [taskToEdit, setTaskToEdit] = React.useState<TaskItem | null>(null);
  const [taskToView, setTaskToView] = React.useState<TaskItem | null>(null);

  const reloadTasks = React.useCallback(async () => {
    const queryParam = leadId ? `leadId=${leadId}` : customerId ? `customerId=${customerId}` : "";
    if (!queryParam) return;

    try {
      const res = await fetch(`/api/tasks?${queryParam}&limit=100`);
      const data = await res.json();
      if (res.ok && data?.data?.tasks) {
        setTasks(data.data.tasks);
      }
    } catch {
      // silent fetch failure fallback
    }
  }, [leadId, customerId]);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      const queryParam = leadId ? `leadId=${leadId}` : customerId ? `customerId=${customerId}` : "";
      if (!queryParam) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/tasks?${queryParam}&limit=100`);
        const data = await res.json();
        if (!ignore && res.ok && data?.data?.tasks) {
          setTasks(data.data.tasks);
        }
      } catch {
        // silent
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [leadId, customerId]);

  const handleStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      reloadTasks();
    } catch {
      reloadTasks(); // rollback
    }
  };

  const handleSaveTask = async (data: Record<string, unknown>) => {
    const isEdit = Boolean(taskToEdit);
    const url = isEdit ? `/api/tasks/${taskToEdit!.id}` : "/api/tasks";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to save task");
    }

    setTaskToEdit(null);
    reloadTasks();
  };

  const handleDeleteTask = async (task: TaskItem) => {
    if (!confirm(`Are you sure you want to delete task "${task.title}"?`)) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      reloadTasks();
    } catch {
      alert("Failed to delete task.");
    }
  };

  const activeCount = tasks.filter((t) => t.status !== "completed").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Tasks</span>
          <span className="text-[11px] text-muted-foreground">
            ({activeCount} open, {completedCount} completed)
          </span>
        </div>

        {canUserEdit && (
          <Button
            size="sm"
            onClick={() => {
              setTaskToEdit(null);
              setIsDialogOpen(true);
            }}
            className="h-7 text-xs px-2.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Task
          </Button>
        )}
      </div>

      {/* Task List or States */}
      {isLoading ? (
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="h-28 flex flex-col items-center justify-center text-center p-3">
            <CheckSquare className="h-6 w-6 text-muted-foreground/60 mb-1" />
            <p className="text-xs font-medium text-muted-foreground">No tasks linked</p>
            {canUserEdit && (
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                Click &quot;Add Task&quot; above to track action items for this record.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isCompleted = task.status === "completed";

            return (
              <div
                key={task.id}
                onClick={() => setTaskToView(task)}
                className={`group flex items-start justify-between gap-3 p-3 rounded-lg border border-border/80 bg-card hover:border-primary/40 transition-all cursor-pointer shadow-2xs ${
                  isCompleted ? "opacity-75 bg-muted/20" : ""
                }`}
              >
                {/* Checkbox + Title + Description */}
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(task, isCompleted ? "pending" : "completed");
                    }}
                    className="pt-0.5 shrink-0"
                  >
                    <Checkbox
                      checked={isCompleted}
                      disabled={!canUserEdit}
                      aria-label={`Mark task ${task.title} as ${isCompleted ? "pending" : "completed"}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div
                      className={`text-xs font-medium ${
                        isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
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

                      {task.assignedTo ? (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{task.assignedTo.name}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Dropdown Options */}
                {canUserEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-40 text-xs">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskToView(task);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskToEdit(task);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task);
                        }}
                        className="text-rose-600 dark:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <TaskDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        taskToEdit={taskToEdit}
        initialLeadId={leadId || null}
        initialCustomerId={customerId || null}
        onSubmit={handleSaveTask}
      />

      {/* Detail Dialog */}
      <TaskDetailDialog
        task={taskToView}
        open={Boolean(taskToView)}
        onOpenChange={(open) => !open && setTaskToView(null)}
        onEdit={(task) => {
          setTaskToView(null);
          setTaskToEdit(task);
          setIsDialogOpen(true);
        }}
        onDelete={(task) => {
          handleDeleteTask(task);
          setTaskToView(null);
        }}
        onStatusChange={(task, newStatus) => {
          handleStatusChange(task, newStatus);
          setTaskToView((prev) => (prev ? { ...prev, status: newStatus } : null));
        }}
        onRefresh={() => {
          reloadTasks();
          if (taskToView) {
            fetch(`/api/tasks/${taskToView.id}`)
              .then((r) => r.json())
              .then((d) => {
                if (d?.data?.task) setTaskToView(d.data.task);
              })
              .catch(() => {});
          }
        }}
      />
    </div>
  );
}
