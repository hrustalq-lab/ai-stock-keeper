"use client";

/**
 * ReorderTable - таблица рекомендаций по дозаказу
 * Phase 4: Predictive Analytics
 */

import { UrgencyBadge } from "./UrgencyBadge";

interface ReorderItem {
  sku: string;
  productName: string;
  warehouse: string;
  currentQty: number;
  daysToStockout: number;
  recommendedQty: number;
  urgency: "critical" | "warning" | "normal";
  reasoning: string;
  supplier?: string;
}

interface ReorderTableProps {
  items: ReorderItem[];
  onOrderClick?: (sku: string, warehouse: string, qty: number) => void;
  isLoading?: boolean;
}

export function ReorderTable({
  items,
  onOrderClick,
  isLoading,
}: ReorderTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="animate-pulse text-slate-400">Загрузка рекомендаций...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
        <span className="text-4xl">✅</span>
        <p className="mt-2 text-slate-600">Нет рекомендаций по дозаказу</p>
        <p className="text-sm text-slate-400">Все запасы в норме</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Товар</th>
              <th className="px-4 py-3 text-right">Остаток</th>
              <th className="px-4 py-3 text-right">До 0</th>
              <th className="px-4 py-3 text-right">Заказать</th>
              <th className="px-4 py-3 text-center">Статус</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={`${item.sku}-${item.warehouse}`}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-medium text-slate-700">
                    {item.sku}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-[200px]">
                    <p className="truncate font-medium text-slate-800">
                      {item.productName}
                    </p>
                    {item.supplier && (
                      <p className="truncate text-xs text-slate-400">
                        {item.supplier}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-medium ${
                      item.urgency === "critical"
                        ? "text-red-600"
                        : item.urgency === "warning"
                        ? "text-amber-600"
                        : "text-slate-700"
                    }`}
                  >
                    {item.currentQty}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-medium ${
                      item.daysToStockout <= 3
                        ? "text-red-600"
                        : item.daysToStockout <= 7
                        ? "text-amber-600"
                        : "text-slate-600"
                    }`}
                  >
                    {item.daysToStockout === 999 ? "∞" : `${item.daysToStockout} дн`}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-slate-800">
                    {item.recommendedQty}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <UrgencyBadge urgency={item.urgency} showLabel={false} size="sm" />
                </td>
                <td className="px-4 py-3 text-right">
                  {onOrderClick && (
                    <button
                      onClick={() =>
                        onOrderClick(item.sku, item.warehouse, item.recommendedQty)
                      }
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        item.urgency === "critical"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : item.urgency === "warning"
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Заказать
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Подсказка внизу */}
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        💡 Рекомендации отсортированы по срочности. Критичные товары требуют
        немедленного заказа.
      </div>
    </div>
  );
}
