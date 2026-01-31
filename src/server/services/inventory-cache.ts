import { db, type Inventory } from "~/server/db";
import { redis } from "~/server/lib/redis";

/**
 * Данные для создания/обновления инвентаря
 */
export interface InventoryData {
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  reorderPoint?: number;
  supplier?: string;
}

/**
 * Сервис кеширования инвентаря
 * Двухуровневый кеш: Redis (быстрый) + PostgreSQL (персистентный)
 */
export class InventoryCache {
  // TTL кеша Redis в секундах (5 минут)
  private readonly CACHE_TTL = 5 * 60;
  
  // Префикс ключей в Redis
  private readonly CACHE_PREFIX = "inventory:";

  /**
   * Получить ключ кеша для товара
   */
  private getCacheKey(sku: string, warehouse?: string): string {
    return warehouse 
      ? `${this.CACHE_PREFIX}${sku}:${warehouse}`
      : `${this.CACHE_PREFIX}${sku}`;
  }

  /**
   * Получить товар по SKU
   * Сначала проверяет Redis, затем PostgreSQL
   */
  async getGood(sku: string, warehouse?: string): Promise<Inventory | null> {
    const cacheKey = this.getCacheKey(sku, warehouse);

    // Пробуем Redis
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`[Cache] HIT: ${cacheKey}`);
        return JSON.parse(cached) as Inventory;
      }
    } catch (error) {
      console.warn("[Cache] Redis error:", error);
    }

    console.log(`[Cache] MISS: ${cacheKey}`);

    // Fallback на PostgreSQL
    const goods = await db.inventory.findFirst({
      where: warehouse 
        ? { sku, warehouse }
        : { sku },
    });

    // Кешируем результат
    if (goods) {
      try {
        await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(goods));
      } catch (error) {
        console.warn("[Cache] Redis setex error:", error);
      }
    }

    return goods;
  }

  /**
   * Получить все товары (опционально по складу)
   */
  async getAllGoods(warehouse?: string): Promise<Inventory[]> {
    return db.inventory.findMany({
      where: warehouse ? { warehouse } : {},
      orderBy: { sku: "asc" },
    });
  }

  /**
   * Получить товары с низким остатком
   */
  async getLowStockGoods(warehouse?: string): Promise<Inventory[]> {
    return db.inventory.findMany({
      where: {
        ...(warehouse ? { warehouse } : {}),
        quantity: {
          lte: db.inventory.fields.reorderPoint,
        },
      },
      orderBy: { quantity: "asc" },
    });
  }

  /**
   * Обновить кеш товара
   */
  async updateCache(data: InventoryData): Promise<Inventory> {
    // Upsert в PostgreSQL
    const goods = await db.inventory.upsert({
      where: {
        sku_warehouse: {
          sku: data.sku,
          warehouse: data.warehouse,
        },
      },
      update: {
        name: data.name,
        quantity: data.quantity,
        reorderPoint: data.reorderPoint ?? 10,
        supplier: data.supplier,
        syncedAt: new Date(),
      },
      create: {
        sku: data.sku,
        name: data.name,
        quantity: data.quantity,
        warehouse: data.warehouse,
        reorderPoint: data.reorderPoint ?? 10,
        supplier: data.supplier,
      },
    });

    // Инвалидируем Redis кеш
    const cacheKey = this.getCacheKey(data.sku, data.warehouse);
    try {
      await redis.del(cacheKey);
      
      // Публикуем событие для real-time подписчиков
      await redis.publish("inventory:updated", JSON.stringify(goods));
    } catch (error) {
      console.warn("[Cache] Redis invalidation error:", error);
    }

    return goods;
  }

  /**
   * Массовая синхронизация из 1C
   */
  async syncFromOneC(items: InventoryData[]): Promise<number> {
    let synced = 0;

    for (const item of items) {
      try {
        await this.updateCache(item);
        synced++;
      } catch (error) {
        console.error(`[Cache] Sync error for SKU ${item.sku}:`, error);
      }
    }

    console.log(`[Cache] Synced ${synced}/${items.length} items from 1C`);
    return synced;
  }

  /**
   * Инвалидировать кеш для SKU
   */
  async invalidate(sku: string, warehouse?: string): Promise<void> {
    const cacheKey = this.getCacheKey(sku, warehouse);
    try {
      await redis.del(cacheKey);
      console.log(`[Cache] Invalidated: ${cacheKey}`);
    } catch (error) {
      console.warn("[Cache] Invalidation error:", error);
    }
  }

  /**
   * Очистить весь кеш инвентаря
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[Cache] Cleared ${keys.length} keys`);
      }
    } catch (error) {
      console.warn("[Cache] Clear all error:", error);
    }
  }
}

// Синглтон для использования во всем приложении
export const inventoryCache = new InventoryCache();
