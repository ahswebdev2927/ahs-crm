"use client";

import * as React from "react";
import { type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { KanbanBoard, KanbanColumn, KanbanCard } from "@/components/shared/kanban";
import { TaskCard } from "./task-card";
import { Clock, Loader2, CheckCircle2, PauseCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskItem, TaskStatus } from "../types/task.types";

interface TaskKanbanBoardProps {
  tasks: TaskItem[];
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => Promise<void>;
  onViewTask: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (task: TaskItem) => void;
  onCreateTaskInStatus?: (status: TaskStatus) => void;
}

const COLUMNS: Array<{
  id: TaskStatus;
  title: string;
  icon: React.ElementType;
  color: string;
}> = [
  {
    id: "pending",
    title: "Pending",
    icon: Clock,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800",
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: Loader2,
    color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800",
  },
  {
    id: "completed",
    title: "Completed",
    icon: CheckCircle2,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
  },
  {
    id: "deferred",
    title: "Deferred",
    icon: PauseCircle,
    color: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800",
  },
];

export function TaskKanbanBoard({
  tasks,
  onStatusChange,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onCreateTaskInStatus,
}: TaskKanbanBoardProps) {
  const [activeTask, setActiveTask] = React.useState<TaskItem | null>(null);

  // Group tasks by status
  const tasksByStatus = React.useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      deferred: [],
      cancelled: [],
    };

    tasks.forEach((task) => {
      if (map[task.status]) {
        map[task.status].push(task);
      } else {
        map.pending.push(task);
      }
    });

    return map;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = String(active.id);
    const draggedTask = tasks.find((t) => t.id === activeTaskId);
    if (!draggedTask) return;

    let targetStatus: TaskStatus | null = null;

    // Check if dropped directly onto a column
    const overData = over.data.current;
    if (overData?.type === "Column" && overData.columnId) {
      targetStatus = overData.columnId as TaskStatus;
    } else {
      // Dropped onto another task card - find which column that task belongs to
      const overTaskId = String(over.id);
      const overTask = tasks.find((t) => t.id === overTaskId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && targetStatus !== draggedTask.status) {
      onStatusChange(draggedTask, targetStatus);
    }
  };

  const renderDragOverlay = () => {
    if (!activeTask) return null;
    return (
      <div className="w-[276px] lg:w-[290px] xl:w-[320px]">
        <TaskCard task={activeTask} isDragging />
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto min-h-[550px] pb-4">
      <KanbanBoard
        activeId={activeTask ? activeTask.id : null}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        renderDragOverlay={renderDragOverlay}
        className="flex items-stretch gap-3.5 min-w-max pb-2"
      >
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus[col.id] || [];
          const Icon = col.icon;

          return (
            <KanbanColumn
              key={col.id}
              id={col.id}
              items={colTasks.map((t) => t.id)}
              className="bg-muted/30 border-border/70 dark:bg-zinc-950/20"
              header={
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-md border text-xs ${col.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">{col.title}</span>
                    <span className="text-[11px] font-bold text-muted-foreground px-1.5 py-0.2 rounded-full bg-muted">
                      {colTasks.length}
                    </span>
                  </div>

                  {onCreateTaskInStatus && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onCreateTaskInStatus(col.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      title={`Add task in ${col.title}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              }
            >
              {colTasks.length === 0 ? (
                <div className="h-28 flex flex-col items-center justify-center border border-dashed border-border/60 rounded-lg text-center p-3 text-muted-foreground">
                  <p className="text-xs">No tasks</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Drag items here or add a new task
                  </p>
                </div>
              ) : (
                colTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    id={task.id}
                    data={{ type: "Task", task }}
                  >
                    {({ attributes, listeners, isDragging }) => (
                      <div {...attributes} {...listeners}>
                        <TaskCard
                          task={task}
                          isDragging={isDragging}
                          onView={onViewTask}
                          onEdit={onEditTask}
                          onDelete={onDeleteTask}
                          onStatusChange={onStatusChange}
                        />
                      </div>
                    )}
                  </KanbanCard>
                ))
              )}
            </KanbanColumn>
          );
        })}
      </KanbanBoard>
    </div>
  );
}
