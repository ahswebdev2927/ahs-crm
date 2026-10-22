"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus, Loader2 } from "lucide-react";
import {
  TaskStats,
  TaskFilters,
  TaskTable,
  TaskKanbanBoard,
  TaskDialog,
  TaskDetailDialog,
  type TaskItem,
  type TaskMetrics,
  type TaskFilterValues,
  type TaskStatus,
  type UserSummary,
} from "@/features/tasks";

const defaultFilters: TaskFilterValues = {
  search: "",
  status: "all",
  priority: "all",
  assignedToId: "all",
  dueDatePreset: "all",
  viewMode: "list",
};

const initialMetrics: TaskMetrics = {
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  overdue: 0,
  highPriority: 0,
};

export default function TasksPage() {
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [metrics, setMetrics] = React.useState<TaskMetrics>(initialMetrics);
  const [filters, setFilters] = React.useState<TaskFilterValues>(defaultFilters);
  const [teamUsers, setTeamUsers] = React.useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialog controls
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [taskToEdit, setTaskToEdit] = React.useState<TaskItem | null>(null);
  const [taskToView, setTaskToView] = React.useState<TaskItem | null>(null);
  const [initialStatusForNew, setInitialStatusForNew] = React.useState<TaskStatus>("pending");

  // Fetch team members for filter and assignee selector
  React.useEffect(() => {
    fetch("/api/team?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.items) {
          setTeamUsers(
            data.data.items.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Metrics
  const fetchStats = React.useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/stats");
      const data = await res.json();
      if (res.ok && data?.data) {
        setMetrics(data.data);
      }
    } catch (_err) {}
  }, []);

  // Fetch Tasks with current filters
  const fetchTasks = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status && filters.status !== "all") params.set("status", filters.status);
      if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
      if (filters.assignedToId && filters.assignedToId !== "all") {
        params.set("assignedToId", filters.assignedToId);
      }
      if (filters.dueDatePreset && filters.dueDatePreset !== "all") {
        params.set("dueDatePreset", filters.dueDatePreset);
      }
      params.set("limit", "100");

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data?.data?.tasks) {
        setTasks(data.data.tasks);
      }
    } catch (_err) {
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  React.useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle status toggle or kanban drop
  const handleStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: newStatus,
              completedAt: newStatus === "completed" ? new Date() : null,
            }
          : t
      )
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

      fetchStats();
      fetchTasks();
    } catch (_err) {
      // Rollback
      fetchTasks();
    }
  };

  // Handle Save (Create or Edit)
  const handleSaveTask = async (data: any) => {
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
    fetchStats();
    fetchTasks();
  };

  // Handle Delete
  const handleDeleteTask = async (task: TaskItem) => {
    if (!confirm(`Are you sure you want to delete task "${task.title}"?`)) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");

      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      fetchStats();
    } catch (_err) {
      alert("Failed to delete task.");
    }
  };

  return (
    <div className="flex-1 pb-10">
      <PageHeader
        title="Tasks Checklist"
        description="Organize daily work items, deal assignments, and administrative chores."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Tasks" },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setTaskToEdit(null);
              setInitialStatusForNew("pending");
              setIsCreateDialogOpen(true);
            }}
            className="cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>New Task</span>
          </Button>
        }
      />

      <div className="w-full p-4 sm:p-5 xl:p-6 space-y-4">
        {/* KPI Metric Summary Cards */}
        <TaskStats
          metrics={metrics}
          onFilterPreset={(preset) =>
            setFilters((f) => ({ ...f, dueDatePreset: preset, status: "all" }))
          }
          onStatusClick={(status) =>
            setFilters((f) => ({ ...f, status, dueDatePreset: "all" }))
          }
        />

        {/* Filters and View Mode Controls */}
        <TaskFilters
          filters={filters}
          onFilterChange={setFilters}
          onReset={() => setFilters(defaultFilters)}
          teamUsers={teamUsers}
        />

        {/* Main Content Area: List Table vs Kanban Board */}
        {isLoading && tasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Loading tasks...</p>
          </div>
        ) : filters.viewMode === "list" ? (
          <TaskTable
            tasks={tasks}
            isLoading={isLoading}
            onViewTask={(task) => setTaskToView(task)}
            onEditTask={(task) => {
              setTaskToEdit(task);
              setIsCreateDialogOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onCreateTask={() => {
              setTaskToEdit(null);
              setInitialStatusForNew("pending");
              setIsCreateDialogOpen(true);
            }}
          />
        ) : (
          <TaskKanbanBoard
            tasks={tasks}
            onStatusChange={handleStatusChange}
            onViewTask={(task) => setTaskToView(task)}
            onEditTask={(task) => {
              setTaskToEdit(task);
              setIsCreateDialogOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onCreateTaskInStatus={(status) => {
              setTaskToEdit(null);
              setInitialStatusForNew(status);
              setIsCreateDialogOpen(true);
            }}
          />
        )}
      </div>

      {/* Create / Edit Dialog */}
      <TaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        taskToEdit={taskToEdit}
        teamUsers={teamUsers}
        initialStatus={initialStatusForNew}
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
          setIsCreateDialogOpen(true);
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
          fetchTasks();
          fetchStats();
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
