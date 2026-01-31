/**
 * tRPC Router для Dashboard (Phase 3)
 * Статистика, активность, тренды
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

// Типы для статистики
interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalQuantity: number;
  lastSyncAt: Date | null;
  warehouses: string[];
}

// Типы для активности
interface ActivityItem {
  id: number;
  type: string;
  sku: string;
  name: string | null;
  quantity: number;
  warehouse: string | null;
  createdAt: Date;
}

export const dashboardRouter = createTRPCRouter({
  /**
   * Получить общую статистику dashboard
   */
  getStats: publicProcedure
    .input(
      z
        .object({
          warehouse: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }): Promise<DashboardStats> => {
      const warehouse = input?.warehouse;
      const whereClause = warehouse ? { warehouse } : {};

      // Параллельные запросы для скорости
      const [
        totalProducts,
        allItems,
        quantitySum,
        lastSync,
        warehouseList,
      ] = await Promise.all([
        // Всего товаров
        db.inventory.count({ where: whereClause }),

        // Получаем все товары для подсчёта низких остатков
        db.inventory.findMany({
          where: whereClause,
          select: { quantity: true, reorderPoint: true },
        }),

        // Сумма остатков
        db.inventory.aggregate({
          where: whereClause,
          _sum: { quantity: true },
        }),

        // Последняя синхронизация
        db.inventory.findFirst({
          where: whereClause,
          orderBy: { syncedAt: "desc" },
          select: { syncedAt: true },
        }),

        // Список складов
        db.inventory.findMany({
          select: { warehouse: true },
          distinct: ["warehouse"],
        }),
      ]);

      // Подсчитываем товары с низким остатком (quantity <= reorderPoint)
      const lowStockCount = allItems.filter(
        (item) => item.quantity <= item.reorderPoint
      ).length;

      return {
        totalProducts,
        lowStockCount,
        totalQuantity: quantitySum._sum.quantity ?? 0,
        lastSyncAt: lastSync?.syncedAt ?? null,
        warehouses: warehouseList.map((w) => w.warehouse),
      };
    }),

  /**
   * Получить последнюю активность (транзакции)
   */
  getRecentActivity: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        warehouse: z.string().optional(),
      })
    )
    .query(async ({ input }): Promise<ActivityItem[]> => {
      const transactions = await db.transaction.findMany({
        where: input.warehouse
          ? {
              OR: [
                { fromWarehouse: input.warehouse },
                { toWarehouse: input.warehouse },
              ],
            }
          : {},
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      // Получаем уникальные SKU для поиска имён товаров
      const uniqueSkus = [...new Set(transactions.map((t) => t.sku))];
      
      // Загружаем имена товаров из Inventory (берём первый найденный для каждого SKU)
      const inventoryItems = await db.inventory.findMany({
        where: { sku: { in: uniqueSkus } },
        select: { sku: true, name: true },
        distinct: ["sku"],
      });
      
      // Создаём map SKU -> name для быстрого поиска
      const skuNameMap = new Map(inventoryItems.map((i) => [i.sku, i.name]));

      return transactions.map((t) => ({
        id: t.id,
        type: t.type,
        sku: t.sku,
        name: skuNameMap.get(t.sku) ?? null,
        quantity: t.quantity,
        warehouse: t.toWarehouse ?? t.fromWarehouse,
        createdAt: t.createdAt,
      }));
    }),

  /**
   * Получить тренды остатков за период
   */
  getStockTrends: publicProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(7),
        warehouse: z.string().optional(),
        sku: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Получаем снапшоты за период
      const snapshots = await db.inventorySnapshot.findMany({
        where: {
          createdAt: { gte: startDate },
          ...(input.warehouse && { warehouse: input.warehouse }),
        },
        orderBy: { createdAt: "asc" },
      });

      // Группируем по дате
      const trendData: Record<string, number> = {};

      for (const snapshot of snapshots) {
        const dateKey = snapshot.createdAt.toISOString().split("T")[0]!;

        if (input.sku) {
          // Конкретный SKU
          const snapshotData = snapshot.snapshot as Record<string, number>;
          trendData[dateKey] = snapshotData[input.sku] ?? 0;
        } else {
          // Общее количество
          trendData[dateKey] = (trendData[dateKey] ?? 0) + snapshot.totalQty;
        }
      }

      return Object.entries(trendData).map(([date, quantity]) => ({
        date,
        quantity,
      }));
    }),

  /**
   * Получить товары с низким остатком
   */
  getLowStock: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        warehouse: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const whereClause = input.warehouse ? { warehouse: input.warehouse } : {};

      // Получаем все товары и фильтруем в коде (Prisma не поддерживает сравнение столбцов)
      const allItems = await db.inventory.findMany({
        where: whereClause,
        orderBy: { quantity: "asc" },
      });

      // Фильтруем товары с низким остатком (quantity <= reorderPoint)
      const lowStockItems = allItems
        .filter((item) => item.quantity <= item.reorderPoint)
        .slice(0, input.limit);

      return lowStockItems.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        reorderPoint: item.reorderPoint,
        warehouse: item.warehouse,
        deficit: item.reorderPoint - item.quantity,
      }));
    }),

  /**
   * Получить сводку по складам
   */
  getWarehouseSummary: publicProcedure.query(async () => {
    const warehouses = await db.inventory.groupBy({
      by: ["warehouse"],
      _count: { id: true },
      _sum: { quantity: true },
    });

    return warehouses.map((w) => ({
      warehouse: w.warehouse,
      productCount: w._count.id,
      totalQuantity: w._sum.quantity ?? 0,
    }));
  }),
});