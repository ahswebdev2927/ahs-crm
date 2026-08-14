"use client"

import * as React from "react"
import { Sun, Moon, Monitor } from "lucide-react"
import { useTheme, type Theme } from "@/contexts/theme-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch by rendering a placeholder matching the size
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-lg border border-border bg-transparent dark:border-input/10" />
    )
  }

  const getThemeIcon = (currentTheme: Theme) => {
    switch (currentTheme) {
      case "light":
        return <Sun className="h-4 w-4 text-amber-500" />
      case "dark":
        return <Moon className="h-4 w-4 text-violet-400" />
      case "system":
        return <Monitor className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground dark:border-input/10 cursor-pointer transition-colors focus-visible:outline-hidden"
        aria-label="Toggle Theme"
      >
        {getThemeIcon(theme)}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-40 p-1.5 border-border shadow-md dark:border-input/10">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => setTheme("light")}
            className={`cursor-pointer gap-2 py-1.5 rounded-md ${theme === "light" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Sun className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-xs">Light</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => setTheme("dark")}
            className={`cursor-pointer gap-2 py-1.5 rounded-md ${theme === "dark" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Moon className="h-4 w-4 text-violet-400 shrink-0" />
            <span className="text-xs">Dark</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => setTheme("system")}
            className={`cursor-pointer gap-2 py-1.5 rounded-md ${theme === "system" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs">System Default</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
