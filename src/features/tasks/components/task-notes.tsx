"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import type { TaskNoteItem } from "../types/task.types";

interface TaskNotesProps {
  taskId: string;
  onNotesChange?: () => void;
  disabled?: boolean;
}

export function TaskNotes({
  taskId,
  onNotesChange,
  disabled = false,
}: TaskNotesProps) {
  const { user } = useAuth();
  const [notes, setNotes] = React.useState<TaskNoteItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newContent, setNewContent] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  // In-line editing
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  const reloadNotes = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/notes`);
      if (res.ok) {
        const json = await res.json();
        setNotes(json.data?.notes || []);
      }
    } catch (err) {
      console.error("Failed to fetch task notes:", err);
    }
  }, [taskId]);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/tasks/${taskId}/notes`);
        if (res.ok && !ignore) {
          const json = await res.json();
          setNotes(json.data?.notes || []);
        }
      } catch (err) {
        console.error("Failed to fetch task notes:", err);
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

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newContent.trim();
    if (!trimmed || isAdding || disabled) return;

    setIsAdding(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.ok) {
        const json = await res.json();
        const createdNote = json.data?.note;
        if (createdNote) {
          setNotes((prev) => [createdNote, ...prev]);
          setNewContent("");
          onNotesChange?.();
        }
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (note: TaskNoteItem) => {
    setEditingId(note.id);
    setEditingContent(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
  };

  const saveEdit = async (noteId: string) => {
    const trimmed = editingContent.trim();
    if (!trimmed || isUpdating) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data?.note;
        if (updated) {
          setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
          setEditingId(null);
          setEditingContent("");
          onNotesChange?.();
        }
      }
    } catch (err) {
      console.error("Failed to update note:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (disabled) return;
    // Optimistic remove
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    try {
      const res = await fetch(`/api/tasks/${taskId}/notes/${noteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onNotesChange?.();
      } else {
        reloadNotes();
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
      reloadNotes();
    }
  };

  const canManageNote = (note: TaskNoteItem) => {
    if (!user) return false;
    if (user.roleCode === "super_admin" || user.roleCode === "sales_manager") return true;
    return note.userId === user.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading notes...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Note Composer */}
      {!disabled && (
        <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2 shadow-2xs">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleAddNote();
              }
            }}
            placeholder="Add a remark, update, or conversation note... (Press Ctrl+Enter to save)"
            disabled={isAdding}
            rows={3}
            className="text-xs resize-none border-border/60 focus-visible:ring-primary/30"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">
              Tip: Use Ctrl+Enter to post quickly
            </span>
            <Button
              size="sm"
              onClick={() => handleAddNote()}
              disabled={!newContent.trim() || isAdding}
              className="h-7 text-xs px-3 font-semibold"
            >
              {isAdding ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
              ) : (
                <Send className="h-3 w-3 mr-1.5" />
              )}
              Add Note
            </Button>
          </div>
        </div>
      )}

      {/* Notes Feed */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-lg border border-dashed border-border bg-card">
          <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs font-medium text-foreground">No notes recorded yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Keep team members aligned with internal notes and updates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isEditing = editingId === note.id;
            const canManage = canManageNote(note);

            return (
              <div
                key={note.id}
                className="group p-3 rounded-lg border border-border/60 bg-card hover:border-border transition-all space-y-2 text-xs"
              >
                {/* Author & Timestamp Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {note.user?.name ? note.user.name.charAt(0).toUpperCase() : <User className="h-3 w-3" />}
                    </div>
                    <span className="font-semibold text-foreground">
                      {note.user?.name || "Team Member"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  {canManage && !isEditing && !disabled && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(note)}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="Edit note"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(note.id)}
                        className="h-6 w-6 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Content */}
                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={3}
                      className="text-xs resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(note.id)}
                        disabled={isUpdating || !editingContent.trim()}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed pl-7">
                    {note.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
