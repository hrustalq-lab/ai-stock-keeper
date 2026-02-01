"use client";

/**
 * Лента последней активности (транзакции)
 */

import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "~/trpc/react";
import { useInventoryUpdates, type InventoryUpdate } from "~/hooks/useInventoryUpdates";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Activity,
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  FileEdit,
  RefreshCw,
  Inbox,
} from "lucide-react";

interface RecentActivityFeedProps {
  warehouse?: string;
  limit?: number;
}

// Иконки для типов операций
const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  intake: PackagePlus,
  picking: PackageMinus,
  transfer: ArrowLeftRight,
  adjustment: FileEdit,
  update: RefreshCw,
};

const typeLabels: Record<string, string> = {
  intake: "Приёмка",
  picking: "Отгрузка",
  transfer: "Перемещение",
  adjustment: "Корректировка",
  update: "Обновление",
};

const typeColors: Record<string, string> = {
  intake: "text-emerald-500",
  picking: "text-amber-500",
  transfer: "text-primary",
  adjustment: "text-violet-500",
  update: "text-muted-foreground",
};

export function RecentActivityFeed({
  warehouse,
  limit = 10,
}: RecentActivityFeedProps) {
  // Исторические данные из БД
  const { data: dbActivity, isLoading } = api.dashboard.getRecentActivity.useQuery(
    { warehouse, limit },
    {
      refetchInterval: 60000,
    }
  );

  // Real-time обновления через SSE
  const { updates: realtimeUpdates, isConnected } = useInventoryUpdates();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Комбинируем real-time и исторические данные
  const combinedActivity = [
    // Real-time обновления в начале
    ...realtimeUpdates.slice(0, 5).map((update: InventoryUpdate) => ({
      id: `rt-${update.id}`,
      type: "update" as const,
      sku: update.sku,
      name: update.name,
      quantity: update.quantity,
      warehouse: update.warehouse,
      createdAt: new Date(update.syncedAt),
      isRealtime: true,
    })),
    // Исторические данные
    ...(dbActivity?.map((item) => ({
      id: `db-${item.id}`,
      type: item.type,
      sku: item.sku,
      name: item.name ?? undefined,
      quantity: item.quantity,
      warehouse: item.warehouse,
      createdAt: item.createdAt,
      isRealtime: false,
    })) ?? []),
  ].slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="size-4 text-primary" />
          Последние операции
        </CardTitle>
        <Badge variant={isConnected ? "default" : "secondary"} className="gap-1.5">
          <span className={`size-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
          {isConnected ? "Live" : "Offline"}
        </Badge>
      </CardHeader>

      <CardContent>
        {combinedActivity.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <Inbox className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Нет операций</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              {combinedActivity.map((item) => {
                const IconComponent = typeIcons[item.type] ?? RefreshCw;
                const iconColor = typeColors[item.type] ?? "text-muted-foreground";
                
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-secondary/50 ${
                      item.isRealtime ? "bg-emerald-500/5 ring-1 ring-emerald-500/20" : "bg-secondary/30"
                    }`}
                  >
                    <div className={`rounded-lg bg-secondary p-2 ${iconColor}`}>
                      <IconComponent className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {item.name ?? item.sku}
                        </p>
                        {item.isRealtime && (
                          <Badge variant="outline" className="h-5 border-emerald-500/30 px-1.5 text-[10px] text-emerald-500">
                            LIVE
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {typeLabels[item.type] ?? item.type} • {item.warehouse ?? "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-mono text-sm font-bold ${
                          item.quantity > 0 ? "text-emerald-500" : "text-destructive"
                        }`}
                      >
                        {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(item.createdAt, {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
