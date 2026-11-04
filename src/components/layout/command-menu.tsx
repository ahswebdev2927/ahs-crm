"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth, RoleCode } from "@/contexts/auth-context";
import { navigationConfig } from "@/lib/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  User,
  UserCheck,
  Building2,
  Calendar,
  CheckSquare,
  FileText,
  Receipt,
  CreditCard,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type {
  CategorizedSearchResults,
  GlobalSearchResultItem,
} from "@/features/search/types/global-search.types";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<CategorizedSearchResults | null>(null);

  const router = useRouter();
  const { hasPermission, switchRole, user } = useAuth();

  // Register keyboard shortcut & event listeners
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };

    const handleToggle = () => setOpen((o) => !o);

    document.addEventListener("keydown", down);
    window.addEventListener("ahs-toggle-command-menu", handleToggle);

    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("ahs-toggle-command-menu", handleToggle);
    };
  }, []);

  // Debounced search effect
  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search/global?q=${encodeURIComponent(trimmed)}&limit=4`);
        if (!isCancelled && res.ok) {
          const data = await res.json();
          if (data?.data?.categories) {
            setSearchResults(data.data.categories);
          }
        }
      } catch {
        // Handled silently
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Reset state when closing
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setSearchResults(null);
      setIsSearching(false);
    }
  };

  // Filter navigation groups by permissions
  const visibleNavGroups = React.useMemo(() => {
    return navigationConfig
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasPermission(item.permission)),
      }))
      .filter((group) => group.items.length > 0);
  }, [hasPermission]);

  const handleNavigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const handleSwitchRole = (role: RoleCode) => {
    setOpen(false);
    switchRole(role);
  };

  const isGlobalMode = query.trim().length >= 2;
  const activeSearchResults = isGlobalMode ? searchResults : null;
  const activeIsSearching = isGlobalMode && isSearching;
  const hasResults =
    activeSearchResults &&
    (activeSearchResults.leads.length > 0 ||
      activeSearchResults.customers.length > 0 ||
      activeSearchResults.appointments.length > 0 ||
      activeSearchResults.tasks.length > 0 ||
      activeSearchResults.quotations.length > 0 ||
      activeSearchResults.invoices.length > 0 ||
      activeSearchResults.payments.length > 0);

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Global Search & Navigator"
      description="Search leads, customers, invoices, tasks, or jump to routes (Ctrl+K)"
      shouldFilter={!isGlobalMode}
    >
      <CommandInput
        placeholder="Search leads, customers, invoices, tasks, routes..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="border-t border-border/20 p-2">
        {activeIsSearching && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Searching CRM records across modules...</span>
          </div>
        )}

        {!activeIsSearching && isGlobalMode && !hasResults && (
          <CommandEmpty>No CRM records or navigation found matching &ldquo;{query}&rdquo;.</CommandEmpty>
        )}

        {!activeIsSearching && !isGlobalMode && (
          <CommandEmpty>No navigation routes or actions found.</CommandEmpty>
        )}

        {/* Global Search Results Groups */}
        {isGlobalMode && activeSearchResults && (
          <>
            {/* Leads */}
            {activeSearchResults.leads.length > 0 && (
              <CommandGroup heading="Leads">
                {activeSearchResults.leads.map((item: GlobalSearchResultItem) => (
                  <CommandItem
                    key={`lead-${item.id}`}
                    value={`lead-${item.id}-${item.title}-${item.subtitle}`}
                    onSelect={() => handleNavigate(item.href)}
                    className="hover:cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs truncate">{item.title}</span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-medium shrink-0 ml-2">
                        {item.badge}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Customers */}
            {activeSearchResults.customers.length > 0 && (
              <CommandGroup heading="Customers">
                {activeSearchResults.customers.map((item: GlobalSearchResultItem) => (
                  <CommandItem
                    key={`cust-${item.id}`}
                    value={`cust-${item.id}-${item.title}-${item.subtitle}`}
                    onSelect={() => handleNavigate(item.href)}
                    className="hover:cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Building2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs truncate">{item.title}</span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium shrink-0 ml-2">
                        {item.badge}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Appointments */}
            {activeSearchResults.appointments.length > 0 && (
              <CommandGroup heading="Appointments">
                {activeSearchResults.appointments.map((item: GlobalSearchResultItem) => (
                  <CommandItem
                    key={`app-${item.id}`}
                    value={`app-${item.id}-${item.title}-${item.subtitle}`}
                    onSelect={() => handleNavigate(item.href)}
                    className="hover:cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs truncate">{item.title}</span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium capitalize shrink-0 ml-2">
                        {item.badge}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Tasks */}
            {activeSearchResults.tasks.length > 0 && (
              <CommandGroup heading="Tasks">
                {activeSearchResults.tasks.map((item: GlobalSearchResultItem) => (
                  <CommandItem
                    key={`task-${item.id}`}
                    value={`task-${item.id}-${item.title}-${item.subtitle}`}
                    onSelect={() => handleNavigate(item.href)}
                    className="hover:cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckSquare className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs truncate">{item.title}</span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium capitalize shrink-0 ml-2">
                        {item.badge}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Quotations */}
            {activeSearchResults.quotations.length > 0 && (
              <CommandGroup heading="Quotations">
                {activeSearchResults.quotations.map((item: GlobalSearchResultItem) => (
                  <CommandItem
                    key={`quote-${item.id}`}
                    value={`quote-${item.id}-${item.title}-${item.subtitle}`}
                    onSelect={() => handleNavigate(item.href)}
                    className="hover:cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 text-purple-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs truncate">{item.title}</span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-medium shrink-0 ml-2">
                        {item.badge}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Invoices */}
            {activeSearchResults.invoices.length > 0 && (
              <CommandGroup heading="Invoices">
                {activeSearchResults.invoices.map((item: GlobalSearchResultItem) => (
                  <CommandItem
                    key={`inv-${item.id}`}
                    value={`inv-${item.id}-${item.title}-${item.subtitle}`}
                    onSelect={() => handleNavigate(item.href)}
                    className="hover:cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Receipt className="h-4 w-4 text-teal-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs truncate">{item.title}</span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-500 font-medium capitalize shrink-0 ml-2">
                        {item.badge}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Payments */}
            {activeSearchResults.payments.length > 0 && (
              <CommandGroup heading="Payments">
                {activeSearchResults.payments.map((item: GlobalSearchResultItem) => (
                  <CommandItem
                    key={`pay-${item.id}`}
                    value={`pay-${item.id}-${item.title}-${item.subtitle}`}
                    onSelect={() => handleNavigate(item.href)}
                    className="hover:cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CreditCard className="h-4 w-4 text-rose-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs truncate">{item.title}</span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-medium shrink-0 ml-2">
                        {item.badge}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}

        {/* Navigation & Simulation (Always available when query is empty or short) */}
        {!isGlobalMode && (
          <>
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
                    <span className="flex-1">{item.label}</span>
                    {group.groupName && (
                      <span className="ml-2 text-xs text-muted-foreground/60">
                        in {group.groupName}
                      </span>
                    )}
                    <ArrowRight className="h-3 w-3 text-muted-foreground/40 ml-1" />
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
                data-selected-role={user?.roleCode === "super_admin"}
                className="hover:cursor-pointer"
              >
                <User className="mr-2 h-4 w-4 text-emerald-500" />
                <span className="flex-1">Switch to Super Admin</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                  Alex T.
                </span>
              </CommandItem>
              <CommandItem
                value="Switch to Sales Manager (Marcus Vance)"
                onSelect={() => handleSwitchRole("sales_manager")}
                data-selected-role={user?.roleCode === "sales_manager"}
                className="hover:cursor-pointer"
              >
                <User className="mr-2 h-4 w-4 text-blue-500" />
                <span className="flex-1">Switch to Sales Manager</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                  Marcus V.
                </span>
              </CommandItem>
              <CommandItem
                value="Switch to Inside Sales (Sarah Jenkins)"
                onSelect={() => handleSwitchRole("inside_sales")}
                data-selected-role={user?.roleCode === "inside_sales"}
                className="hover:cursor-pointer"
              >
                <User className="mr-2 h-4 w-4 text-sky-500" />
                <span className="flex-1">Switch to Inside Sales</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-medium">
                  Sarah J.
                </span>
              </CommandItem>
              <CommandItem
                value="Switch to Field Sales (David Miller)"
                onSelect={() => handleSwitchRole("field_sales")}
                data-selected-role={user?.roleCode === "field_sales"}
                className="hover:cursor-pointer"
              >
                <User className="mr-2 h-4 w-4 text-amber-500" />
                <span className="flex-1">Switch to Field Sales Representative</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">
                  David M.
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
