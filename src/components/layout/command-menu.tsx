"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth, RoleCode } from "@/contexts/auth-context"
import { navigationConfig } from "@/lib/navigation"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import { User } from "lucide-react"

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { hasPermission, switchRole, user } = useAuth()

  // Register keyboard shortcut & event listeners
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }

    const handleToggle = () => setOpen((o) => !o)

    document.addEventListener("keydown", down)
    window.addEventListener("ahs-toggle-command-menu", handleToggle)
    
    return () => {
      document.removeEventListener("keydown", down)
      window.removeEventListener("ahs-toggle-command-menu", handleToggle)
    }
  }, [])

  // Filter navigation groups by permissions
  const visibleNavGroups = React.useMemo(() => {
    return navigationConfig
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasPermission(item.permission))
      }))
      .filter((group) => group.items.length > 0)
  }, [hasPermission])

  const handleNavigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const handleSwitchRole = (role: RoleCode) => {
    setOpen(false)
    switchRole(role)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Global Navigator" description="Quickly jump across routes or toggle simulated roles">
      <CommandInput placeholder="Search navigation, routes, or actions..." />
      <CommandList className="border-t border-border/20 p-2">
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Navigation Routes Group */}
        <CommandGroup heading="Navigation">
          {visibleNavGroups.map((group) =>
            group.items.map((item) => (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => handleNavigate(item.href)}
                className="hover:cursor-pointer"
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground opacity-80" />
                <span>{item.label}</span>
                {group.groupName && (
                  <span className="ml-2 text-xs text-muted-foreground/60">
                    in {group.groupName}
                  </span>
                )}
              </CommandItem>
            ))
          )}
        </CommandGroup>

        <CommandSeparator className="my-2" />

        {/* Role Simulator Actions */}
        <CommandGroup heading="Simulation Controls">
          <CommandItem
            value="Switch to Super Admin (Alex Thorne)"
            onSelect={() => handleSwitchRole("super_admin")}
            data-selected-role={user.roleCode === "super_admin"}
            className="hover:cursor-pointer"
          >
            <User className="mr-2 h-4 w-4 text-emerald-500" />
            <span className="flex-1">Switch to Super Admin</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">Alex T.</span>
          </CommandItem>
          <CommandItem
            value="Switch to Sales Manager (Marcus Vance)"
            onSelect={() => handleSwitchRole("sales_manager")}
            data-selected-role={user.roleCode === "sales_manager"}
            className="hover:cursor-pointer"
          >
            <User className="mr-2 h-4 w-4 text-blue-500" />
            <span className="flex-1">Switch to Sales Manager</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">Marcus V.</span>
          </CommandItem>
          <CommandItem
            value="Switch to Inside Sales (Sarah Jenkins)"
            onSelect={() => handleSwitchRole("inside_sales")}
            data-selected-role={user.roleCode === "inside_sales"}
            className="hover:cursor-pointer"
          >
            <User className="mr-2 h-4 w-4 text-sky-500" />
            <span className="flex-1">Switch to Inside Sales</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-medium">Sarah J.</span>
          </CommandItem>
          <CommandItem
            value="Switch to Field Sales (David Miller)"
            onSelect={() => handleSwitchRole("field_sales")}
            data-selected-role={user.roleCode === "field_sales"}
            className="hover:cursor-pointer"
          >
            <User className="mr-2 h-4 w-4 text-amber-500" />
            <span className="flex-1">Switch to Field Sales Representative</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">David M.</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
