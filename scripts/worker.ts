/**
 * Bull Worker — обработчик очереди задач
 * 
 * Запуск: npm run worker
 * 
 * Этот скрипт запускается как отдельный процесс и обрабатывает
 * события из очереди синхронизации с 1C.
 */

import "dotenv/config";
import { PrismaClient, type SyncQueue } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import Redis from "ioredis";

// ============================================
// Конфигурация
// ============================================

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres_dev_password@localhost:5432/ai_stock_keeper";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const POLL_INTERVAL = 5000; // 5 секунд между проверками очереди
const BATCH_SIZE = 100; // Максимум задач за один цикл
let isShuttingDown = false;

// Создаём подключения
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });
const redis = new Redis(REDIS_URL);

// ============================================
// Типы данных
// ============================================

interface GoodsEventData {
  id?: string;
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  reorderPoint?: number;
  supplier?: string;
}

interface DocumentEventData {
  documentId: string;
  docNumber: string;
  type: string;
  warehouse?: string;
  items?: Array<{
    sku: string;
    quantity: number;
    unitPrice?: number;
  }>;
}

// ============================================
// Обработчики событий
// ============================================

async function processWebhookEvent(event: string, data: unknown): Promise<void> {
  console.log(`[Worker] Обработка события: ${event}`);

  switch (event) {
    case "goods.created":
    case "goods.updated":
      await handleGoodsUpdated(data as GoodsEventData);
      break;

    case "goods.deleted":
      await handleGoodsDeleted(data as { sku: string; warehouse?: string });
      break;

    case "document.posted":
      await handleDocumentPosted(data as DocumentEventData);
      break;

    case "document.cancelled":
      await handleDocumentCancelled(data as DocumentEventData);
      break;

    default:
      console.warn(`[Worker] Неизвестное событие: ${event}`);
  }
}

async function handleGoodsUpdated(data: GoodsEventData): Promise<void> {
  const existing = await db.inventory.findFirst({
    where: { sku: data.sku, warehouse: data.warehouse },
  });

  if (existing) {
    await db.inventory.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        quantity: data.quantity,
        reorderPoint: data.reorderPoint,
        supplier: data.supplier,
        syncedAt: new Date(),
      },
    });
  } else {
    await db.inventory.create({
      data: {
        sku: data.sku,
        name: data.name,
        quantity: data.quantity,
        warehouse: data.warehouse,
        reorderPoint: data.reorderPoint ?? 10,
        supplier: data.supplier,
        syncedAt: new Date(),
      },
    });
  }

  // Инвалидируем Redis кеш
  await redis.del(`goods:${data.sku}`);
  await redis.del(`goods:${data.sku}:${data.warehouse}`);

  console.log(`[Worker] Товар обновлен: ${data.sku}`);
}

async function handleGoodsDeleted(data: { sku: string; warehouse?: string }): Promise<void> {
  await db.inventory.deleteMany({
    where: {
      sku: data.sku,
      ...(data.warehouse ? { warehouse: data.warehouse } : {}),
    },
  });

  await redis.del(`goods:${data.sku}`);
  if (data.warehouse) {
    await redis.del(`goods:${data.sku}:${data.warehouse}`);
  }

  console.log(`[Worker] Товар удален: ${data.sku}`);
}

async function handleDocumentPosted(data: DocumentEventData): Promise<void> {
  await db.document1C.updateMany({
    where: { docNumber: data.docNumber },
    data: {
      status: "posted",
      syncedAt: new Date(),
    },
  });

  // Обновляем остатки на основе типа документа
  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      const existing = await db.inventory.findFirst({
        where: { sku: item.sku, warehouse: data.warehouse ?? "" },
      });

      if (existing) {
        let newQuantity = existing.quantity;

        switch (data.type) {
          case "GoodsReceipt":
            newQuantity += item.quantity;
            break;
          case "Shipment":
            newQuantity -= item.quantity;
            break;
        }

        await db.inventory.update({
          where: { id: existing.id },
          data: { quantity: newQuantity, syncedAt: new Date() },
        });

        await redis.del(`goods:${item.sku}`);
      }
    }
  }

  console.log(`[Worker] Документ проведен: ${data.docNumber}`);
}

async function handleDocumentCancelled(data: DocumentEventData): Promise<void> {
  await db.document1C.updateMany({
    where: { docNumber: data.docNumber },
    data: {
      status: "cancelled",
      syncedAt: new Date(),
    },
  });

  console.log(`[Worker] Документ отменен: ${data.docNumber}`);
}

// ============================================
// Обработка очереди
// ============================================

async function processPendingJobs(): Promise<number> {
  const pendingJobs = await db.syncQueue.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  let processed = 0;

  for (const job of pendingJobs) {
    try {
      // Помечаем как processing
      await db.syncQueue.update({
        where: { id: job.id },
        data: { status: "processing" },
      });

      // Обрабатываем
      await processWebhookEvent(job.jobType, job.payload);

      // Помечаем как completed
      await db.syncQueue.update({
        where: { id: job.id },
        data: {
          status: "completed",
          processedAt: new Date(),
        },
      });

      processed++;
    } catch (error) {
      // Помечаем как failed
      await db.syncQueue.update({
        where: { id: job.id },
        data: {
          status: "failed",
          retryCount: job.retryCount + 1,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });

      console.error(`[Worker] Ошибка обработки job ${job.id}:`, error);
    }
  }

  return processed;
}

// ============================================
// Основной цикл обработки
// ============================================

async function processQueue(): Promise<void> {
  while (!isShuttingDown) {
    try {
      const processed = await processPendingJobs();

      if (processed > 0) {
        console.log(`[Worker] Обработано ${processed} задач`);
      }

      await sleep(POLL_INTERVAL);
    } catch (error) {
      console.error("[Worker] Ошибка обработки очереди:", error);
      await sleep(POLL_INTERVAL);
    }
  }
}

// ============================================
// Redis Pub/Sub для real-time обработки
// ============================================

async function subscribeToWebhooks(): Promise<void> {
  const subscriber = new Redis(REDIS_URL);

  subscriber.on("error", (error) => {
    console.error("[Worker] Redis subscriber error:", error);
  });

  await subscriber.subscribe("1c:webhook");

  subscriber.on("message", (channel, message) => {
    if (channel !== "1c:webhook") return;

    try {
      const payload = JSON.parse(message) as { event: string; data: unknown };
      console.log(`[Worker] Real-time событие: ${payload.event}`);

      processWebhookEvent(payload.event, payload.data).catch((error) => {
        console.error("[Worker] Ошибка real-time обработки:", error);
      });
    } catch (error) {
      console.error("[Worker] Ошибка парсинга webhook:", error);
    }
  });

  console.log("[Worker] Подписан на Redis канал 1c:webhook");
}

// ============================================
// Graceful Shutdown
// ============================================

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[Worker] Получен сигнал ${signal}, завершение...`);
  isShuttingDown = true;

  await sleep(2000);

  try {
    await redis.quit();
    await db.$disconnect();
    await pool.end();
    console.log("[Worker] Соединения закрыты");
  } catch (error) {
    console.error("[Worker] Ошибка при завершении:", error);
  }

  process.exit(0);
}

// ============================================
// Утилиты
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// Запуск
// ============================================

async function main(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════╗
║           ⚙️  Queue Worker запущен                      ║
╠════════════════════════════════════════════════════════╣
║  Режим: Polling (${POLL_INTERVAL / 1000}s) + Redis Pub/Sub             ║
║  Batch size: ${BATCH_SIZE}                                     ║
║                                                        ║
║  Нажмите Ctrl+C для остановки                          ║
╚════════════════════════════════════════════════════════╝
  `);

  // Проверяем подключение к БД
  try {
    await db.$connect();
    console.log("[Worker] PostgreSQL подключен");
  } catch (error) {
    console.error("[Worker] Ошибка подключения к PostgreSQL:", error);
    process.exit(1);
  }

  // Проверяем подключение к Redis
  try {
    await redis.ping();
    console.log("[Worker] Redis подключен");
  } catch (error) {
    console.error("[Worker] Ошибка подключения к Redis:", error);
    process.exit(1);
  }

  // Обработка сигналов завершения
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  // Запускаем подписку на Redis
  await subscribeToWebhooks();

  // Запускаем основной цикл обработки
  await processQueue();
}

void main();
