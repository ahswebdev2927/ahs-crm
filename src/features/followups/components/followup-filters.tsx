"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FollowUpFiltersProps {
  timeframe: string;
  onTimeframeChange: (val: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  type: string;
  onTypeChange: (val: string) => void;
  assignedToId?: string;
  onAssignedToChange?: (val: string) => void;
  teamMembers?: Array<{ id: string; name: string }>;
  onResetFilters?: () => void;
}

export function FollowUpFilters({
  timeframe,
  onTimeframeChange,
  search,
  onSearchChange,
  type,
  onTypeChange,
  assignedToId = "all",
  onAssignedToChange,
  teamMembers = [],
  onResetFilters,
}: FollowUpFiltersProps) {
  const hasActiveFilters = search !== "" || type !== "all" || (assignedToId && assignedToId !== "all");

  return (
    <div className="space-y-3 bg-card p-4 rounded-xl border border-border shadow-xs">
      {/* Timeframe Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <Tabs value={timeframe} onValueChange={onTimeframeChange} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-5 w-full sm:w-auto text-xs">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              Overdue
            </TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              Today
            </TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        {hasActiveFilters && onResetFilters && (
          <Button variant="ghost" size="sm" onClick={onResetFilters} className="text-xs h-8 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5 mr-1" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Filter Inputs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads, notes, outcomes..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        {/* Type Select */}
        <Select value={type} onValueChange={(val) => val && onTypeChange(val)}>
          <SelectTrigger className="text-xs h-9">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Follow-up Types</SelectItem>
            <SelectItem value="call">Phone Call</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="whatsapp">WhatsApp Message</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="site_visit">Site Visit</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Assigned Rep Select */}
        {onAssignedToChange && teamMembers.length > 0 && (
          <Select value={assignedToId} onValueChange={(val) => val && onAssignedToChange(val)}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Reps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sales Representatives</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
