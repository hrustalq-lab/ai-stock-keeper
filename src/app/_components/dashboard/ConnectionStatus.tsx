"use client";

/**
 * Индикатор статуса SSE соединения
 */

import { useInventoryUpdates } from "~/hooks/useInventoryUpdates";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export function ConnectionStatus() {
  const { isConnected, lastUpdate, reconnect } = useInventoryUpdates();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isConnected
              ? "bg-emerald-400 shadow-lg shadow-emerald-400/50"
              : "bg-zinc-500"
          }`}
        />
        <span className="text-sm text-zinc-400">
          {isConnected ? "Real-time" : "Отключено"}
        </span>
      </div>

      {lastUpdate && (
        <span className="text-xs text-zinc-500">
          Обновлено{" "}
          {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ru })}
        </span>
      )}

      {!isConnected && (
        <button
          onClick={reconnect}
          className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-600"
        >
          Переподключить
        </button>
      )}
    </div>
  );
}
