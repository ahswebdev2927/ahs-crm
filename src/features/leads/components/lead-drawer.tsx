"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { LeadWorkspace } from "./lead-workspace";
import { cn } from "@/lib/utils";

export interface LeadDrawerProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated?: () => void;
  className?: string;
}

export function LeadDrawer({
  leadId,
  open,
  onOpenChange,
  onLeadUpdated,
  className,
}: LeadDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-full p-0 flex flex-col gap-0 border-l border-border bg-background shadow-2xl overflow-hidden focus:outline-hidden",
          className
        )}
      >
        <SheetTitle className="sr-only">Lead Workspace</SheetTitle>
        <SheetDescription className="sr-only">
          View and manage deal pipeline, follow-ups, appointments, partnerships, and activities.
        </SheetDescription>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-6">
          {leadId ? (
            <LeadWorkspace
              leadId={leadId}
              mode="drawer"
              onClose={() => onOpenChange(false)}
              onLeadUpdated={onLeadUpdated}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              No lead selected.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
