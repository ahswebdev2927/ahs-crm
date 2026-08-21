"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  date?: Date
  setDate?: (date?: Date) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal border-border bg-background hover:bg-muted/50 dark:border-input dark:bg-input/30",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0 border-none bg-transparent" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
        />
      </PopoverContent>
    </Popover>
  )
}

export interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange?: (range?: DateRange) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Select date range",
  className,
  disabled = false,
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              "h-8 justify-start text-left text-xs font-normal border-border bg-background hover:bg-muted/50 dark:border-input dark:bg-input/30",
              !dateRange?.from && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0 border-none bg-popover rounded-md shadow-md" align="end">
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
