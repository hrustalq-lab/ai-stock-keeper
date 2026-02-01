/**
 * Picking Router - управление листами сборки
 * Phase 5: Picking Optimization
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { pickingListService } from "~/server/services/picking-list-service";
import { pickingAnalyticsService } from "~/server/services/picking-analytics";
import { oneCClient } from "~/server/services/one-c-client";

// Схема валидации для позиции заказа
const orderItemSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().positive(),
  productName: z.string().optional(),
});

// Схема валидации для заказа
const orderSchema = z.object({
  orderNumber: z.string(),
  customerName: z.string().optional(),
  items: z.array(orderItemSchema),
});

export const pickingRouter = createTRPCRouter({
  /**
   * Создать лист сборки из заказов
   */
  create: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        orders: z.array(orderSchema).min(1),
        pickingType: z.enum(["single", "batch", "wave"]).optional(),
        priority: z.number().int().min(0).max(3).optional(),
        assignTo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return pickingListService.createPickingList(input);
    }),

  /**
   * Получить лист по ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      return pickingListService.getPickingList(input.id);
    }),

  /**
   * Получить лист по номеру
   */
  getByNumber: publicProcedure
    .input(z.object({ listNumber: z.string() }))
    .query(async ({ input }) => {
      return pickingListService.getPickingListByNumber(input.listNumber);
    }),

  /**
   * Получить листы по статусу
   */
  getByStatus: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        status: z
          .enum(["created", "assigned", "in_progress", "completed", "cancelled"])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      return pickingListService.getListsByStatus(input.warehouse, input.status);
    }),

  /**
   * Получить листы работника
   */
  getAssigned: publicProcedure
    .input(z.object({ workerId: z.string() }))
    .query(async ({ input }) => {
      return pickingListService.getAssignedLists(input.workerId);
    }),

  /**
   * Назначить на работника
   */
  assign: publicProcedure
    .input(
      z.object({
        listId: z.number().int().positive(),
        workerId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return pickingListService.assignToWorker(input.listId, input.workerId);
    }),

  /**
   * Начать сборку
   */
  start: publicProcedure
    .input(
      z.object({
        listId: z.number().int().positive(),
        workerId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return pickingListService.startPicking(input.listId, input.workerId);
    }),

  /**
   * Подтвердить сборку позиции
   */
  confirmItem: publicProcedure
    .input(
      z.object({
        itemId: z.number().int().positive(),
        pickedQty: z.number().int().min(0),
        barcodeScan: z.string().optional(),
        confirmedBy: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return pickingListService.confirmPick(input);
    }),

  /**
   * Сообщить о проблеме
   */
  reportIssue: publicProcedure
    .input(
      z.object({
        itemId: z.number().int().positive(),
        issueType: z.enum(["not_found", "wrong_location", "damaged", "shortage"]),
        note: z.string().optional(),
        reportedBy: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return pickingListService.reportIssue(input);
    }),

  /**
   * Завершить сборку
   */
  complete: publicProcedure
    .input(
      z.object({
        listId: z.number().int().positive(),
        workerId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return pickingListService.completePicking(input.listId, input.workerId);
    }),

  /**
   * Отменить лист
   */
  cancel: publicProcedure
    .input(z.object({ listId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return pickingListService.cancelPicking(input.listId);
    }),

  /**
   * Получить следующую позицию
   */
  getNextItem: publicProcedure
    .input(z.object({ listId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return pickingListService.getNextItem(input.listId);
    }),

  /**
   * Получить прогресс сборки
   */
  getProgress: publicProcedure
    .input(z.object({ listId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return pickingListService.getProgress(input.listId);
    }),

  /**
   * Создать batch picking (несколько заказов)
   */
  createBatch: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        orders: z.array(orderSchema).min(2),
      })
    )
    .mutation(async ({ input }) => {
      return pickingListService.createBatchPicking(input.warehouse, input.orders);
    }),

  /**
   * Создать wave picking (по зонам)
   */
  createWave: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        orders: z.array(orderSchema).min(1),
        zones: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input }) => {
      return pickingListService.createWavePicking(
        input.warehouse,
        input.orders,
        input.zones
      );
    }),

  // ============================================
  // 1C Интеграция
  // ============================================

  /**
   * Получить заказы из 1C, готовые к сборке
   */
  getOrdersFrom1C: publicProcedure
    .input(z.object({ warehouse: z.string() }))
    .query(async ({ input }) => {
      return oneCClient.getOrdersForPicking(input.warehouse);
    }),

  /**
   * Создать лист сборки из заказа 1C
   */
  createFromOrder: publicProcedure
    .input(
      z.object({
        orderNumber: z.string(),
        warehouse: z.string(),
        priority: z.number().int().min(0).max(3).optional(),
        assignTo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Получаем детали заказа из 1C
      const order = await oneCClient.getOrderDetails(input.orderNumber);

      if (!order) {
        throw new Error(`Заказ ${input.orderNumber} не найден в 1C`);
      }

      // Обновляем статус заказа в 1C
      await oneCClient.updateOrderStatus(input.orderNumber, "in_picking");

      // Создаём лист сборки
      return pickingListService.createPickingList({
        warehouse: input.warehouse,
        orders: [
          {
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            items: order.items.map((i) => ({
              sku: i.sku,
              quantity: i.quantity,
              productName: i.productName,
            })),
          },
        ],
        pickingType: "single",
        priority: input.priority ?? order.priority ?? 1,
        assignTo: input.assignTo,
      });
    }),

  /**
   * Создать batch picking из нескольких заказов 1C
   */
  createBatchFrom1C: publicProcedure
    .input(
      z.object({
        orderNumbers: z.array(z.string()).min(2),
        warehouse: z.string(),
        priority: z.number().int().min(0).max(3).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Получаем детали всех заказов
      const orders = await Promise.all(
        input.orderNumbers.map((num) => oneCClient.getOrderDetails(num))
      );

      const validOrders = orders.filter((o) => o !== null);

      if (validOrders.length < 2) {
        throw new Error("Нужно минимум 2 валидных заказа для batch picking");
      }

      // Обновляем статусы заказов в 1C
      await Promise.all(
        validOrders.map((o) =>
          oneCClient.updateOrderStatus(o.orderNumber, "in_picking")
        )
      );

      // Создаём batch лист сборки
      return pickingListService.createPickingList({
        warehouse: input.warehouse,
        orders: validOrders.map((o) => ({
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          items: o.items.map((i) => ({
            sku: i.sku,
            quantity: i.quantity,
            productName: i.productName,
          })),
        })),
        pickingType: "batch",
        priority: input.priority ?? 1,
      });
    }),

  // ============================================
  // Аналитика
  // ============================================

  /**
   * Получить статистику сборки
   */
  getStats: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        period: z.enum(["today", "week", "month"]).default("today"),
      })
    )
    .query(async ({ input }) => {
      return pickingAnalyticsService.getStats(input.warehouse, input.period);
    }),

  /**
   * Получить производительность работников
   */
  getWorkerPerformance: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        period: z.enum(["today", "week", "month"]).default("week"),
      })
    )
    .query(async ({ input }) => {
      return pickingAnalyticsService.getWorkerPerformance(
        input.warehouse,
        input.period
      );
    }),

  /**
   * Получить топ ошибок
   */
  getTopIssues: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        limit: z.number().int().positive().default(10),
      })
    )
    .query(async ({ input }) => {
      return pickingAnalyticsService.getTopIssues(input.warehouse, input.limit);
    }),

  /**
   * Получить тренд производительности
   */
  getPerformanceTrend: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        days: z.number().int().positive().default(7),
      })
    )
    .query(async ({ input }) => {
      return pickingAnalyticsService.getPerformanceTrend(
        input.warehouse,
        input.days
      );
    }),
});
