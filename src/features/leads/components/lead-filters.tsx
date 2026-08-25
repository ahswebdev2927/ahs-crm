"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from "lucide-react";
import type { LeadStageItem } from "../types/lead.types";

interface LeadFiltersProps {
  stages: LeadStageItem[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedStageId: string;
  onStageChange: (value: string) => void;
  selectedPriority: string;
  onPriorityChange: (value: string) => void;
  selectedSource: string;
  onSourceChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onReset: () => void;
}

export function LeadFilters({
  stages,
  search,
  onSearchChange,
  selectedStageId,
  onStageChange,
  selectedPriority,
  onPriorityChange,
  selectedSource,
  onSourceChange,
  selectedStatus,
  onStatusChange,
  onReset,
}: LeadFiltersProps) {
  const hasActiveFilters =
    search.trim() !== "" ||
    selectedStageId !== "all" ||
    selectedPriority !== "all" ||
    selectedSource !== "all" ||
    selectedStatus !== "active";

  // Display labels on the Trigger Button always prefix the category ("Stage: Qualified", "Priority: High", etc.)
  const selectedStage = stages.find((s) => s.id.toString() === selectedStageId);
  const stageDisplayLabel =
    selectedStageId === "all"
      ? "Stage: All"
      : selectedStage
      ? `Stage: ${selectedStage.name}`
      : "Stage: All";

  const priorityDisplayLabel =
    selectedPriority === "all"
      ? "Priority: All"
      : `Priority: ${selectedPriority.charAt(0).toUpperCase() + selectedPriority.slice(1)}`;

  const sourceDisplayLabel =
    selectedSource === "all" ? "Source: All" : `Source: ${selectedSource}`;

  const statusDisplayLabel =
    selectedStatus === "active" ? "Status: Active Leads" : "Status: Archived";

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, company, email, phone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <div className="w-48">
            <Select value={selectedStageId} onValueChange={(val) => onStageChange(val || "all")}>
              <SelectTrigger className="h-9 text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Stage: All">
                    {stageDisplayLabel}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span>{stage.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="w-44">
            <Select value={selectedPriority} onValueChange={(val) => onPriorityChange(val || "all")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Priority: All">
                  {priorityDisplayLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source Filter */}
          <div className="w-44">
            <Select value={selectedSource} onValueChange={(val) => onSourceChange(val || "all")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Source: All">
                  {sourceDisplayLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Campaign">Campaign</SelectItem>
                <SelectItem value="Inside Sales">Inside Sales</SelectItem>
                <SelectItem value="Field Sales">Field Sales</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Select */}
          <div className="w-40">
            <Select value={selectedStatus} onValueChange={(val) => onStatusChange(val || "active")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status: Active">
                  {statusDisplayLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Leads</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 text-xs text-muted-foreground hover:text-foreground px-2.5"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
