/**
 * SSE Endpoint для real-time обновлений инвентаря
 * Подписывается на Redis pub/sub канал "inventory:updated"
 */

import Redis from "ioredis";
import { env } from "~/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Состояние для предотвращения двойного cleanup
      let isCleanedUp = false;
      let heartbeat: NodeJS.Timeout | null = null;
      let subscriber: Redis | null = null;

      // Централизованная функция cleanup для предотвращения утечек ресурсов
      const cleanup = async (reason: string) => {
        if (isCleanedUp) return;
        isCleanedUp = true;

        console.log(`[SSE] Cleanup: ${reason}`);

        // Очищаем heartbeat таймер
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }

        // Закрываем Redis subscriber
        if (subscriber) {
          try {
            await subscriber.unsubscribe();
            await subscriber.quit();
          } catch (err) {
            console.error("[SSE] Ошибка при закрытии Redis:", err);
          }
          subscriber = null;
        }

        // Закрываем поток
        try {
          controller.close();
        } catch {
          // Поток уже закрыт — игнорируем
        }
      };

      // КРИТИЧНО: Регистрируем abort listener ДО любых async операций
      // чтобы избежать race condition при отмене запроса
      request.signal.addEventListener("abort", () => {
        void cleanup("Клиент отключился");
      });

      // Проверяем, не был ли запрос уже отменён
      if (request.signal.aborted) {
        await cleanup("Запрос отменён до инициализации");
        return;
      }

      // Создаём отдельное подключение для subscriber (Redis требует)
      subscriber = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: false,
      });

      // Обработка ошибок Redis — закрываем поток и освобождаем ресурсы
      subscriber.on("error", (err) => {
        console.error("[SSE] Redis ошибка:", err.message);
        void cleanup(`Redis ошибка: ${err.message}`);
      });

      // Обработка сообщений из Redis
      subscriber.on("message", (_channel, message) => {
        if (isCleanedUp) return;
        try {
          const data = `data: ${message}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error("[SSE] Ошибка отправки сообщения:", error);
          void cleanup("Ошибка отправки сообщения");
        }
      });

      // Подписка на канал обновлений инвентаря
      try {
        await subscriber.subscribe("inventory:updated");
      } catch (err) {
        console.error("[SSE] Ошибка подписки на Redis:", err);
        await cleanup("Ошибка подписки");
        return;
      }

      // Ещё раз проверяем abort после async операции
      if (request.signal.aborted) {
        await cleanup("Запрос отменён во время подписки");
        return;
      }

      console.log("[SSE] Подписка на inventory:updated активна");

      // Heartbeat каждые 30 секунд для поддержания соединения
      heartbeat = setInterval(() => {
        if (isCleanedUp) {
          if (heartbeat) clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          void cleanup("Соединение закрыто (heartbeat failed)");
        }
      }, 30000);

      // Отправляем начальное сообщение о подключении
      const connectMessage = JSON.stringify({
        type: "connected",
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`data: ${connectMessage}\n\n`));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Отключаем буферизацию nginx
    },
  });
}
