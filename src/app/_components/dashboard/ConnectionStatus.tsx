"use client";

/**
 * Индикатор статуса SSE соединения
 */

import { useInventoryUpdates } from "~/hooks/useInventoryUpdates";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { WifiOff, RefreshCw } from "lucide-react";

export function ConnectionStatus() {
  const { isConnected, lastUpdate, reconnect } = useInventoryUpdates();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="cursor-default gap-1.5"
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="hidden sm:inline">Real-time</span>
                </>
              ) : (
                <>
                  <WifiOff className="size-3" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isConnected ? (
              <p>
                SSE соединение активно
                {lastUpdate && (
                  <>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      Обновлено {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ru })}
                    </span>
                  </>
                )}
              </p>
            ) : (
              <p>Соединение потеряно. Нажмите для переподключения.</p>
            )}
          </TooltipContent>
        </Tooltip>

        {!isConnected && (
          <Button size="sm" variant="outline" onClick={reconnect} className="h-7 gap-1.5">
            <RefreshCw className="size-3" />
            <span className="hidden sm:inline">Подключить</span>
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}
