"use client";

import * as React from "react";
import { LeadWorkspace } from "./lead-workspace";
import type { LeadDetail } from "../types/lead.types";

export interface LeadDetailWorkspaceProps {
  lead: LeadDetail;
  currentUserId?: string;
  onEditLead?: () => void;
  onAssignLead?: () => void;
  onChangeStage?: () => void;
}

/**
 * @deprecated Use `LeadWorkspace` directly. Retained for backwards-compatibility.
 */
export function LeadDetailWorkspace({ lead }: LeadDetailWorkspaceProps) {
  return <LeadWorkspace leadId={lead.id} mode="page" />;
}
