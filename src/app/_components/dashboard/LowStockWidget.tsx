"use client";

/**
 * Виджет товаров с низким остатком
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
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="size-4 text-amber-500" />
          Низкий остаток
        </CardTitle>
        {items && items.length > 0 && (
          <Badge variant="secondary">{items.length}</Badge>
        )}
      </CardHeader>

      <CardContent>
        {!items || items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle className="size-10 text-emerald-500" />
            <p className="text-sm text-muted-foreground">Все остатки в норме</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.sku} • {item.warehouse}
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    <p
                      className={`text-lg font-bold ${
                        item.quantity === 0
                          ? "text-destructive"
                          : "text-amber-500"
                      }`}
                    >
                      {item.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      / {item.reorderPoint}
                    </p>
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
