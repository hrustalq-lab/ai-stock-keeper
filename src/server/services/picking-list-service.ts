/**
 * PickingListService - управление листами сборки
 * Phase 5: Picking Optimization
 */

import { db } from "~/server/db";
import type { PickingList, PickingItem, Prisma } from "@prisma/client";
import { locationService } from "./location-service";
import {
  routeOptimizationService,
  type PickItem,
} from "./route-optimization";
import { oneCClient } from "./one-c-client";

// ============================================
// Типы
// ============================================

export interface OrderItem {
  sku: string;
  quantity: number;
  productName?: string;
}

export interface OrderInput {
  orderNumber: string;
  customerName?: string;
  items: OrderItem[];
}

export interface CreatePickingListInput {
  warehouse: string;
  orders: OrderInput[];
  pickingType?: "single" | "batch" | "wave";
  priority?: number;
  assignTo?: string;
}

export interface PickConfirmation {
  itemId: number;
  pickedQty: number;
  barcodeScan?: string;
  confirmedBy: string;
}

export interface PickIssue {
  itemId: number;
  issueType: "not_found" | "wrong_location" | "damaged" | "shortage";
  note?: string;
  reportedBy: string;
}

export interface PickingListWithDetails extends PickingList {
  items: PickingItem[];
}

// ============================================
// Сервис
// ============================================

class PickingListService {
  /**
   * Создать лист сборки из заказов
   */
  async createPickingList(input: CreatePickingListInput): Promise<PickingListWithDetails> {
    const listNumber = this.generateListNumber();

    // Собираем все позиции из всех заказов
    const allItems: Array<OrderItem & { orderNumber: string }> = [];
    for (const order of input.orders) {
      for (const item of order.items) {
        allItems.push({ ...item, orderNumber: order.orderNumber });
      }
    }

    // Группируем по SKU для batch picking (если несколько заказов)
    const groupedBySku = this.groupItemsBySku(allItems);

    // Получаем локации для каждого SKU
    const pickItems: PickItem[] = [];
    for (const [sku, data] of Object.entries(groupedBySku)) {
      const location = await locationService.getPrimaryLocation(sku, input.warehouse);

      if (location) {
        pickItems.push({
          sku,
          productName: data.productName ?? sku,
          quantity: data.totalQty,
          location: {
            code: location.locationCode,
            zone: location.zone,
            aisle: location.aisle,
            shelf: location.shelf,
            coordX: location.coordX,
            coordY: location.coordY,
          },
        });
      } else {
        // Товар без локации - добавляем с пустой локацией
        pickItems.push({
          sku,
          productName: data.productName ?? sku,
          quantity: data.totalQty,
          location: {
            code: "UNKNOWN",
            zone: "Z",
            aisle: 99,
            shelf: 99,
          },
        });
      }
    }

    // Оптимизируем маршрут
    const route = routeOptimizationService.optimize(pickItems, {
      algorithm: input.pickingType === "wave" ? "zone_based" : "nearest_neighbor",
    });

    // Создаём лист в транзакции
    const result = await db.$transaction(async (tx) => {
      // Создаём лист сборки
      const pickingList = await tx.pickingList.create({
        data: {
          listNumber,
          warehouse: input.warehouse,
          pickingType: input.pickingType ?? "single",
          priority: input.priority ?? 1,
          status: input.assignTo ? "assigned" : "created",
          assignedTo: input.assignTo,
          assignedAt: input.assignTo ? new Date() : null,
          estimatedMins: route.estimatedMins,
          totalDistance: route.totalDistance,
          optimizedRoute: route.items.map((i) => i.location.code) as Prisma.JsonArray,
        },
      });

      // Создаём позиции
      const items = await Promise.all(
        route.items.map((item, index) =>
          tx.pickingItem.create({
            data: {
              pickingListId: pickingList.id,
              sku: item.sku,
              productName: item.productName,
              requiredQty: item.quantity,
              locationCode: item.location.code,
              zone: item.location.zone,
              sequenceNum: index + 1,
              status: "pending",
            },
          })
        )
      );

      // Создаём связи с заказами
      await Promise.all(
        input.orders.map((order) =>
          tx.pickingOrder.create({
            data: {
              pickingListId: pickingList.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              status: "pending",
            },
          })
        )
      );

      return { ...pickingList, items };
    });

    return result;
  }

  /**
   * Получить лист сборки с оптимизированным маршрутом
   */
  async getPickingList(listId: number): Promise<PickingListWithDetails | null> {
    return db.pickingList.findUnique({
      where: { id: listId },
      include: {
        items: {
          orderBy: { sequenceNum: "asc" },
        },
      },
    });
  }

  /**
   * Получить лист по номеру
   */
  async getPickingListByNumber(listNumber: string): Promise<PickingListWithDetails | null> {
    return db.pickingList.findUnique({
      where: { listNumber },
      include: {
        items: {
          orderBy: { sequenceNum: "asc" },
        },
      },
    });
  }

  /**
   * Получить активные листы для работника
   */
  async getAssignedLists(workerId: string): Promise<PickingList[]> {
    return db.pickingList.findMany({
      where: {
        assignedTo: workerId,
        status: { in: ["assigned", "in_progress"] },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
  }

  /**
   * Получить листы по статусу
   */
  async getListsByStatus(
    warehouse: string,
    status?: string
  ): Promise<PickingList[]> {
    return db.pickingList.findMany({
      where: {
        warehouse,
        ...(status && { status }),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  /**
   * Назначить лист на работника
   */
  async assignToWorker(listId: number, workerId: string): Promise<PickingList> {
    return db.pickingList.update({
      where: { id: listId },
      data: {
        assignedTo: workerId,
        assignedAt: new Date(),
        status: "assigned",
      },
    });
  }

  /**
   * Начать сборку
   */
  async startPicking(listId: number, workerId: string): Promise<PickingList> {
    const list = await db.pickingList.findUnique({
      where: { id: listId },
    });

    if (!list) {
      throw new Error(`Picking list ${listId} not found`);
    }

    // Проверяем, что лист назначен на этого работника
    if (list.assignedTo && list.assignedTo !== workerId) {
      throw new Error(`Picking list is assigned to another worker`);
    }

    return db.pickingList.update({
      where: { id: listId },
      data: {
        status: "in_progress",
        startedAt: new Date(),
        assignedTo: workerId,
        assignedAt: list.assignedAt ?? new Date(),
      },
    });
  }

  /**
   * Подтвердить сборку позиции
   */
  async confirmPick(confirmation: PickConfirmation): Promise<PickingItem> {
    const item = await db.pickingItem.findUnique({
      where: { id: confirmation.itemId },
    });

    if (!item) {
      throw new Error(`Picking item ${confirmation.itemId} not found`);
    }

    // Определяем статус: picked или shortage
    const status =
      confirmation.pickedQty >= item.requiredQty ? "picked" : "shortage";

    return db.pickingItem.update({
      where: { id: confirmation.itemId },
      data: {
        pickedQty: confirmation.pickedQty,
        status,
        confirmedAt: new Date(),
        confirmedBy: confirmation.confirmedBy,
        barcodeScan: confirmation.barcodeScan,
        issueType: status === "shortage" ? "shortage" : null,
      },
    });
  }

  /**
   * Сообщить о проблеме
   */
  async reportIssue(issue: PickIssue): Promise<PickingItem> {
    return db.pickingItem.update({
      where: { id: issue.itemId },
      data: {
        status: issue.issueType === "shortage" ? "shortage" : "skipped",
        issueType: issue.issueType,
        issueNote: issue.note,
        confirmedAt: new Date(),
        confirmedBy: issue.reportedBy,
      },
    });
  }

  /**
   * Завершить сборку
   * При завершении создаёт отгрузочный документ в 1C
   */
  async completePicking(listId: number, workerId: string): Promise<PickingList> {
    const list = await db.pickingList.findUnique({
      where: { id: listId },
      include: { items: true, orders: true },
    });

    if (!list) {
      throw new Error(`Picking list ${listId} not found`);
    }

    // Рассчитываем фактическое время
    const startedAt = list.startedAt ?? list.assignedAt ?? list.createdAt;
    const actualMins = Math.round(
      (Date.now() - startedAt.getTime()) / 1000 / 60
    );

    // Создаём отгрузочные документы в 1C для каждого заказа
    const autoCreate = process.env.ONE_C_AUTO_CREATE_SHIPMENT !== "false";
    
    if (autoCreate && list.orders.length > 0) {
      for (const order of list.orders) {
        try {
          // Собираем позиции для этого заказа
          const shipmentItems = list.items
            .filter((i) => i.status === "picked" || i.status === "shortage")
            .map((i) => ({
              sku: i.sku,
              quantity: i.pickedQty,
            }));

          // Создаём отгрузочный документ
          const shipmentResult = await oneCClient.createShipmentFromPicking({
            orderNumber: order.orderNumber,
            pickingListId: listId,
            items: shipmentItems,
            warehouse: list.warehouse,
            shippedAt: new Date(),
          });

          // Обновляем запись заказа с ID документа
          await db.pickingOrder.update({
            where: { id: order.id },
            data: { shipmentDocId: shipmentResult.documentId },
          });

          // Обновляем статус заказа в 1C
          await oneCClient.updateOrderStatus(order.orderNumber, "shipped");
        } catch (error) {
          // Логируем ошибку, но не прерываем завершение сборки
          console.error(
            `[Picking] Ошибка создания отгрузки для заказа ${order.orderNumber}:`,
            error
          );
        }
      }
    }

    // Обновляем статус листа
    const updatedList = await db.pickingList.update({
      where: { id: listId },
      data: {
        status: "completed",
        completedAt: new Date(),
        actualMins,
      },
    });

    // Обновляем статус заказов
    await db.pickingOrder.updateMany({
      where: { pickingListId: listId },
      data: { status: "completed" },
    });

    // Записываем в историю для аналитики
    const itemCount = list.items.length;
    const totalQty = list.items.reduce((sum, i) => sum + i.pickedQty, 0);
    const errorCount = list.items.filter(
      (i) => i.status === "skipped" || i.issueType
    ).length;
    const shortageCount = list.items.filter(
      (i) => i.status === "shortage"
    ).length;

    const picksPerHour = actualMins > 0 ? (itemCount / actualMins) * 60 : 0;
    const accuracy =
      itemCount > 0 ? (itemCount - errorCount - shortageCount) / itemCount : 1;
    const efficiency =
      list.estimatedMins && list.estimatedMins > 0
        ? actualMins / list.estimatedMins
        : 1;

    await db.pickingHistory.create({
      data: {
        pickingListId: listId,
        workerId,
        warehouse: list.warehouse,
        itemCount,
        totalQty,
        pickingMins: actualMins,
        errorCount,
        shortageCount,
        picksPerHour,
        accuracy,
        estimatedMins: list.estimatedMins ?? actualMins,
        efficiency,
      },
    });

    return updatedList;
  }

  /**
   * Отменить лист сборки
   */
  async cancelPicking(listId: number): Promise<PickingList> {
    return db.pickingList.update({
      where: { id: listId },
      data: { status: "cancelled" },
    });
  }

  /**
   * Batch Picking: объединить несколько заказов в один лист
   * Товары группируются по SKU для одного прохода по складу
   */
  async createBatchPicking(
    warehouse: string,
    orders: OrderInput[]
  ): Promise<PickingListWithDetails> {
    return this.createPickingList({
      warehouse,
      orders,
      pickingType: "batch",
    });
  }

  /**
   * Wave Picking: разделить большой лист по зонам
   * Каждый работник собирает свою зону
   */
  async createWavePicking(
    warehouse: string,
    orders: OrderInput[],
    zones: string[]
  ): Promise<PickingListWithDetails[]> {
    // Собираем все позиции
    const allItems: Array<OrderItem & { orderNumber: string }> = [];
    for (const order of orders) {
      for (const item of order.items) {
        allItems.push({ ...item, orderNumber: order.orderNumber });
      }
    }

    // Группируем по SKU и получаем локации
    const itemsByZone: Record<string, Array<{ sku: string; productName: string; qty: number }>> = {};

    for (const item of allItems) {
      const location = await locationService.getPrimaryLocation(item.sku, warehouse);
      const zone = location?.zone ?? "Z";

      itemsByZone[zone] ??= [];
      
      const existing = itemsByZone[zone].find((i) => i.sku === item.sku);
      if (existing) {
        existing.qty += item.quantity;
      } else {
        itemsByZone[zone].push({
          sku: item.sku,
          productName: item.productName ?? item.sku,
          qty: item.quantity,
        });
      }
    }

    // Создаём лист для каждой указанной зоны
    const results: PickingListWithDetails[] = [];

    for (const zone of zones) {
      const zoneItems = itemsByZone[zone];
      if (!zoneItems || zoneItems.length === 0) continue;

      const orderInput: OrderInput = {
        orderNumber: `WAVE-${zone}-${Date.now()}`,
        items: zoneItems.map((i) => ({
          sku: i.sku,
          quantity: i.qty,
          productName: i.productName,
        })),
      };

      const list = await this.createPickingList({
        warehouse,
        orders: [orderInput],
        pickingType: "wave",
      });

      results.push(list);
    }

    return results;
  }

  /**
   * Получить следующую позицию для сборки
   */
  async getNextItem(listId: number): Promise<PickingItem | null> {
    return db.pickingItem.findFirst({
      where: {
        pickingListId: listId,
        status: "pending",
      },
      orderBy: { sequenceNum: "asc" },
    });
  }

  /**
   * Получить прогресс сборки
   */
  async getProgress(listId: number): Promise<{
    total: number;
    completed: number;
    remaining: number;
    percentage: number;
  }> {
    const items = await db.pickingItem.findMany({
      where: { pickingListId: listId },
      select: { status: true },
    });

    const total = items.length;
    const completed = items.filter(
      (i) => i.status === "picked" || i.status === "skipped" || i.status === "shortage"
    ).length;
    const remaining = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, remaining, percentage };
  }

  /**
   * Генерировать номер листа
   * Формат: PL-YYYY-MM-DD-NNN
   */
  generateListNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `PL-${date}-${random}`;
  }

  /**
   * Группировка позиций по SKU
   */
  private groupItemsBySku(
    items: Array<OrderItem & { orderNumber: string }>
  ): Record<string, { totalQty: number; productName?: string }> {
    return items.reduce(
      (acc, item) => {
        acc[item.sku] ??= { totalQty: 0, productName: item.productName };
        acc[item.sku]!.totalQty += item.quantity;
        return acc;
      },
      {} as Record<string, { totalQty: number; productName?: string }>
    );
  }
}

// Singleton экземпляр
export const pickingListService = new PickingListService();
