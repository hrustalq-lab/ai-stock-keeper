"use client";

/**
 * Лента последней активности (транзакции)
 */

import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "~/trpc/react";
import { useInventoryUpdates, type InventoryUpdate } from "~/hooks/useInventoryUpdates";

interface RecentActivityFeedProps {
  warehouse?: string;
  limit?: number;
}

// Иконки для типов операций
const typeIcons: Record<string, string> = {
  intake: "📥",
  picking: "📤",
  transfer: "🔄",
  adjustment: "📝",
};

const typeLabels: Record<string, string> = {
  intake: "Приёмка",
  picking: "Отгрузка",
  transfer: "Перемещение",
  adjustment: "Корректировка",
};

export function RecentActivityFeed({
  warehouse,
  limit = 10,
}: RecentActivityFeedProps) {
  // Исторические данные из БД
  const { data: dbActivity, isLoading } = api.dashboard.getRecentActivity.useQuery(
    { warehouse, limit },
    {
      refetchInterval: 60000,
    }
  );

  // Real-time обновления через SSE
  const { updates: realtimeUpdates, isConnected } = useInventoryUpdates();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-zinc-700" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-zinc-700/50" />
          ))}
        </div>
      </div>
    );
  }

  // Комбинируем real-time и исторические данные
  const combinedActivity = [
    // Real-time обновления в начале
    ...realtimeUpdates.slice(0, 5).map((update: InventoryUpdate) => ({
      id: `rt-${update.id}`,
      type: "update" as const,
      sku: update.sku,
      name: update.name,
      quantity: update.quantity,
      warehouse: update.warehouse,
      createdAt: new Date(update.syncedAt),
      isRealtime: true,
    })),
    // Исторические данные
    ...(dbActivity?.map((item) => ({
      id: `db-${item.id}`,
      type: item.type,
      sku: item.sku,
      name: item.name ?? undefined,
      quantity: item.quantity,
      warehouse: item.warehouse,
      createdAt: item.createdAt,
      isRealtime: false,
    })) ?? []),
  ].slice(0, limit);

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30">
      <div className="flex items-center justify-between border-b border-zinc-700/50 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-white">
          <span>📋</span>
          Последние операции
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-emerald-400" : "bg-zinc-500"
            }`}
          />
          <span className="text-xs text-zinc-500">
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {combinedActivity.length === 0 ? (
          <div className="py-8 text-center">
            <span className="text-4xl">📭</span>
            <p className="mt-2 text-sm text-zinc-400">
              Нет операций
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-700/30">
            {combinedActivity.map((item) => (
              <li
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-700/20 ${
                  item.isRealtime ? "bg-emerald-500/5" : ""
                }`}
              >
                <span className="text-xl">
                  {item.type === "update"
                    ? "🔄"
                    : typeIcons[item.type] ?? "📦"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-white">
                      {item.name ?? item.sku}
                    </p>
                    {item.isRealtime && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {item.type === "update"
                      ? "Обновление"
                      : typeLabels[item.type] ?? item.type}{" "}
                    • {item.warehouse ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono text-sm font-bold ${
                      item.quantity > 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDistanceToNow(item.createdAt, {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
