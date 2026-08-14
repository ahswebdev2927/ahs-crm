"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface SearchControlProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceTime?: number
  className?: string
}

export function SearchControl({
  value,
  onChange,
  placeholder = "Search...",
  debounceTime = 300,
  className,
}: SearchControlProps) {
  const [prevValue, setPrevValue] = React.useState(value)
  const [internalValue, setInternalValue] = React.useState(value)

  if (value !== prevValue) {
    setPrevValue(value)
    setInternalValue(value)
  }

  // Debounce the change callback
  React.useEffect(() => {
    const handler = setTimeout(() => {
      onChange(internalValue)
    }, debounceTime)

    return () => {
      clearTimeout(handler)
    }
  }, [internalValue, onChange, debounceTime])

  const handleClear = () => {
    setInternalValue("")
    onChange("")
  }

  return (
    <div
      data-slot="search-control"
      className={cn("relative flex items-center w-full max-w-sm", className)}
    >
      <Search className="absolute left-2.5 h-4 w-4 shrink-0 text-muted-foreground select-none pointer-events-none" />
      <Input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
