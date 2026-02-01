"use client";

/**
 * Виджет последних алертов
 */

import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { api, type RouterOutputs } from "~/trpc/react";

// Тип алерта из роутера
type AlertHistoryItem = RouterOutputs["alerts"]["getHistory"][number];

interface AlertsWidgetProps {
  limit?: number;
}

export function AlertsWidget({ limit = 5 }: AlertsWidgetProps) {
  const { data: history, isLoading } = api.alerts.getHistory.useQuery(
    { limit },
    {
      refetchInterval: 30000,
    }
  );

  const { data: stats } = api.alerts.getStats.useQuery(undefined, {
    refetchInterval: 60000,
  });

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
      <div className="flex items-center justify-between border-b border-zinc-700/50 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-white">
          <span>🔔</span>
          Алерты
        </h3>
        {stats && (
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>
              Активных: <span className="text-emerald-400">{stats.activeRules}</span>
            </span>
            <span>
              Отправлено: <span className="text-white">{stats.totalSent}</span>
            </span>
          </div>
        )}
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {!history || history.length === 0 ? (
          <div className="py-8 text-center">
            <span className="text-4xl">🔕</span>
            <p className="mt-2 text-sm text-zinc-400">
              Нет алертов
            </p>
            <a
              href="/settings/alerts"
              className="mt-3 inline-block text-sm text-violet-400 hover:text-violet-300"
            >
              Настроить алерты →
            </a>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-700/30">
            {history.map((alert: AlertHistoryItem) => (
              <li
                key={alert.id}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-700/20"
              >
                <span className="mt-0.5 text-lg">
                  {alert.status === "sent" ? "✅" : "❌"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">
                    {alert.ruleName}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {alert.productName ?? alert.sku}:{" "}
                    <span className="font-mono text-amber-400">
                      {alert.newValue} шт
                    </span>{" "}
                    (порог: {alert.threshold})
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                    <span>{alert.warehouse}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(alert.createdAt, {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-700/50 px-4 py-2">
        <a
          href="/settings/alerts"
          className="flex items-center justify-center gap-1 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          Управление алертами
          <span>→</span>
        </a>
      </div>
    </div>
  );
}
