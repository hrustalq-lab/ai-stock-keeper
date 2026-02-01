/**
 * Location Router - управление локациями склада
 * Phase 5: Picking Optimization
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { locationService } from "~/server/services/location-service";

export const locationRouter = createTRPCRouter({
  /**
   * Получить все локации склада
   */
  getAll: publicProcedure
    .input(z.object({ warehouse: z.string() }))
    .query(async ({ input }) => {
      return locationService.getLocations(input.warehouse);
    }),

  /**
   * Получить локацию по коду
   */
  getByCode: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        locationCode: z.string(),
      })
    )
    .query(async ({ input }) => {
      return locationService.getLocationByCode(input.warehouse, input.locationCode);
    }),

  /**
   * Создать локацию
   */
  create: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        locationCode: z.string(),
        zone: z.string(),
        aisle: z.number().int().positive(),
        shelf: z.number().int().positive(),
        position: z.number().int().positive().optional(),
        coordX: z.number().optional(),
        coordY: z.number().optional(),
        maxCapacity: z.number().int().positive().optional(),
        locationType: z.enum(["shelf", "pallet", "bin", "floor"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return locationService.createLocation(input);
    }),

  /**
   * Создать несколько локаций (bulk)
   */
  createBulk: publicProcedure
    .input(
      z.object({
        locations: z.array(
          z.object({
            warehouse: z.string(),
            locationCode: z.string(),
            zone: z.string(),
            aisle: z.number().int().positive(),
            shelf: z.number().int().positive(),
            position: z.number().int().positive().optional(),
            coordX: z.number().optional(),
            coordY: z.number().optional(),
            maxCapacity: z.number().int().positive().optional(),
            locationType: z.enum(["shelf", "pallet", "bin", "floor"]).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const count = await locationService.createLocations(input.locations);
      return { created: count };
    }),

  /**
   * Генерировать сетку локаций для склада
   */
  generateGrid: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        zones: z.array(z.string()),      // ["A", "B", "C"]
        aislesPerZone: z.number().int().positive().max(99),
        shelvesPerAisle: z.number().int().positive().max(99),
      })
    )
    .mutation(async ({ input }) => {
      const count = await locationService.generateWarehouseLocations(
        input.warehouse,
        input.zones,
        input.aislesPerZone,
        input.shelvesPerAisle
      );
      return { created: count };
    }),

  /**
   * Получить все зоны склада
   */
  getZones: publicProcedure
    .input(z.object({ warehouse: z.string() }))
    .query(async ({ input }) => {
      return locationService.getZones(input.warehouse);
    }),

  /**
   * Получить локации для SKU
   */
  getForSku: publicProcedure
    .input(
      z.object({
        sku: z.string(),
        warehouse: z.string(),
      })
    )
    .query(async ({ input }) => {
      return locationService.getLocationsForSku(input.sku, input.warehouse);
    }),

  /**
   * Назначить SKU на локацию
   */
  assignSku: publicProcedure
    .input(
      z.object({
        sku: z.string(),
        locationId: z.number().int().positive(),
        quantity: z.number().int().min(0),
        isPrimary: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return locationService.assignSkuToLocation(
        input.sku,
        input.locationId,
        input.quantity,
        input.isPrimary
      );
    }),

  /**
   * Обновить количество на локации
   */
  updateQuantity: publicProcedure
    .input(
      z.object({
        sku: z.string(),
        locationId: z.number().int().positive(),
        quantityDelta: z.number().int(), // Может быть отрицательным
      })
    )
    .mutation(async ({ input }) => {
      return locationService.updateQuantityOnLocation(
        input.sku,
        input.locationId,
        input.quantityDelta
      );
    }),

  /**
   * Удалить привязку SKU к локации
   */
  removeSku: publicProcedure
    .input(
      z.object({
        sku: z.string(),
        locationId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const success = await locationService.removeSkuFromLocation(
        input.sku,
        input.locationId
      );
      return { success };
    }),

  /**
   * Деактивировать локацию
   */
  deactivate: publicProcedure
    .input(
      z.object({
        warehouse: z.string(),
        locationCode: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const location = await locationService.deactivateLocation(
        input.warehouse,
        input.locationCode
      );
      return { success: location !== null };
    }),
});
