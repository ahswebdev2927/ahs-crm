"use client";

import * as React from "react";
import { DollarSign, TrendingUp, Calendar, CreditCard } from "lucide-react";
import { formatINR, formatINRCompact } from "@/lib/formatters";
import type { PaymentKpis } from "../types/payment.types";

interface PaymentKpisProps {
  kpis: PaymentKpis | null;
  loading?: boolean;
}

export function PaymentKpiCards({ kpis, loading }: PaymentKpisProps) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-stone-100 animate-pulse rounded-lg border border-stone-200"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Collected",
      value: formatINR(kpis.totalCollected),
      compact: formatINRCompact(kpis.totalCollected),
      subtitle: `${kpis.transactionCount} transactions logged`,
      icon: DollarSign,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
    },
    {
      title: "This Month Collections",
      value: formatINR(kpis.monthCollected),
      compact: formatINRCompact(kpis.monthCollected),
      subtitle: "Current billing cycle",
      icon: TrendingUp,
      color: "text-blue-700",
      bgColor: "bg-blue-50",
    },
    {
      title: "Today's Collections",
      value: formatINR(kpis.todayCollected),
      compact: formatINRCompact(kpis.todayCollected),
      subtitle: "Recorded today",
      icon: Calendar,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Primary Method",
      value: (() => {
        const methods = Object.entries(kpis.methodBreakdown || {});
        if (methods.length === 0) return "None";
        methods.sort((a, b) => b[1] - a[1]);
        return methods[0][0].replace("_", " ").toUpperCase();
      })(),
      subtitle: "Top payment mode",
      icon: CreditCard,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">{card.title}</span>
              <div className={`p-1.5 rounded-md ${card.bgColor} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-stone-900 font-mono tracking-tight">
                {card.value}
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
