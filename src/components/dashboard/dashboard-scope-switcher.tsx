"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Building2, Users, User } from "lucide-react";
import type { DashboardScope } from "@/features/dashboard/types/dashboard-scope.types";

interface DashboardScopeSwitcherProps {
  allowedScopes: DashboardScope[];
  activeScope: DashboardScope;
  onScopeChange: (scope: DashboardScope) => void;
}

export function DashboardScopeSwitcher({
  allowedScopes,
  activeScope,
  onScopeChange,
}: DashboardScopeSwitcherProps) {
  if (!allowedScopes || allowedScopes.length <= 1) {
    return null; // Don't render switcher if user only has access to one scope (e.g. Sales Team personal)
  }

  const scopeConfig: Record<
    DashboardScope,
    { label: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    business: { label: "Business", icon: Building2 },
    team: { label: "Team", icon: Users },
    personal: { label: "My", icon: User },
  };

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground"
      role="tablist"
      aria-label="Dashboard Scope Switcher"
    >
      {allowedScopes.map((scope) => {
        const config = scopeConfig[scope];
        const Icon = config.icon;
        const isActive = activeScope === scope;

        return (
          <Button
            key={scope}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onScopeChange(scope)}
            role="tab"
            aria-selected={isActive}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all ${
              isActive ? "shadow-sm" : "hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{config.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
