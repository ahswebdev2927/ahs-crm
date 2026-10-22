"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  CheckSquare,
  ListTodo,
} from "lucide-react";
import { format } from "date-fns";
import type { TaskTodoItem } from "../types/task.types";

interface TaskChecklistProps {
  taskId: string;
  onTodosChange?: () => void;
  disabled?: boolean;
}

export function TaskChecklist({
  taskId,
  onTodosChange,
  disabled = false,
}: TaskChecklistProps) {
  const [todos, setTodos] = React.useState<TaskTodoItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newTitle, setNewTitle] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  // In-line editing state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  const reloadTodos = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/todos`);
      if (res.ok) {
        const json = await res.json();
        setTodos(json.data?.todos || []);
      }
    } catch (err) {
      console.error("Failed to fetch task todos:", err);
    }
  }, [taskId]);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/tasks/${taskId}/todos`);
        if (res.ok && !ignore) {
          const json = await res.json();
          setTodos(json.data?.todos || []);
        }
      } catch (err) {
        console.error("Failed to fetch task todos:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [taskId]);

  const completedCount = todos.filter((t) => t.isCompleted).length;
  const totalCount = todos.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddTodo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed || isAdding || disabled) return;

    setIsAdding(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (res.ok) {
        const json = await res.json();
        const createdTodo = json.data?.todo;
        if (createdTodo) {
          setTodos((prev) => [...prev, createdTodo]);
          setNewTitle("");
          onTodosChange?.();
        }
      }
    } catch (err) {
      console.error("Failed to add checklist item:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (todo: TaskTodoItem) => {
    if (disabled) return;
    const nextCompleted = !todo.isCompleted;

    // Optimistic update
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? {
              ...t,
              isCompleted: nextCompleted,
              completedAt: nextCompleted ? new Date() : null,
            }
          : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data?.todo;
        if (updated) {
          setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
          onTodosChange?.();
        }
      } else {
        // Rollback
        reloadTodos();
      }
    } catch (err) {
      console.error("Failed to toggle todo:", err);
      reloadTodos();
    }
  };

  const startEdit = (todo: TaskTodoItem) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const saveEdit = async (todoId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed || isUpdating) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data?.todo;
        if (updated) {
          setTodos((prev) => prev.map((t) => (t.id === todoId ? updated : t)));
          setEditingId(null);
          setEditingTitle("");
          onTodosChange?.();
        }
      }
    } catch (err) {
      console.error("Failed to update todo:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (todoId: string) => {
    if (disabled) return;
    // Optimistic remove
    setTodos((prev) => prev.filter((t) => t.id !== todoId));

    try {
      const res = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onTodosChange?.();
      } else {
        reloadTodos();
      }
    } catch (err) {
      console.error("Failed to delete todo:", err);
      reloadTodos();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading checklist...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      {totalCount > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-foreground">
              <CheckSquare className="h-4 w-4 text-primary" />
              Checklist Progress
            </span>
            <span className="text-muted-foreground font-mono">
              {completedCount} / {totalCount} ({percent}%)
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percent === 100
                  ? "bg-emerald-600 dark:bg-emerald-500"
                  : "bg-primary"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist Items */}
      {todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-lg border border-dashed border-border bg-card">
          <ListTodo className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs font-medium text-foreground">No checklist items yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Break this task down into trackable subtasks.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {todos.map((todo) => {
            const isEditingThis = editingId === todo.id;

            return (
              <div
                key={todo.id}
                className={`group flex items-center justify-between gap-2.5 p-2 rounded-md border border-border/60 bg-card hover:bg-muted/30 transition-all text-xs ${
                  todo.isCompleted ? "opacity-75 bg-muted/15" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Checkbox
                    checked={todo.isCompleted}
                    onCheckedChange={() => handleToggle(todo)}
                    disabled={disabled}
                    aria-label={`Mark "${todo.title}" as completed`}
                  />

                  {isEditingThis ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(todo.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-7 text-xs flex-1"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => saveEdit(todo.id)}
                        disabled={isUpdating}
                        className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <span
                        onDoubleClick={() => !disabled && startEdit(todo)}
                        className={`block font-medium truncate ${
                          todo.isCompleted
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {todo.title}
                      </span>
                      {todo.isCompleted && todo.completedAt && (
                        <span className="block text-[10px] text-muted-foreground">
                          Completed {format(new Date(todo.completedAt), "MMM d, h:mm a")}
                          {todo.completedBy ? ` by ${todo.completedBy.name}` : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {!isEditingThis && !disabled && (
                  <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-1 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(todo)}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      title="Edit item"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(todo.id)}
                      className="h-6 w-6 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Delete item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Item Input */}
      {!disabled && (
        <form onSubmit={handleAddTodo} className="flex items-center gap-2 pt-1">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="+ Add checklist item..."
            disabled={isAdding}
            className="h-8 text-xs flex-1 bg-card"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newTitle.trim() || isAdding}
            className="h-8 text-xs px-3"
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
