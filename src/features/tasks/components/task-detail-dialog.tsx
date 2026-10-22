"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TaskPriorityBadge, TaskStatusBadge, TaskDueDateBadge } from "./task-badge";
import { TaskChecklist } from "./task-checklist";
import { TaskNotes } from "./task-notes";
import {
  Calendar,
  Clock,
  User,
  Briefcase,
  CheckCircle2,
  Edit,
  Trash2,
  ExternalLink,
  ArrowRight,
  ListTodo,
  MessageSquare,
  FileText,
} from "lucide-react";
import Link from "next/link";
import type { TaskItem, TaskStatus } from "../types/task.types";

interface TaskDetailDialogProps {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => void;
  onRefresh?: () => void;
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onStatusChange,
  onRefresh,
}: TaskDetailDialogProps) {
  if (!task) return null;

  const isCompleted = task.status === "completed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <TaskPriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
          </div>
          <DialogTitle
            className={`text-base font-bold ${
              isCompleted ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {task.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Created on {format(new Date(task.createdAt), "PPP")} by {task.createdBy.name}
          </DialogDescription>
        </DialogHeader>

        {/* Tabbed Navigation: Overview, Checklist, Notes */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0 pt-1">
          <TabsList className="grid grid-cols-3 w-full h-9 mb-3">
            <TabsTrigger value="overview" className="text-xs flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="text-xs flex items-center gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              <span>Checklist</span>
              {task.todoCount !== undefined && task.todoCount > 0 && (
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-muted font-semibold">
                  {task.completedTodoCount ?? 0}/{task.todoCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Notes</span>
              {task.notesCount !== undefined && task.notesCount > 0 && (
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-muted font-semibold">
                  {task.notesCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-1">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 text-xs mt-0">
              {/* Description */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                  Description
                </div>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {task.description || (
                    <span className="text-muted-foreground italic">No description provided.</span>
                  )}
                </p>
              </div>

              {/* Key Attributes Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Due Date */}
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Due Date</span>
                  </div>
                  <TaskDueDateBadge dueDate={task.dueDate} status={task.status} />
                </div>

                {/* Completed Timestamp */}
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Completion Status</span>
                  </div>
                  {task.completedAt ? (
                    <span className="text-foreground font-medium">
                      {format(new Date(task.completedAt), "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not completed</span>
                  )}
                </div>
              </div>

              {/* Assignee & Creator */}
              <div className="grid grid-cols-2 gap-3">
                {/* Assignee */}
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                    <User className="h-3.5 w-3.5" />
                    <span>Assigned To</span>
                  </div>
                  {task.assignedTo ? (
                    <div>
                      <div className="font-semibold text-foreground">{task.assignedTo.name}</div>
                      <div className="text-[11px] text-muted-foreground">{task.assignedTo.email}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Unassigned</span>
                  )}
                </div>

                {/* Creator */}
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Created By</span>
                  </div>
                  <div className="font-semibold text-foreground">{task.createdBy.name}</div>
                  <div className="text-[11px] text-muted-foreground">{task.createdBy.email}</div>
                </div>
              </div>

              {/* Associated Entity (Lead or Customer) */}
              {(task.lead || task.customer) && (
                <div className="p-3 rounded-lg border border-border/60 bg-card flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {task.lead ? "Associated Lead" : "Associated Customer"}
                      </div>
                      <div className="font-bold text-foreground">
                        {task.lead ? task.lead.contactName : task.customer?.name}
                      </div>
                      {(task.lead?.companyName || task.lead?.phone || task.customer?.phone) && (
                        <div className="text-[11px] text-muted-foreground">
                          {task.lead?.companyName || task.lead?.phone || task.customer?.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <Link
                    href={
                      task.lead
                        ? `/sales/leads/${task.lead.id}`
                        : `/sales/customers/${task.customer?.id}`
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
                  >
                    <span>Workspace</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {/* Quick Status Action Buttons */}
              <div className="pt-2 border-t border-border/50">
                <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                  Change Status:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { status: "pending", label: "Pending" },
                      { status: "in_progress", label: "In Progress" },
                      { status: "completed", label: "Completed" },
                      { status: "deferred", label: "Deferred" },
                    ] as const
                  ).map((s) => (
                    <Button
                      key={s.status}
                      variant={task.status === s.status ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => onStatusChange(task, s.status)}
                      className={`text-xs h-7 px-2.5 ${
                        task.status === s.status ? "font-bold border-primary/40" : ""
                      }`}
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Checklist Tab */}
            <TabsContent value="checklist" className="mt-0">
              <TaskChecklist taskId={task.id} onTodosChange={onRefresh} />
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-0">
              <TaskNotes taskId={task.id} onNotesChange={onRefresh} />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="pt-3 border-t border-border/50 shrink-0 flex sm:justify-between items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDelete(task);
              onOpenChange(false);
            }}
            className="text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onEdit(task);
                onOpenChange(false);
              }}
              className="text-xs"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
