"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"

export interface KanbanCardProps {
  id: string | number
  data?: Record<string, any>
  disabled?: boolean
  children: (props: {
    attributes: ReturnType<typeof useSortable>["attributes"]
    listeners: ReturnType<typeof useSortable>["listeners"]
    isDragging: boolean
  }) => React.ReactNode
  className?: string
}

export function KanbanCard({
  id,
  data,
  disabled = false,
  children,
  className,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(id),
    data,
    disabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none select-none rounded-lg transition-shadow",
        isDragging && "opacity-40 shadow-lg ring-2 ring-primary/40",
        className
      )}
    >
      {children({ attributes, listeners, isDragging })}
    </div>
  )
}
