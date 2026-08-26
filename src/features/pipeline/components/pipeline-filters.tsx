"use client"

import * as React from "react"
import { Search, Filter, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LeadPriority, UserSummary } from "@/features/leads/types/lead.types"

export interface PipelineFilterValues {
  search: string
  ownerId: string
  priority: LeadPriority | ""
  source: string
}

interface PipelineFiltersProps {
  filters: PipelineFilterValues
  onFilterChange: (filters: PipelineFilterValues) => void
  teamUsers: UserSummary[]
  isLoading?: boolean
}

export function PipelineFilters({
  filters,
  onFilterChange,
  teamUsers,
  isLoading = false,
}: PipelineFiltersProps) {
  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.ownerId) ||
    Boolean(filters.priority) ||
    Boolean(filters.source)

  const handleClear = () => {
    onFilterChange({
      search: "",
      ownerId: "",
      priority: "",
      source: "",
    })
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-xl border border-border/60 shadow-2xs mb-4">
      {/* Search Bar */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search leads by name, company, email, phone..."
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className="pl-9 bg-background"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Owner Filter */}
        <Select
          value={filters.ownerId || "ALL_OWNERS"}
          onValueChange={(val) =>
            onFilterChange({ ...filters, ownerId: !val || val === "ALL_OWNERS" ? "" : val })
          }
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_OWNERS">All Owners</SelectItem>
            {teamUsers
              .filter((user) => Boolean(user && user.id))
              .map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={filters.priority || "ALL_PRIORITIES"}
          onValueChange={(val) =>
            onFilterChange({
              ...filters,
              priority: !val || val === "ALL_PRIORITIES" ? "" : (val as LeadPriority),
            })
          }
        >
          <SelectTrigger className="w-[140px] bg-background">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_PRIORITIES">All Priorities</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="critical">Critical Priority</SelectItem>
          </SelectContent>
        </Select>

        {/* Source Filter */}
        <Select
          value={filters.source || "ALL_SOURCES"}
          onValueChange={(val) =>
            onFilterChange({ ...filters, source: !val || val === "ALL_SOURCES" ? "" : val })
          }
        >
          <SelectTrigger className="w-[140px] bg-background">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_SOURCES">All Sources</SelectItem>
            <SelectItem value="Website">Website</SelectItem>
            <SelectItem value="Referral">Referral</SelectItem>
            <SelectItem value="Campaign">Campaign</SelectItem>
            <SelectItem value="Inside Sales">Inside Sales</SelectItem>
            <SelectItem value="Field Sales">Field Sales</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
