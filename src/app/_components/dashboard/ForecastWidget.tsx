"use client";

/**
 * ForecastWidget - виджет прогнозов для Dashboard
 * Issue #4, #5: Compact layout, information density
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
      <Card className="border-border/50">
        <CardHeader className="pb-1.5">
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <Skeleton className="h-12" />
        </CardContent>
      </Card>
    );
  }

  const hasCritical = (summary?.critical ?? 0) > 0;

  return (
    <Card className={`border-border/50 ${hasCritical ? "border-destructive/30" : ""}`}>
      {/* Заголовок */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <TrendingUp className="size-3.5 text-primary" />
          Прогноз
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="h-6 px-1.5 text-[10px]">
          <Link href="/forecast">
            Ещё
            <ArrowRight className="ml-0.5 size-2.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Сводка по срочности - компактная */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1 text-center">
            <p className="text-sm font-semibold text-destructive">{summary?.critical ?? 0}</p>
            <p className="text-[9px] text-destructive/70">Критич.</p>
          </div>
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-center">
            <p className="text-sm font-semibold text-amber-600">{summary?.warning ?? 0}</p>
            <p className="text-[9px] text-amber-600/70">Внимание</p>
          </div>
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-center">
            <p className="text-sm font-semibold text-emerald-600">{summary?.normal ?? 0}</p>
            <p className="text-[9px] text-emerald-600/70">Норма</p>
          </div>
        </div>

        {/* Критичные товары */}
        {topCritical && topCritical.length > 0 ? (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <AlertCircle className="size-2.5" />
              Срочный заказ:
            </p>
            {topCritical.map((item) => (
              <div
                key={`${item.sku}-${item.warehouse}`}
                className="flex items-center justify-between rounded-md border border-destructive/15 bg-destructive/5 px-2 py-1"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium leading-tight">
                    {item.productName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.currentQty} шт · {item.daysToStockout} дн
                  </p>
                </div>
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
                  +{item.recommendedQty}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 py-2">
            <CheckCircle className="size-4 text-emerald-500" />
            <p className="text-xs text-emerald-600">Критичных нет</p>
          </div>
        )}

        {/* Общая сумма рекомендаций */}
        {(summary?.totalRecommendedQty ?? 0) > 0 && (
          <div className="border-t pt-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">
              Заказать:{" "}
              <span className="font-medium text-foreground">
                {summary?.totalRecommendedQty} шт
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
