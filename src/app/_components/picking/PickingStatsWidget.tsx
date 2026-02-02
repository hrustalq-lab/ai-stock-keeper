"use client";

import Link from "next/link";
/**
 * Виджет статистики сборки для Dashboard
 * Updated: Compact layout, restrained colors
 */

import { api } from "~/trpc/react";

interface PickingStatsWidgetProps {
  warehouse?: string;
}

export function PickingStatsWidget({ warehouse }: PickingStatsWidgetProps) {
  const { data: stats, isLoading } = api.picking.getStats.useQuery(
    { warehouse: warehouse ?? "all", period: "today" },
    { refetchInterval: 60000 } // Обновление каждую минуту
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-3">
        <div className="mb-3 h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const metricCards = [
    {
      label: "Готово",
      value: stats.completedLists,
      icon: "✅",
      color: "text-chart-2", // emerald from design system
    },
    {
      label: "Ср. время",
      value: `${stats.avgPickingMins}м`,
      icon: "⏱",
      color: "text-chart-1", // cyan (primary) from design system
    },
    {
      label: "Picks/ч",
      value: stats.picksPerHour.toFixed(1),
      icon: "📦",
      color: "text-chart-4", // violet from design system
    },
    {
      label: "Точн.",
      value: `${(stats.accuracy * 100).toFixed(0)}%`,
      icon: "🎯",
      color: "text-chart-3", // amber from design system
    },
  ];

  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <span className="text-base">📋</span>
          Сборка сегодня
        </h3>
        <Link
          href="/picking"
          className="text-xs text-primary transition-colors hover:text-primary/80"
        >
          Ещё →
        </Link>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {metricCards.map((card, i) => (
            <div
              key={i}
              className="rounded-md bg-secondary/40 px-2 py-2 text-center transition-colors hover:bg-secondary/60"
            >
              <div className="mb-0.5 text-base">{card.icon}</div>
              <div className={`text-base font-semibold ${card.color}`}>
                {card.value}
              </div>
              <div className="text-[10px] text-muted-foreground">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Дополнительная статистика - compact */}
        <div className="mt-3 flex items-center justify-between rounded-md bg-muted/30 px-3 py-1.5 text-[10px]">
          <span className="text-muted-foreground">
            Листов: <span className="font-medium text-foreground">{stats.totalLists}</span>
          </span>
          <span className="text-muted-foreground">
            Позиций: <span className="font-medium text-foreground">{stats.totalItems}</span>
          </span>
          <span className="text-muted-foreground">
            Недост.:{" "}
            <span className={stats.shortageRate > 0.01 ? "font-medium text-destructive" : "font-medium text-chart-2"}>
              {(stats.shortageRate * 100).toFixed(1)}%
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
