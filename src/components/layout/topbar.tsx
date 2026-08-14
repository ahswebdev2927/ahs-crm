"use client"

import * as React from "react"
import { Menu, Search, PanelLeft } from "lucide-react"
import { UserMenu } from "./user-menu"
import { NotificationMenu } from "./notification-menu"
import { ThemeToggle } from "./theme-toggle"

interface TopbarProps {
  onToggleMobileSidebar: () => void
  onToggleSidebar: () => void
}

export function Topbar({ onToggleMobileSidebar, onToggleSidebar }: TopbarProps) {
  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent("ahs-toggle-command-menu"))
  }

  return (
    <header className="sticky top-0 z-30 flex md:grid md:grid-cols-3 h-16 w-full items-center justify-between border-b border-border bg-background/80 px-4 md:px-6 backdrop-blur-md dark:border-input/10 select-none">
      {/* Left Area: Toggles */}
      <div className="flex items-center gap-3 justify-start min-w-0">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground md:hidden dark:border-input/10 cursor-pointer animate-in fade-in duration-200"
          aria-label="Toggle Mobile Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop sidebar collapse trigger */}
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground dark:border-input/10 cursor-pointer transition-colors"
          aria-label="Toggle Sidebar Collapse"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Center Area: Centered Search Bar */}
      <div className="hidden md:flex justify-center w-full">
        <button
          onClick={handleOpenSearch}
          className="flex h-9 w-full max-w-xs xl:max-w-sm items-center justify-between rounded-lg border border-border/85 bg-muted/30 px-3 text-xs text-muted-foreground hover:bg-muted/65 hover:text-foreground transition-all duration-150 cursor-pointer dark:border-input/10 shadow-xs focus-visible:outline-hidden"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search routes, simulator...</span>
          </span>
          <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground font-mono">Ctrl+K</kbd>
        </button>
      </div>

      {/* Right Area: Utility Actions */}
      <div className="flex items-center gap-2.5 justify-end">
        {/* Mobile-only Search Button */}
        <button
          onClick={handleOpenSearch}
          className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground dark:border-input/10 cursor-pointer"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Theme Changer */}
        <ThemeToggle />

        {/* Notifications Popover */}
        <NotificationMenu />

        {/* User Dropdown Menu */}
        <UserMenu />
      </div>
    </header>
  )
}
