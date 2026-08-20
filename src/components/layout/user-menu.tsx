"use client"

import * as React from "react"
import { useAuth, RoleCode } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProfileDialog } from "@/features/users/components/profile-dialog"
import { Command, LogOut, Shield, User } from "lucide-react"

export function UserMenu() {
  const { user, switchRole } = useAuth()
  const [profileOpen, setProfileOpen] = React.useState(false)

  // Get color styles based on current simulated role
  const getRoleColors = (role: RoleCode) => {
    switch (role) {
      case "super_admin":
        return {
          bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
          text: "text-emerald-700 dark:text-emerald-400",
          border: "border-emerald-500/20 dark:border-emerald-500/30",
          dot: "bg-emerald-500"
        }
      case "sales_manager":
        return {
          bg: "bg-blue-500/10 dark:bg-blue-500/20",
          text: "text-blue-700 dark:text-blue-400",
          border: "border-blue-500/20 dark:border-blue-500/30",
          dot: "bg-blue-500"
        }
      case "inside_sales":
        return {
          bg: "bg-sky-500/10 dark:bg-sky-500/20",
          text: "text-sky-700 dark:text-sky-400",
          border: "border-sky-500/20 dark:border-sky-500/30",
          dot: "bg-sky-500"
        }
      case "field_sales":
        return {
          bg: "bg-amber-500/10 dark:bg-amber-500/20",
          text: "text-amber-700 dark:text-amber-400",
          border: "border-amber-500/20 dark:border-amber-500/30",
          dot: "bg-amber-500"
        }
    }
  }

  const roleTheme = getRoleColors(user.roleCode)
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent("ahs-toggle-command-menu"))
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-2.5 text-left focus:outline-hidden group cursor-pointer">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/65 text-sm font-semibold transition-all hover:bg-muted group-focus-visible:ring-2 group-focus-visible:ring-ring dark:border-input/10">
                {initials}
                <span className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${roleTheme.dot}`} />
              </div>
              <div className="hidden flex-col text-xs sm:flex">
                <span className="font-semibold text-foreground leading-tight tracking-tight">{user.name}</span>
                <span className="text-[10px] text-muted-foreground font-medium leading-tight">{user.roleName}</span>
              </div>
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-64 p-1.5 border-border shadow-md dark:border-input/10">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col px-2.5 py-2 font-normal">
              <span className="text-sm font-semibold text-foreground tracking-tight">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              
              <div className={`mt-2.5 flex items-center justify-center gap-1.5 rounded-md border py-1 text-[10px] font-semibold uppercase tracking-wider ${roleTheme.bg} ${roleTheme.text} ${roleTheme.border}`}>
                <Shield className="h-3 w-3" />
                <span>{user.roleName} Mode</span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator className="my-1 border-border/60 dark:border-input/5" />

          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setProfileOpen(true)} className="cursor-pointer gap-2 py-2">
              <User className="h-4 w-4 text-primary" />
              <span className="flex-1 font-medium">My Profile</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handleOpenSearch} className="cursor-pointer gap-2 py-2">
              <Command className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Command Palette</span>
              <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground font-mono">Ctrl+K</kbd>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1 border-border/60 dark:border-input/5" />
          
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 select-none">
              Simulate User Role
            </DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => switchRole("super_admin")} 
              className={`cursor-pointer gap-2 py-1.5 rounded-md ${user.roleCode === "super_admin" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="flex-1">Super Admin</span>
              {user.roleCode === "super_admin" && <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">Active</span>}
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => switchRole("sales_manager")} 
              className={`cursor-pointer gap-2 py-1.5 rounded-md ${user.roleCode === "sales_manager" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <span className="flex-1">Sales Manager</span>
              {user.roleCode === "sales_manager" && <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400">Active</span>}
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => switchRole("inside_sales")} 
              className={`cursor-pointer gap-2 py-1.5 rounded-md ${user.roleCode === "inside_sales" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
              <span className="flex-1">Inside Sales</span>
              {user.roleCode === "inside_sales" && <span className="text-[9px] font-semibold text-sky-600 dark:text-sky-400">Active</span>}
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => switchRole("field_sales")} 
              className={`cursor-pointer gap-2 py-1.5 rounded-md ${user.roleCode === "field_sales" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span className="flex-1">Field Sales Rep</span>
              {user.roleCode === "field_sales" && <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">Active</span>}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator className="my-1 border-border/60 dark:border-input/5" />
          
          <DropdownMenuItem className="cursor-pointer gap-2 py-2 text-rose-600 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400 dark:focus:bg-rose-500/20">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={user}
      />
    </>
  )
}
