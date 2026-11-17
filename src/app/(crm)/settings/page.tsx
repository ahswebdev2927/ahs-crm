"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  FileClock,
  KeyRound,
  Building2,
  Users,
  Database,
  BellRing,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  pillText: string;
  pillColor: string;
  href?: string;
  isExternal?: boolean;
  actionText: string;
}

interface SettingCategory {
  categoryTitle: string;
  categoryDescription: string;
  categoryIcon: React.ComponentType<{ className?: string }>;
  items: SettingItem[];
}

const SETTING_CATEGORIES: SettingCategory[] = [
  {
    categoryTitle: "Security & Compliance",
    categoryDescription:
      "Enterprise audit logging, mutation tracking, session token security, and access control policies.",
    categoryIcon: ShieldCheck,
    items: [
      {
        id: "audit-logs",
        title: "Audit Logs Explorer",
        description:
          "Review immutable system-wide mutation history, financial actions, user lifecycle events, and compliance records.",
        icon: FileClock,
        pillText: "Immutable Log Trail",
        pillColor:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        href: "/settings/audit",
        actionText: "Open Audit Logs",
      },
      {
        id: "auth-security",
        title: "Authentication & Security Policies",
        description:
          "Session timeouts, rate limiting thresholds, JWT expiration parameters, and password policy constraints.",
        icon: KeyRound,
        pillText: "Phase 28 Hardening",
        pillColor:
          "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
        actionText: "Review Parameters",
      },
    ],
  },
  {
    categoryTitle: "Company & Organization",
    categoryDescription:
      "Corporate profile, Indian Rupee currency configurations, departments, and user hierarchy management.",
    categoryIcon: Building2,
    items: [
      {
        id: "company-profile",
        title: "Company Profile & Currency",
        description:
          "AHS corporate details, official quotation header metadata, and canonical Indian Rupee (INR / ₹) display standards.",
        icon: Building2,
        pillText: "Canonical INR (₹)",
        pillColor:
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        actionText: "Company Info",
      },
      {
        id: "team-governance",
        title: "Team & Role Governance",
        description:
          "Manage company sales departments, internal team members, supervisor assignments, and role-based access control.",
        icon: Users,
        pillText: "RBAC Governance",
        pillColor:
          "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
        href: "/team",
        actionText: "Manage Team",
      },
    ],
  },
  {
    categoryTitle: "Platform & Infrastructure",
    categoryDescription:
      "Database parameters, cloud media configurations, background workers, and real-time push alerts.",
    categoryIcon: Database,
    items: [
      {
        id: "database-storage",
        title: "Database & Cloud Infrastructure",
        description:
          "Turso libSQL distributed database connection parameters and future Cloudinary persistent media storage.",
        icon: Database,
        pillText: "Turso libSQL",
        pillColor:
          "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
        actionText: "Infrastructure Info",
      },
      {
        id: "notifications-policy",
        title: "Notification Center & Web Push",
        description:
          "Web Push VAPID cryptographic keys, in-app notification center history, audio synthesizer, and reminders.",
        icon: BellRing,
        pillText: "Web Push Active",
        pillColor:
          "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
        href: "/notifications",
        actionText: "Notification Center",
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader
        title="Settings & System Hub"
        description="Comprehensive administration hub for security policies, compliance audit trail, organization rules, and infrastructure."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "System", href: "/settings" },
          { label: "Settings" },
        ]}
      />

      <div className="w-full p-4 sm:p-5 xl:p-6 space-y-6 flex-1 min-w-0">
        {SETTING_CATEGORIES.map((category) => {
          const CategoryIcon = category.categoryIcon;

          return (
            <div key={category.categoryTitle} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center gap-2 px-1">
                <CategoryIcon className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {category.categoryTitle}
                </h3>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  — {category.categoryDescription}
                </span>
              </div>

              {/* Setting Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.items.map((item) => {
                  const ItemIcon = item.icon;

                  return (
                    <Card
                      key={item.id}
                      className="border-border/80 dark:border-input/10 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
                    >
                      <CardHeader className="p-4 sm:p-5 pb-3">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <ItemIcon className="size-4" />
                            </div>
                            <CardTitle className="text-sm font-semibold text-foreground">
                              {item.title}
                            </CardTitle>
                          </div>

                          {/* Pill-box badge */}
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap select-none ${item.pillColor}`}
                          >
                            {item.pillText}
                          </span>
                        </div>

                        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-4 sm:p-5 pt-0 flex justify-end">
                        {item.href ? (
                          <Link
                            href={item.href}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                              className:
                                "h-8 text-xs gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30",
                            })}
                          >
                            <span>{item.actionText}</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled
                            className="h-8 text-xs gap-1.5 opacity-60"
                          >
                            <span>{item.actionText}</span>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
