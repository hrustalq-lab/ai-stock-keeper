"use client";

import Link from "next/link";
/**
 * Виджет статистики сборки для Dashboard
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
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-700" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-700/50" />
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
      label: "Завершено",
      value: stats.completedLists,
      icon: "✅",
      color: "text-green-400",
    },
    {
      label: "Среднее время",
      value: `${stats.avgPickingMins} мин`,
      icon: "⏱",
      color: "text-blue-400",
    },
    {
      label: "Picks/час",
      value: stats.picksPerHour.toFixed(1),
      icon: "📦",
      color: "text-purple-400",
    },
    {
      label: "Точность",
      value: `${(stats.accuracy * 100).toFixed(1)}%`,
      icon: "🎯",
      color: "text-amber-400",
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30">
      <div className="flex items-center justify-between border-b border-zinc-700/50 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-white">
          <span>📋</span>
          Сборка сегодня
        </h3>
        <Link
          href="/picking"
          className="text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          Подробнее →
        </Link>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metricCards.map((card, i) => (
            <div
              key={i}
              className="rounded-lg bg-zinc-700/30 p-3 text-center transition-colors hover:bg-zinc-700/50"
            >
              <div className="mb-1 text-xl">{card.icon}</div>
              <div className={`text-xl font-bold ${card.color}`}>
                {card.value}
              </div>
              <div className="text-xs text-zinc-400">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Дополнительная статистика */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-700/20 px-4 py-2 text-sm">
          <span className="text-zinc-400">
            Всего листов: <span className="text-white">{stats.totalLists}</span>
          </span>
          <span className="text-zinc-400">
            Позиций: <span className="text-white">{stats.totalItems}</span>
          </span>
          <span className="text-zinc-400">
            Недостач:{" "}
            <span className={stats.shortageRate > 0.01 ? "text-red-400" : "text-green-400"}>
              {(stats.shortageRate * 100).toFixed(1)}%
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
