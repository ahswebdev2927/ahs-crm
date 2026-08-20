"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { AlertTriangle, ShieldCheck, UserX } from "lucide-react"

interface StatusChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: {
    id: string
    name: string
    email: string
    status: "active" | "inactive" | "suspended"
  } | null
  targetStatus: "active" | "inactive" | "suspended" | null
  onConfirm: (memberId: string, status: "active" | "inactive" | "suspended") => Promise<void>
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  member,
  targetStatus,
  onConfirm,
}: StatusChangeDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  if (!member || !targetStatus) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(member.id, targetStatus)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusIcon = () => {
    switch (targetStatus) {
      case "active":
        return <ShieldCheck className="h-5 w-5 text-emerald-500" />
      case "inactive":
        return <UserX className="h-5 w-5 text-zinc-500" />
      case "suspended":
        return <AlertTriangle className="h-5 w-5 text-rose-500" />
    }
  }

  const getStatusTitle = () => {
    switch (targetStatus) {
      case "active":
        return `Re-activate ${member.name}?`
      case "inactive":
        return `Deactivate ${member.name}?`
      case "suspended":
        return `Suspend ${member.name}?`
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-secondary">
              {getStatusIcon()}
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {getStatusTitle()}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update account access state for {member.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between text-xs p-3 rounded-lg border bg-muted/30">
            <span className="text-muted-foreground font-medium">Current Status:</span>
            <StatusBadge status={member.status} />
          </div>

          <div className="flex items-center justify-between text-xs p-3 rounded-lg border bg-muted/30">
            <span className="text-muted-foreground font-medium">New Status:</span>
            <StatusBadge status={targetStatus} />
          </div>

          {targetStatus !== "active" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs leading-relaxed">
              <span className="font-semibold block mb-0.5">Session Notice:</span>
              {targetStatus === "suspended"
                ? "Suspending this account will immediately revoke CRM access and invalidate all active user login sessions."
                : "Deactivating this account will prevent sign-ins until re-activated by a SuperAdmin."}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant={targetStatus === "suspended" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : `Confirm ${targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
