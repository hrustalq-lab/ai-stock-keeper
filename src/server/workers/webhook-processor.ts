import { db } from "~/server/db";
import { inventoryCache, type InventoryData } from "~/server/services/inventory-cache";

// ============================================
// Типы событий webhook
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
// Процессор webhook событий
// ============================================

/**
 * Обработать событие из очереди
 */
export async function processWebhookEvent(event: string, data: unknown): Promise<void> {
  console.log(`[Webhook Processor] Обработка события: ${event}`);

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
      console.warn(`[Webhook Processor] Неизвестное событие: ${event}`);
  }
}

/**
 * Обработка создания/обновления товара
 */
async function handleGoodsUpdated(data: GoodsEventData): Promise<void> {
  const inventoryData: InventoryData = {
    sku: data.sku,
    name: data.name,
    quantity: data.quantity,
    warehouse: data.warehouse,
    reorderPoint: data.reorderPoint,
    supplier: data.supplier,
  };

  await inventoryCache.updateCache(inventoryData);
  console.log(`[Webhook Processor] Товар обновлен: ${data.sku}`);
}

/**
 * Обработка удаления товара
 */
async function handleGoodsDeleted(data: { sku: string; warehouse?: string }): Promise<void> {
  // Удаляем из БД
  await db.inventory.deleteMany({
    where: {
      sku: data.sku,
      ...(data.warehouse ? { warehouse: data.warehouse } : {}),
    },
  });

  // Инвалидируем кеш
  await inventoryCache.invalidate(data.sku, data.warehouse);
  console.log(`[Webhook Processor] Товар удален: ${data.sku}`);
}

/**
 * Обработка проведения документа
 */
async function handleDocumentPosted(data: DocumentEventData): Promise<void> {
  // Обновляем статус документа в локальной БД
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

        // Определяем изменение количества по типу документа
        switch (data.type) {
          case "GoodsReceipt":
            // Приход - увеличиваем остаток
            newQuantity += item.quantity;
            break;
          case "Shipment":
            // Отгрузка - уменьшаем остаток
            newQuantity -= item.quantity;
            break;
          // Transfer обрабатывается отдельно (два склада)
        }

        await db.inventory.update({
          where: { id: existing.id },
          data: { quantity: newQuantity, syncedAt: new Date() },
        });

        // Инвалидируем кеш
        await inventoryCache.invalidate(item.sku, data.warehouse);
      }
    }
  }

  console.log(`[Webhook Processor] Документ проведен: ${data.docNumber}`);
}

/**
 * Обработка отмены документа
 */
async function handleDocumentCancelled(data: DocumentEventData): Promise<void> {
  await db.document1C.updateMany({
    where: { docNumber: data.docNumber },
    data: {
      status: "cancelled",
      syncedAt: new Date(),
    },
  });

  console.log(`[Webhook Processor] Документ отменен: ${data.docNumber}`);
}

// ============================================
// Обработчик очереди
// ============================================

/**
 * Обработать все pending задачи из очереди
 */
export async function processPendingJobs(): Promise<number> {
  const pendingJobs = await db.syncQueue.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 100, // Batch size
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

      console.error(`[Webhook Processor] Ошибка обработки job ${job.id}:`, error);
    }
  }

  return processed;
}
