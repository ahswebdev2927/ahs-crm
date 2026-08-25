"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Plus, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import type { LeadStageItem } from "../types/lead.types";

interface LeadStageManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: LeadStageItem[];
  onSuccess: () => void;
}

export function LeadStageManagerDialog({
  open,
  onOpenChange,
  stages,
  onSuccess,
}: LeadStageManagerDialogProps) {
  const [orderedStages, setOrderedStages] = React.useState<LeadStageItem[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // New stage form state
  const [newName, setNewName] = React.useState("");
  const [newCode, setNewCode] = React.useState("");
  const [newColor, setNewColor] = React.useState("#3b82f6");
  const [newDesc, setNewDesc] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setOrderedStages([...stages].sort((a, b) => a.order - b.order));
      setNewName("");
      setNewCode("");
      setNewColor("#3b82f6");
      setNewDesc("");
      setErrorMsg(null);
    }
  }, [open, stages]);

  const handleNameChange = (val: string) => {
    setNewName(val);
    setNewCode(val.toLowerCase().replace(/[^a-z0-9]/g, "_"));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const list = [...orderedStages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Recalculate order index
    const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    setOrderedStages(reordered);
  };

  const handleSaveOrder = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = orderedStages.map((s, idx) => ({
        id: s.id,
        order: idx + 1,
      }));

      const res = await fetch("/api/leads/stages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update stage order.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while reordering stages.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const nextOrder = stages.length + 1;
      const res = await fetch("/api/leads/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          code: newCode.trim(),
          color: newColor,
          order: nextOrder,
          description: newDesc.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create new lead stage.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while creating stage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Manage Pipeline Stages
          </DialogTitle>
          <DialogDescription>
            Configure company-wide pipeline stages and sequence order.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <Tabs defaultValue="reorder" className="w-full pt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="reorder">Reorder Sequence</TabsTrigger>
            <TabsTrigger value="create">Add New Stage</TabsTrigger>
          </TabsList>

          {/* Reorder Stages */}
          <TabsContent value="reorder" className="space-y-4 pt-3">
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {orderedStages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between p-2.5 bg-muted/30 border border-border rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="font-semibold text-foreground">{stage.name}</span>
                    <span className="text-muted-foreground text-[10px]">({stage.code})</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleMove(idx, "up")}
                      disabled={idx === 0 || isSubmitting}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleMove(idx, "down")}
                      disabled={idx === orderedStages.length - 1 || isSubmitting}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSaveOrder} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Order
              </Button>
            </div>
          </TabsContent>

          {/* Create New Stage */}
          <TabsContent value="create" className="pt-3">
            <form onSubmit={handleCreateStage} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Stage Name *</label>
                <Input
                  placeholder="e.g. Contract Under Review"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Code *</label>
                  <Input
                    placeholder="contract_review"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Color Hex</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="h-9 w-10 p-1 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Description</label>
                <Textarea
                  placeholder="Brief description of this stage in the pipeline..."
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !newName.trim()}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stage
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
