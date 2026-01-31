"use client";

/**
 * ForecastWidget - виджет прогнозов для Dashboard
 * Phase 4: Predictive Analytics
 */

import Link from "next/link";
import { api } from "~/trpc/react";

interface ForecastWidgetProps {
  warehouse?: string;
}

export function ForecastWidget({ warehouse }: ForecastWidgetProps) {
  // Получаем сводку рекомендаций
  const { data: summary, isLoading } = api.forecast.getRecommendationsSummary.useQuery(
    { warehouse }
  );

  // Получаем топ критичных рекомендаций
  const { data: topCritical } = api.forecast.getRecommendations.useQuery({
    warehouse,
    urgency: "critical",
    limit: 3,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="animate-pulse">
          <div className="mb-3 h-5 w-32 rounded bg-slate-200" />
          <div className="space-y-2">
            <div className="h-12 rounded bg-slate-100" />
            <div className="h-12 rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  const hasCritical = (summary?.critical ?? 0) > 0;

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        hasCritical ? "border-red-200" : "border-slate-200"
      }`}
    >
      {/* Заголовок */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">📈 Прогноз запасов</h3>
        <Link
          href="/forecast"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Подробнее →
        </Link>
      </div>

      {/* Сводка по срочности */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-red-50 p-2 text-center">
          <p className="text-lg font-bold text-red-700">{summary?.critical ?? 0}</p>
          <p className="text-xs text-red-600">Критично</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-2 text-center">
          <p className="text-lg font-bold text-amber-700">{summary?.warning ?? 0}</p>
          <p className="text-xs text-amber-600">Внимание</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2 text-center">
          <p className="text-lg font-bold text-emerald-700">{summary?.normal ?? 0}</p>
          <p className="text-xs text-emerald-600">Норма</p>
        </div>
      </div>

      {/* Критичные товары */}
      {topCritical && topCritical.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">
            🚨 Требуют срочного заказа:
          </p>
          {topCritical.map((item) => (
            <div
              key={`${item.sku}-${item.warehouse}`}
              className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-red-800">
                  {item.productName}
                </p>
                <p className="text-xs text-red-600">
                  Остаток: {item.currentQty} · До 0: {item.daysToStockout} дн
                </p>
              </div>
              <span className="ml-2 whitespace-nowrap text-sm font-semibold text-red-700">
                +{item.recommendedQty}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-emerald-50 p-3 text-center">
          <span className="text-2xl">✅</span>
          <p className="mt-1 text-sm text-emerald-700">
            Нет критичных товаров
          </p>
        </div>
      )}

      {/* Общая сумма рекомендаций */}
      {(summary?.totalRecommendedQty ?? 0) > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3 text-center">
          <p className="text-xs text-slate-500">
            Всего рекомендовано заказать:{" "}
            <span className="font-semibold text-slate-700">
              {summary?.totalRecommendedQty} шт
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
