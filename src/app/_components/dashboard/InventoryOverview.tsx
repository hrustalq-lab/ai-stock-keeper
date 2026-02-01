"use client";

/**
 * Обзор инвентаря — основные метрики
 */

import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
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
      label: "Всего товаров",
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
      label: "Синхронизация",
      value: stats.lastSyncAt
        ? formatDistanceToNow(stats.lastSyncAt, {
            addSuffix: true,
            locale: ru,
          })
        : "—",
      icon: RefreshCw,
      iconClassName: "text-violet-500",
      bgClassName: "bg-violet-500/10",
      subIcon: stats.lastSyncAt ? CheckCircle : undefined,
      subIconClassName: "text-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
              {card.label}
            </CardTitle>
            <div className={`shrink-0 rounded-lg p-1.5 sm:p-2 ${card.bgClassName}`}>
              <card.icon className={`size-3.5 sm:size-4 ${card.iconClassName}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-xl font-bold sm:text-2xl">{card.value}</span>
              {card.subIcon && (
                <card.subIcon className={`mb-0.5 size-4 sm:mb-1 sm:size-5 ${card.subIconClassName}`} />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
