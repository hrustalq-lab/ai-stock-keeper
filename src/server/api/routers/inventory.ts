import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { db } from "~/server/db";
import { inventoryCache } from "~/server/services/inventory-cache";
import { oneCClient } from "~/server/services/one-c-client";

// ============================================
// Схемы валидации
// ============================================

const DocumentItemSchema = z.object({
  sku: z.string().min(1, "SKU обязателен"),
  quantity: z.number().int().positive("Количество должно быть положительным"),
  unitPrice: z.number().optional(),
});

// ============================================
// Inventory Router
// ============================================

export const inventoryRouter = createTRPCRouter({
  /**
   * Получить все товары
   */
  getAll: publicProcedure
    .input(
      z.object({
        warehouse: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return inventoryCache.getAllGoods(input?.warehouse);
    }),

  /**
   * Получить товар по SKU
   */
  getBySku: publicProcedure
    .input(
      z.object({
        sku: z.string().min(1),
        warehouse: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return inventoryCache.getGood(input.sku, input.warehouse);
    }),

  /**
   * Получить товары по списку SKU
   */
  getBySkus: publicProcedure
    .input(
      z.object({
        skus: z.array(z.string().min(1)),
        warehouse: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const goods = await Promise.all(
        input.skus.map((sku) => inventoryCache.getGood(sku, input.warehouse))
      );
      return goods.filter((g): g is Exclude<typeof g, null> => g !== null);
    }),

  /**
   * Получить товары с низким остатком
   */
  getLowStock: publicProcedure
    .input(
      z.object({
        warehouse: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return db.inventory.findMany({
        where: {
          ...(input?.warehouse ? { warehouse: input.warehouse } : {}),
        },
        orderBy: { quantity: "asc" },
      });
    }),

  /**
   * Создать приходную накладную (Поступление товаров)
   */
  createGoodsReceipt: publicProcedure
    .input(
      z.object({
        items: z.array(DocumentItemSchema).min(1, "Минимум 1 позиция"),
        warehouse: z.string().min(1, "Склад обязателен"),
        supplier: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Создаем документ в 1C
      const result = await oneCClient.createGoodsReceipt({
        items: input.items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        warehouse: input.warehouse,
        supplier: input.supplier,
      });

      // Сохраняем ссылку на документ локально
      await db.document1C.create({
        data: {
          type: "GoodsReceipt",
          docNumber: result.docNumber,
          docDate: new Date(),
          warehouse: input.warehouse,
          status: result.status,
        },
      });

      // Создаем транзакции для каждой позиции
      for (const item of input.items) {
        await db.transaction.create({
          data: {
            type: "intake",
            sku: item.sku,
            quantity: item.quantity,
            toWarehouse: input.warehouse,
            documentId: result.documentId,
            syncedWith1C: true,
            syncedAt: new Date(),
          },
        });
      }

      // Логируем в аудит
      await db.auditLog.create({
        data: {
          action: "goods_receipt_created",
          tableName: "documents_1c",
          recordId: result.documentId,
          newValue: { items: input.items, warehouse: input.warehouse },
        },
      });

      return result;
    }),

  /**
   * Создать отгрузку (Реализация товаров)
   */
  createShipment: publicProcedure
    .input(
      z.object({
        orderNumber: z.string().min(1, "Номер заказа обязателен"),
        items: z.array(DocumentItemSchema).min(1, "Минимум 1 позиция"),
        warehouse: z.string().min(1, "Склад обязателен"),
      })
    )
    .mutation(async ({ input }) => {
      // Создаем документ в 1C
      const result = await oneCClient.createShipment({
        orderNumber: input.orderNumber,
        items: input.items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
        })),
        warehouse: input.warehouse,
      });

      // Сохраняем ссылку на документ локально
      await db.document1C.create({
        data: {
          type: "Shipment",
          docNumber: result.docNumber,
          docDate: new Date(),
          warehouse: input.warehouse,
          status: result.status,
        },
      });

      // Создаем транзакции
      for (const item of input.items) {
        await db.transaction.create({
          data: {
            type: "picking",
            sku: item.sku,
            quantity: item.quantity,
            fromWarehouse: input.warehouse,
            documentId: result.documentId,
            syncedWith1C: true,
            syncedAt: new Date(),
          },
        });
      }

      return result;
    }),

  /**
   * Создать перемещение между складами
   */
  createTransfer: publicProcedure
    .input(
      z.object({
        fromWarehouse: z.string().min(1, "Склад-источник обязателен"),
        toWarehouse: z.string().min(1, "Склад-получатель обязателен"),
        items: z.array(DocumentItemSchema).min(1, "Минимум 1 позиция"),
      })
    )
    .mutation(async ({ input }) => {
      // Создаем документ в 1C
      const result = await oneCClient.createTransfer({
        fromWarehouse: input.fromWarehouse,
        toWarehouse: input.toWarehouse,
        items: input.items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
        })),
      });

      // Сохраняем ссылку на документ локально
      await db.document1C.create({
        data: {
          type: "Transfer",
          docNumber: result.docNumber,
          docDate: new Date(),
          warehouse: input.fromWarehouse,
          status: result.status,
        },
      });

      // Создаем транзакции
      for (const item of input.items) {
        await db.transaction.create({
          data: {
            type: "transfer",
            sku: item.sku,
            quantity: item.quantity,
            fromWarehouse: input.fromWarehouse,
            toWarehouse: input.toWarehouse,
            documentId: result.documentId,
            syncedWith1C: true,
            syncedAt: new Date(),
          },
        });
      }

      return result;
    }),

  /**
   * Получить статус синхронизации
   */
  getSyncStatus: publicProcedure.query(async () => {
    const [pendingJobs, failedJobs, lastSync] = await Promise.all([
      db.syncQueue.count({ where: { status: "pending" } }),
      db.syncQueue.count({ where: { status: "failed" } }),
      db.syncQueue.findFirst({
        where: { status: "completed" },
        orderBy: { processedAt: "desc" },
        select: { processedAt: true },
      }),
    ]);

    return {
      pendingJobs,
      failedJobs,
      lastSync: lastSync?.processedAt ?? null,
    };
  }),

  /**
   * Получить историю транзакций
   */
  getTransactions: publicProcedure
    .input(
      z.object({
        sku: z.string().optional(),
        type: z.enum(["intake", "picking", "transfer", "adjustment"]).optional(),
        limit: z.number().int().positive().default(50),
        offset: z.number().int().nonnegative().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      return db.transaction.findMany({
        where: {
          ...(input?.sku ? { sku: input.sku } : {}),
          ...(input?.type ? { type: input.type } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
        skip: input?.offset ?? 0,
      });
    }),
});
