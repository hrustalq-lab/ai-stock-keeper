"use client";

/**
 * Обзор инвентаря — основные метрики
 * Issue #1, #4, #5: Compact layout, reduced padding, information density
 */

import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Package, AlertTriangle, RefreshCw, CheckCircle } from "lucide-react";

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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-2">
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const cards = [
    {
      label: "Товаров",
      value: stats.totalProducts.toLocaleString("ru-RU"),
      icon: Package,
      iconClassName: "text-primary",
      bgClassName: "bg-primary/10",
    },
    {
      label: "Низкий остаток",
      value: stats.lowStockCount.toLocaleString("ru-RU"),
      icon: AlertTriangle,
      iconClassName: stats.lowStockCount > 0 ? "text-amber-500" : "text-emerald-500",
      bgClassName: stats.lowStockCount > 0 ? "bg-amber-500/10" : "bg-emerald-500/10",
    },
    {
      label: "Синхр.",
      value: stats.lastSyncAt
        ? formatDistanceToNow(stats.lastSyncAt, {
            addSuffix: true,
            locale: ru,
          })
        : "—",
      icon: RefreshCw,
      iconClassName: "text-blue-500",
      bgClassName: "bg-blue-500/10",
      subIcon: stats.lastSyncAt ? CheckCircle : undefined,
      subIconClassName: "text-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50">
          <CardContent className="flex items-center gap-3 py-2">
            <div className={`shrink-0 rounded-md p-1.5 ${card.bgClassName}`}>
              <card.icon className={`size-4 ${card.iconClassName}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">{card.label}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-semibold leading-tight">{card.value}</span>
                {card.subIcon && (
                  <card.subIcon className={`size-3.5 ${card.subIconClassName}`} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
