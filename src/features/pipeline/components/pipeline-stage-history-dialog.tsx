"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowRight, Clock, User } from "lucide-react"
import { format } from "date-fns"
import type { LeadItem, LeadDetail, LeadStageHistoryItem } from "@/features/leads/types/lead.types"

interface PipelineStageHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: LeadItem | null
}

export function PipelineStageHistoryDialog({
  open,
  onOpenChange,
  lead,
}: PipelineStageHistoryDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [history, setHistory] = React.useState<LeadStageHistoryItem[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open && lead) {
      setLoading(true)
      setError(null)
      fetch(`/api/leads/${lead.id}`)
        .then((res) => res.json())
        .then((data) => {
          if ((data.status || data.success) && data.data) {
            setHistory(data.data.stageHistory || [])
          } else {
            setError(data.message || "Failed to load stage history.")
          }
        })
        .catch(() => setError("Failed to load stage history."))
        .finally(() => setLoading(false))
    }
  }, [open, lead])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            <span>Stage Movement History</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {lead ? `Audit timeline of pipeline stage transitions for "${lead.name}".` : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-md">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No stage transitions recorded yet. Lead remains in initial stage.
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="relative pl-5 border-l-2 border-border/80 dark:border-input/20 space-y-1 text-xs"
              >
                <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-primary/80 ring-4 ring-background" />

                <div className="flex items-center gap-2 flex-wrap font-medium">
                  {item.fromStage ? (
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: item.fromStage.color }}>
                      {item.fromStage.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">Initial</span>
                  )}

                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />

                  {item.toStage && (
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: item.toStage.color }}>
                      {item.toStage.name}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{item.changedBy ? item.changedBy.name : "System"}</span>
                  </div>
                  <span>•</span>
                  <span>{format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}</span>
                </div>

                {item.reason && (
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-md mt-1 italic">
                    "{item.reason}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
