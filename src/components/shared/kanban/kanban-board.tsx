"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type DragCancelEvent,
  type UniqueIdentifier,
  type Announcements,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"

export interface KanbanBoardProps {
  children: React.ReactNode
  onDragStart?: (event: DragStartEvent) => void
  onDragOver?: (event: DragOverEvent) => void
  onDragEnd?: (event: DragEndEvent) => void
  onDragCancel?: (event: DragCancelEvent) => void
  activeId?: UniqueIdentifier | null
  renderDragOverlay?: (activeId: UniqueIdentifier) => React.ReactNode
  className?: string
  announcements?: Announcements
}

export function KanbanBoard({
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
  activeId,
  renderDragOverlay,
  className = "flex-1 min-h-0 min-w-0 w-full max-w-full flex items-stretch gap-3.5 overflow-x-auto overflow-y-hidden pb-2 pt-1",
  announcements,
}: KanbanBoardProps) {
  // Configure sensors for Mouse/Pointer, Touch (mobile), and Keyboard accessibility
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Requires 8px movement before drag starts, preventing accidental drags on clicks
    },
  })

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // 250ms press to trigger drag on touch devices, allowing page scrolling
      tolerance: 5,
    },
  })

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      accessibility={{
        announcements: announcements ?? defaultAnnouncements,
      }}
    >
      <div className={className}>{children}</div>

      <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeId && renderDragOverlay ? renderDragOverlay(activeId) : null}
      </DragOverlay>
    </DndContext>
  )
}

const defaultAnnouncements: Announcements = {
  onDragStart({ active }) {
    return `Picked up item ${active.id}. Use arrow keys to reorder or move across columns.`
  },
  onDragOver({ active, over }) {
    if (over) {
      return `Item ${active.id} moved over position ${over.id}.`
    }
    return `Item ${active.id} is no longer over a drop area.`
  },
  onDragEnd({ active, over }) {
    if (over) {
      return `Item ${active.id} dropped into position ${over.id}.`
    }
    return `Item ${active.id} dropped.`
  },
  onDragCancel({ active }) {
    return `Dragging cancelled. Item ${active.id} returned to original position.`
  },
}
