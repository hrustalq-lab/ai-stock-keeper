"use client";

/**
 * Виджет последних алертов
 */

import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { api, type RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Bell, BellOff, CheckCircle, XCircle, ArrowRight, Settings } from "lucide-react";
import Link from "next/link";

// Тип алерта из роутера
type AlertHistoryItem = RouterOutputs["alerts"]["getHistory"][number];

interface AlertsWidgetProps {
  limit?: number;
}

export function AlertsWidget({ limit = 5 }: AlertsWidgetProps) {
  const { data: history, isLoading } = api.alerts.getHistory.useQuery(
    { limit },
    {
      refetchInterval: 30000,
    }
  );

  const { data: stats } = api.alerts.getStats.useQuery(undefined, {
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="flex shrink-0 items-center gap-2 text-sm font-medium">
          <Bell className="size-4 text-primary" />
          Алерты
        </CardTitle>
        {stats && (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {stats.activeRules}
            </Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {stats.totalSent} отправлено
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {!history || history.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <BellOff className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Нет алертов</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/alerts">
                <Settings className="mr-2 size-4" />
                Настроить алерты
              </Link>
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[220px]">
            <div className="space-y-2">
              {history.map((alert: AlertHistoryItem) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
                >
                  <div className={`mt-0.5 rounded-full p-1 ${
                    alert.status === "sent" 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {alert.status === "sent" ? (
                      <CheckCircle className="size-4" />
                    ) : (
                      <XCircle className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{alert.ruleName}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.productName ?? alert.sku}:{" "}
                      <span className="font-mono text-amber-500">
                        {alert.newValue} шт
                      </span>{" "}
                      (порог: {alert.threshold})
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{alert.warehouse}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(alert.createdAt, {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link href="/settings/alerts">
            Управление алертами
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
