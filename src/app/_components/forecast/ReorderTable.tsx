"use client";

/**
 * ReorderTable - таблица рекомендаций по дозаказу
 * Phase 4: Predictive Analytics
 * Updated: Compact layout, restrained colors
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
      <div className="flex h-32 items-center justify-center rounded-lg border border-border/50 bg-card">
        <div className="animate-pulse text-sm text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-border/50 bg-card">
        <span className="text-2xl">✅</span>
        <p className="mt-1.5 text-sm text-foreground">Нет рекомендаций</p>
        <p className="text-xs text-muted-foreground">Запасы в норме</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-2.5 py-2">SKU</th>
              <th className="px-2.5 py-2">Товар</th>
              <th className="px-2.5 py-2 text-right">Ост.</th>
              <th className="px-2.5 py-2 text-right">До 0</th>
              <th className="px-2.5 py-2 text-right">Заказ</th>
              <th className="px-2.5 py-2 text-center">Ст.</th>
              <th className="px-2.5 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {items.map((item) => (
              <tr
                key={`${item.sku}-${item.warehouse}`}
                className="transition-colors hover:bg-accent/30"
              >
                <td className="px-2.5 py-2">
                  <span className="font-mono text-xs font-medium text-foreground">
                    {item.sku}
                  </span>
                </td>
                <td className="px-2.5 py-2">
                  <div className="max-w-[160px]">
                    <p className="truncate text-xs font-medium text-foreground">
                      {item.productName}
                    </p>
                    {item.supplier && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {item.supplier}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-2.5 py-2 text-right">
                  <span
                    className={`text-xs font-medium ${
                      item.urgency === "critical"
                        ? "text-destructive"
                        : item.urgency === "warning"
                        ? "text-amber-600"
                        : "text-foreground"
                    }`}
                  >
                    {item.currentQty}
                  </span>
                </td>
                <td className="px-2.5 py-2 text-right">
                  <span
                    className={`text-xs font-medium ${
                      item.daysToStockout <= 3
                        ? "text-destructive"
                        : item.daysToStockout <= 7
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.daysToStockout === 999 ? "∞" : `${item.daysToStockout}д`}
                  </span>
                </td>
                <td className="px-2.5 py-2 text-right">
                  <span className="text-xs font-semibold text-foreground">
                    {item.recommendedQty}
                  </span>
                </td>
                <td className="px-2.5 py-2 text-center">
                  <UrgencyBadge urgency={item.urgency} showLabel={false} size="sm" />
                </td>
                <td className="px-2.5 py-2 text-right">
                  {onOrderClick && (
                    <button
                      onClick={() =>
                        onOrderClick(item.sku, item.warehouse, item.recommendedQty)
                      }
                      className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                        item.urgency === "critical"
                          ? "bg-destructive text-white hover:bg-destructive/90"
                          : item.urgency === "warning"
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
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
      <div className="border-t border-border/50 bg-muted/30 px-2.5 py-1.5 text-[10px] text-muted-foreground">
        💡 Отсортировано по срочности
      </div>
    </div>
  );
}
