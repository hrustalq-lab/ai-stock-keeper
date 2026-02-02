"use client";

/**
 * Виджет товаров с низким остатком
 * Issue #4, #5: Compact layout, information density
 */

import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { AlertTriangle, CheckCircle } from "lucide-react";

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
      <Card className="border-border/50">
        <CardHeader className="pb-1.5">
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <AlertTriangle className="size-3.5 text-amber-500" />
          Низкий остаток
        </CardTitle>
        {items && items.length > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{items.length}</Badge>
        )}
      </CardHeader>

      <CardContent>
        {!items || items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <CheckCircle className="size-5 text-emerald-500" />
            <p className="text-sm text-muted-foreground">Остатки в норме</p>
          </div>
        ) : (
          <ScrollArea className="h-[160px]">
            <div className="space-y-1.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md bg-secondary/40 px-2.5 py-1.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">
                      {item.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {item.sku} • {item.warehouse}
                    </p>
                  </div>
                  <div className="ml-2 flex items-baseline gap-0.5 text-right">
                    <span
                      className={`text-base font-semibold ${
                        item.quantity === 0
                          ? "text-destructive"
                          : "text-amber-500"
                      }`}
                    >
                      {item.quantity}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      /{item.reorderPoint}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
