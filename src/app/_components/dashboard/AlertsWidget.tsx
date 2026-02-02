"use client";

/**
 * Виджет последних алертов
 * Issue #4, #5: Compact layout, information density
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
      <Card className="border-border/50">
        <CardHeader className="pb-1.5">
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1.5">
        <CardTitle className="flex shrink-0 items-center gap-1.5 text-sm font-medium">
          <Bell className="size-3.5 text-primary" />
          Алерты
        </CardTitle>
        {stats && (
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px]">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {stats.activeRules}
            </Badge>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {stats.totalSent}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {!history || history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <BellOff className="size-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Нет алертов</p>
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <Link href="/settings/alerts">
                <Settings className="mr-1.5 size-3" />
                Настроить
              </Link>
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[160px]">
            <div className="space-y-1.5">
              {history.map((alert: AlertHistoryItem) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-2 rounded-md bg-secondary/30 px-2 py-1.5 transition-colors hover:bg-secondary/50"
                >
                  <div className={`mt-0.5 rounded-full p-0.5 ${
                    alert.status === "sent" 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {alert.status === "sent" ? (
                      <CheckCircle className="size-3" />
                    ) : (
                      <XCircle className="size-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium leading-tight">{alert.ruleName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {alert.productName ?? alert.sku}:{" "}
                      <span className="font-mono text-amber-500">
                        {alert.newValue}
                      </span>
                      /{alert.threshold}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {alert.warehouse} •{" "}
                      {formatDistanceToNow(alert.createdAt, {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button variant="ghost" size="sm" className="h-7 w-full text-xs" asChild>
          <Link href="/settings/alerts">
            Управление
            <ArrowRight className="ml-1 size-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
