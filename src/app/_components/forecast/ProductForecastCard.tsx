"use client";

/**
 * ProductForecastCard - карточка прогноза для товара
 * Phase 4: Predictive Analytics
 */

import { TrendIndicator } from "./TrendIndicator";
import { UrgencyBadge } from "./UrgencyBadge";

interface ProductForecastCardProps {
  sku: string;
  productName: string;
  currentQty: number;
  daysToStockout: number;
  avgDailyConsumption: number;
  trend: "increasing" | "stable" | "decreasing";
  mape?: number;
  reorderPoint: number;
  recommendedQty?: number;
  onClick?: () => void;
}

export function ProductForecastCard({
  sku,
  productName,
  currentQty,
  daysToStockout,
  avgDailyConsumption,
  trend,
  mape,
  reorderPoint,
  recommendedQty,
  onClick,
}: ProductForecastCardProps) {
  // Определяем срочность
  const urgency: "critical" | "warning" | "normal" =
    daysToStockout <= 7 ? "critical" : daysToStockout <= 14 ? "warning" : "normal";

  // Процент заполненности (для визуализации)
  const fillPercent = Math.min(100, (currentQty / (reorderPoint * 2)) * 100);

  return (
    <div
      className={`rounded-xl border bg-white p-4 transition-all ${
        onClick ? "cursor-pointer hover:shadow-md" : ""
      } ${
        urgency === "critical"
          ? "border-red-200"
          : urgency === "warning"
          ? "border-amber-200"
          : "border-slate-200"
      }`}
      onClick={onClick}
    >
      {/* Заголовок */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-mono text-sm font-medium text-slate-500">{sku}</p>
          <h3 className="mt-0.5 font-medium text-slate-800 line-clamp-1">
            {productName}
          </h3>
        </div>
        <UrgencyBadge urgency={urgency} showLabel={false} size="sm" />
      </div>

      {/* Визуализация остатка */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Остаток</span>
          <span className="font-medium text-slate-700">{currentQty} шт</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              urgency === "critical"
                ? "bg-red-500"
                : urgency === "warning"
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>0</span>
          <span className="text-amber-600">Точка заказа: {reorderPoint}</span>
          <span>{reorderPoint * 2}</span>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-xs text-slate-500">До нуля</p>
          <p
            className={`font-semibold ${
              daysToStockout <= 7
                ? "text-red-600"
                : daysToStockout <= 14
                ? "text-amber-600"
                : "text-slate-700"
            }`}
          >
            {daysToStockout === 999 ? "∞" : `${daysToStockout} дн`}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-xs text-slate-500">Расход/день</p>
          <p className="font-semibold text-slate-700">
            {avgDailyConsumption.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Тренд и точность */}
      <div className="mt-3 flex items-center justify-between">
        <TrendIndicator trend={trend} size="sm" />
        {mape !== undefined && (
          <span className="text-xs text-slate-400">
            Точность: {(100 - mape).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Рекомендация */}
      {recommendedQty && recommendedQty > 0 && (
        <div className="mt-3 rounded-lg bg-blue-50 p-2 text-center">
          <p className="text-xs text-blue-600">Рекомендуем заказать</p>
          <p className="font-semibold text-blue-700">{recommendedQty} шт</p>
        </div>
      )}
    </div>
  );
}
