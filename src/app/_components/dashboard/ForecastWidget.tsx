"use client";

/**
 * ForecastWidget - виджет прогнозов для Dashboard
 * Phase 4: Predictive Analytics
 */

import Link from "next/link";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { TrendingUp, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

interface ForecastWidgetProps {
  warehouse?: string;
  limit?: number;
}

export function ForecastWidget({ warehouse, limit = 3 }: ForecastWidgetProps) {
  // Получаем сводку рекомендаций
  const { data: summary, isLoading } = api.forecast.getRecommendationsSummary.useQuery(
    { warehouse }
  );

  // Получаем топ критичных рекомендаций
  const { data: topCritical } = api.forecast.getRecommendations.useQuery({
    warehouse,
    urgency: "critical",
    limit,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  const hasCritical = (summary?.critical ?? 0) > 0;

  return (
    <Card className={hasCritical ? "border-destructive/50" : ""}>
      {/* Заголовок */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="size-4 text-primary" />
          Прогноз запасов
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
          <Link href="/forecast">
            Подробнее
            <ArrowRight className="ml-1 size-3" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Сводка по срочности */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-1.5 text-center sm:p-2">
            <p className="text-base font-bold text-destructive sm:text-lg">{summary?.critical ?? 0}</p>
            <p className="text-[10px] text-destructive/70 sm:text-xs">Критично</p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-1.5 text-center sm:p-2">
            <p className="text-base font-bold text-amber-400 sm:text-lg">{summary?.warning ?? 0}</p>
            <p className="text-[10px] text-amber-400/70 sm:text-xs">Внимание</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-center sm:p-2">
            <p className="text-base font-bold text-emerald-400 sm:text-lg">{summary?.normal ?? 0}</p>
            <p className="text-[10px] text-emerald-400/70 sm:text-xs">Норма</p>
          </div>
        </div>

        {/* Критичные товары */}
        {topCritical && topCritical.length > 0 ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertCircle className="size-3" />
              Требуют срочного заказа:
            </p>
            {topCritical.map((item) => (
              <div
                key={`${item.sku}-${item.warehouse}`}
                className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Остаток: {item.currentQty} · До 0: {item.daysToStockout} дн
                  </p>
                </div>
                <Badge variant="destructive" className="ml-2">
                  +{item.recommendedQty}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <CheckCircle className="size-8 text-emerald-500" />
            <p className="text-sm text-emerald-400">Нет критичных товаров</p>
          </div>
        )}

        {/* Общая сумма рекомендаций */}
        {(summary?.totalRecommendedQty ?? 0) > 0 && (
          <div className="border-t pt-3 text-center">
            <p className="text-xs text-muted-foreground">
              Всего рекомендовано заказать:{" "}
              <span className="font-semibold text-foreground">
                {summary?.totalRecommendedQty} шт
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
