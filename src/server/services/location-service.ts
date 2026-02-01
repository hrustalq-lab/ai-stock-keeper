/**
 * LocationService - управление локациями товаров на складе
 * Phase 5: Picking Optimization
 */

import { db } from "~/server/db";
import type { WarehouseLocation, InventoryLocation } from "@prisma/client";

// ============================================
// Типы
// ============================================

export interface LocationInput {
  warehouse: string;
  locationCode: string;  // "A-01-02"
  zone: string;          // "A"
  aisle: number;         // 1
  shelf: number;         // 2
  position?: number;     // 1
  coordX?: number;
  coordY?: number;
  maxCapacity?: number;
  locationType?: "shelf" | "pallet" | "bin" | "floor";
}

export interface LocationWithInventory extends WarehouseLocation {
  inventoryLocations: InventoryLocation[];
}

export interface SkuLocationInfo {
  sku: string;
  locationId: number;
  locationCode: string;
  zone: string;
  aisle: number;
  shelf: number;
  quantity: number;
  isPrimary: boolean;
  coordX: number | null;
  coordY: number | null;
}

// ============================================
// Сервис
// ============================================

class LocationService {
  /**
   * Создать локацию на складе
   */
  async createLocation(input: LocationInput): Promise<WarehouseLocation> {
    return db.warehouseLocation.create({
      data: {
        warehouse: input.warehouse,
        locationCode: input.locationCode,
        zone: input.zone,
        aisle: input.aisle,
        shelf: input.shelf,
        position: input.position ?? 1,
        coordX: input.coordX,
        coordY: input.coordY,
        maxCapacity: input.maxCapacity,
        locationType: input.locationType ?? "shelf",
        isActive: true,
      },
    });
  }

  /**
   * Создать несколько локаций (bulk insert)
   */
  async createLocations(inputs: LocationInput[]): Promise<number> {
    const result = await db.warehouseLocation.createMany({
      data: inputs.map((input) => ({
        warehouse: input.warehouse,
        locationCode: input.locationCode,
        zone: input.zone,
        aisle: input.aisle,
        shelf: input.shelf,
        position: input.position ?? 1,
        coordX: input.coordX,
        coordY: input.coordY,
        maxCapacity: input.maxCapacity,
        locationType: input.locationType ?? "shelf",
        isActive: true,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  /**
   * Получить все локации склада
   */
  async getLocations(warehouse: string): Promise<WarehouseLocation[]> {
    return db.warehouseLocation.findMany({
      where: { warehouse, isActive: true },
      orderBy: [{ zone: "asc" }, { aisle: "asc" }, { shelf: "asc" }],
    });
  }

  /**
   * Получить локацию по коду
   */
  async getLocationByCode(
    warehouse: string,
    locationCode: string
  ): Promise<WarehouseLocation | null> {
    return db.warehouseLocation.findUnique({
      where: { warehouse_locationCode: { warehouse, locationCode } },
    });
  }

  /**
   * Получить локации для товара (SKU)
   */
  async getLocationsForSku(
    sku: string,
    warehouse: string
  ): Promise<SkuLocationInfo[]> {
    const inventoryLocations = await db.inventoryLocation.findMany({
      where: {
        sku,
        location: { warehouse, isActive: true },
      },
      include: { location: true },
      orderBy: { isPrimary: "desc" },
    });

    return inventoryLocations.map((il) => ({
      sku: il.sku,
      locationId: il.locationId,
      locationCode: il.location.locationCode,
      zone: il.location.zone,
      aisle: il.location.aisle,
      shelf: il.location.shelf,
      quantity: il.quantity,
      isPrimary: il.isPrimary,
      coordX: il.location.coordX,
      coordY: il.location.coordY,
    }));
  }

  /**
   * Получить основную локацию товара
   */
  async getPrimaryLocation(
    sku: string,
    warehouse: string
  ): Promise<SkuLocationInfo | null> {
    const locations = await this.getLocationsForSku(sku, warehouse);
    return locations.find((l) => l.isPrimary) ?? locations[0] ?? null;
  }

  /**
   * Назначить товар на локацию
   */
  async assignSkuToLocation(
    sku: string,
    locationId: number,
    quantity: number,
    isPrimary = true
  ): Promise<InventoryLocation> {
    // Если это основная локация, сначала снимаем флаг с других
    if (isPrimary) {
      const location = await db.warehouseLocation.findUnique({
        where: { id: locationId },
      });

      if (location) {
        await db.inventoryLocation.updateMany({
          where: {
            sku,
            location: { warehouse: location.warehouse },
            isPrimary: true,
          },
          data: { isPrimary: false },
        });
      }
    }

    // Upsert: создать или обновить привязку
    return db.inventoryLocation.upsert({
      where: { sku_locationId: { sku, locationId } },
      create: { sku, locationId, quantity, isPrimary },
      update: { quantity, isPrimary },
    });
  }

  /**
   * Обновить количество на локации
   */
  async updateQuantityOnLocation(
    sku: string,
    locationId: number,
    quantityDelta: number
  ): Promise<InventoryLocation | null> {
    const existing = await db.inventoryLocation.findUnique({
      where: { sku_locationId: { sku, locationId } },
    });

    if (!existing) return null;

    const newQuantity = Math.max(0, existing.quantity + quantityDelta);

    return db.inventoryLocation.update({
      where: { sku_locationId: { sku, locationId } },
      data: { quantity: newQuantity },
    });
  }

  /**
   * Удалить привязку товара к локации
   */
  async removeSkuFromLocation(
    sku: string,
    locationId: number
  ): Promise<boolean> {
    try {
      await db.inventoryLocation.delete({
        where: { sku_locationId: { sku, locationId } },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Рассчитать расстояние между двумя локациями
   * Использует Euclidean если есть координаты, иначе Manhattan
   */
  calculateDistance(
    from: { zone: string; aisle: number; shelf: number; coordX?: number | null; coordY?: number | null },
    to: { zone: string; aisle: number; shelf: number; coordX?: number | null; coordY?: number | null }
  ): number {
    // Если есть координаты - Euclidean distance
    if (
      from.coordX != null &&
      from.coordY != null &&
      to.coordX != null &&
      to.coordY != null
    ) {
      const dx = to.coordX - from.coordX;
      const dy = to.coordY - from.coordY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    // Manhattan distance на основе зон/рядов/полок
    // Зона: ~10м между зонами
    const zoneDist = Math.abs(from.zone.charCodeAt(0) - to.zone.charCodeAt(0)) * 10;
    // Ряд: ~3м между рядами
    const aisleDist = Math.abs(from.aisle - to.aisle) * 3;
    // Полка: ~0.5м между полками
    const shelfDist = Math.abs(from.shelf - to.shelf) * 0.5;

    return zoneDist + aisleDist + shelfDist;
  }

  /**
   * Получить все зоны склада
   */
  async getZones(warehouse: string): Promise<string[]> {
    const locations = await db.warehouseLocation.findMany({
      where: { warehouse, isActive: true },
      select: { zone: true },
      distinct: ["zone"],
      orderBy: { zone: "asc" },
    });
    return locations.map((l) => l.zone);
  }

  /**
   * Деактивировать локацию
   */
  async deactivateLocation(
    warehouse: string,
    locationCode: string
  ): Promise<WarehouseLocation | null> {
    try {
      return await db.warehouseLocation.update({
        where: { warehouse_locationCode: { warehouse, locationCode } },
        data: { isActive: false },
      });
    } catch {
      return null;
    }
  }

  /**
   * Парсинг кода локации в компоненты
   * "A-01-02" → { zone: "A", aisle: 1, shelf: 2 }
   */
  parseLocationCode(locationCode: string): {
    zone: string;
    aisle: number;
    shelf: number;
  } | null {
    const match = /^([A-Z])-(\d+)-(\d+)$/.exec(locationCode);
    if (!match) return null;

    return {
      zone: match[1] ?? "",
      aisle: parseInt(match[2] ?? "0", 10),
      shelf: parseInt(match[3] ?? "0", 10),
    };
  }

  /**
   * Генерация кода локации из компонентов
   */
  generateLocationCode(zone: string, aisle: number, shelf: number): string {
    return `${zone}-${String(aisle).padStart(2, "0")}-${String(shelf).padStart(2, "0")}`;
  }

  /**
   * Генерация локаций для склада (utility)
   * Создаёт сетку локаций: zones × aisles × shelves
   */
  async generateWarehouseLocations(
    warehouse: string,
    zones: string[],
    aislesPerZone: number,
    shelvesPerAisle: number
  ): Promise<number> {
    const inputs: LocationInput[] = [];

    for (const zone of zones) {
      for (let aisle = 1; aisle <= aislesPerZone; aisle++) {
        for (let shelf = 1; shelf <= shelvesPerAisle; shelf++) {
          inputs.push({
            warehouse,
            locationCode: this.generateLocationCode(zone, aisle, shelf),
            zone,
            aisle,
            shelf,
          });
        }
      }
    }

    return this.createLocations(inputs);
  }
}

// Singleton экземпляр
export const locationService = new LocationService();
