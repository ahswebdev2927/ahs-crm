"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export interface ModalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  type?: "dialog" | "sheet"
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full"
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

export function ModalForm({
  open,
  onOpenChange,
  title,
  description,
  children,
  type = "dialog",
  size = "md",
  side = "right",
  className,
}: ModalFormProps) {
  if (type === "sheet") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={side}
          className={cn(
            "w-full overflow-y-auto p-6 sm:max-w-md md:max-w-lg lg:max-w-xl",
            className
          )}
        >
          <SheetHeader className="p-0 mb-4">
            <SheetTitle>{title}</SheetTitle>
            {description && (
              <SheetDescription className="mt-1">{description}</SheetDescription>
            )}
          </SheetHeader>
          <div className="flex-1 min-h-0">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  // Dialog Size Maps
  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    full: "sm:max-w-[calc(100%-2rem)]",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[calc(100vh-4rem)] overflow-y-auto p-6",
          sizeClasses[size],
          className
        )}
      >
        <DialogHeader className="mb-4">
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription className="mt-1">{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 min-h-0">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
