"use client";

/**
 * React Hook для подписки на real-time обновления инвентаря через SSE
 */

import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Структура обновления инвентаря
 */
export interface InventoryUpdate {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  reorderPoint: number;
  syncedAt: string;
}

/**
 * Типы SSE сообщений
 */
interface SSEMessage {
  type?: "connected";
  timestamp?: string;
}

type SSEData = InventoryUpdate | SSEMessage;

interface UseInventoryUpdatesReturn {
  /** Последние обновления (max 100) */
  updates: InventoryUpdate[];
  /** Статус подключения */
  isConnected: boolean;
  /** Время последнего обновления */
  lastUpdate: Date | null;
  /** Очистить историю обновлений */
  clearUpdates: () => void;
  /** Переподключиться вручную */
  reconnect: () => void;
}

export function useInventoryUpdates(): UseInventoryUpdatesReturn {
  const [updates, setUpdates] = useState<InventoryUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Закрываем предыдущее соединение
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Очищаем таймаут переподключения
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const eventSource = new EventSource("/api/sse/inventory");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("[SSE Hook] Подключено");
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as SSEData;

        // Пропускаем служебные сообщения
        if ("type" in data && data.type === "connected") {
          console.log("[SSE Hook] Соединение установлено:", data.timestamp);
          return;
        }

        // Это обновление инвентаря
        const update = data as InventoryUpdate;
        if (update.sku) {
          setUpdates((prev) => [update, ...prev.slice(0, 99)]); // Max 100
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error("[SSE Hook] Ошибка парсинга:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[SSE Hook] Ошибка соединения:", error);
      setIsConnected(false);

      // EventSource автоматически переподключается
      // Но мы ставим флаг для UI
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[SSE Hook] Попытка переподключения...");
      }, 3000);
    };
  }, []);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
    setLastUpdate(null);
  }, []);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    updates,
    isConnected,
    lastUpdate,
    clearUpdates,
    reconnect,
  };
}
