"use client";

/**
 * Виджет товаров с низким остатком
 */

import { api } from "~/trpc/react";

interface LowStockWidgetProps {
  warehouse?: string;
  limit?: number;
}

export function LowStockWidget({
  warehouse,
  limit = 5,
}: LowStockWidgetProps) {
  const { data: items, isLoading } = api.dashboard.getLowStock.useQuery(
    { warehouse, limit },
    {
      refetchInterval: 60000, // Обновляем каждую минуту
    }
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-700" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-zinc-700/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30">
      <div className="border-b border-zinc-700/50 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-white">
          <span className="text-amber-400">⚠️</span>
          Низкий остаток
          {items && items.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
              {items.length}
            </span>
          )}
        </h3>
      </div>

      <div className="p-2">
        {!items || items.length === 0 ? (
          <div className="py-8 text-center">
            <span className="text-4xl">✅</span>
            <p className="mt-2 text-sm text-zinc-400">
              Все остатки в норме
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-700/30">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-zinc-700/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {item.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {item.sku} • {item.warehouse}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <p
                    className={`text-lg font-bold ${
                      item.quantity === 0
                        ? "text-red-400"
                        : "text-amber-400"
                    }`}
                  >
                    {item.quantity}
                  </p>
                  <p className="text-xs text-zinc-500">
                    / {item.reorderPoint}
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
