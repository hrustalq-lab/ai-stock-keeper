"use client";

/**
 * Обзор инвентаря — основные метрики
 */

import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "~/trpc/react";

interface InventoryOverviewProps {
  warehouse?: string;
}

export function InventoryOverview({ warehouse }: InventoryOverviewProps) {
  const { data: stats, isLoading } = api.dashboard.getStats.useQuery(
    warehouse ? { warehouse } : undefined,
    {
      refetchInterval: 30000, // Обновляем каждые 30 сек
    }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl bg-zinc-800/50 p-6"
          >
            <div className="h-4 w-24 rounded bg-zinc-700" />
            <div className="mt-3 h-8 w-16 rounded bg-zinc-700" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const cards = [
    {
      label: "Всего товаров",
      value: stats.totalProducts.toLocaleString("ru-RU"),
      icon: "📦",
      color: "from-blue-500/20 to-blue-600/10",
      borderColor: "border-blue-500/30",
    },
    {
      label: "Низкий остаток",
      value: stats.lowStockCount.toLocaleString("ru-RU"),
      icon: "⚠️",
      color:
        stats.lowStockCount > 0
          ? "from-amber-500/20 to-amber-600/10"
          : "from-emerald-500/20 to-emerald-600/10",
      borderColor:
        stats.lowStockCount > 0
          ? "border-amber-500/30"
          : "border-emerald-500/30",
    },
    {
      label: "Синхронизация",
      value: stats.lastSyncAt
        ? formatDistanceToNow(stats.lastSyncAt, {
            addSuffix: true,
            locale: ru,
          })
        : "—",
      icon: "🔄",
      color: "from-violet-500/20 to-violet-600/10",
      borderColor: "border-violet-500/30",
      subtext: stats.lastSyncAt ? "✅" : "⏳",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border bg-linear-to-br p-6 ${card.color} ${card.borderColor}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-400">
              {card.label}
            </span>
            <span className="text-xl">{card.icon}</span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-bold text-white">{card.value}</span>
            {card.subtext && (
              <span className="mb-1 text-lg">{card.subtext}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
