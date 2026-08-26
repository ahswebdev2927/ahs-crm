"use client"

import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"

export interface KanbanColumnProps {
  id: string | number
  items: (string | number)[]
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function KanbanColumn({
  id,
  items,
  children,
  header,
  footer,
  className,
  contentClassName,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: String(id),
    data: {
      type: "Column",
      columnId: id,
    },
  })

  return (
    <div
      className={cn(
        "flex h-full min-w-[280px] w-80 max-w-full flex-col rounded-lg border border-border/60 bg-zinc-50/50 p-3 shadow-2xs transition-colors dark:border-input/10 dark:bg-zinc-950/20",
        isOver && "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
        className
      )}
    >
      {header && <div className="mb-3 flex-none">{header}</div>}

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 flex flex-col gap-2.5 overflow-y-auto min-h-[120px] p-0.5",
          contentClassName
        )}
      >
        <SortableContext items={items.map(String)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>

      {footer && <div className="mt-3 flex-none pt-2 border-t border-border/40 dark:border-input/5">{footer}</div>}
    </div>
  )
}
