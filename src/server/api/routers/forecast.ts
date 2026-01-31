/**
 * Forecast Router - API для прогнозирования
 * Phase 4: Predictive Analytics
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { forecastService, type ForecastModel } from "~/server/services/forecast-service";
import { reorderService, type UrgencyLevel } from "~/server/services/reorder-service";
import { consumptionService } from "~/server/services/consumption-service";

export const forecastRouter = createTRPCRouter({
  /**
   * Прогноз для одного товара
   */
  getForProduct: publicProcedure
    .input(
      z.object({
        sku: z.string(),
        warehouse: z.string(),
        days: z.number().min(7).max(90).default(14),
        model: z.enum(["sma", "ema", "prophet"]).default("sma"),
        historyDays: z.number().min(7).max(180).default(60),
      })
    )
    .query(async ({ input }) => {
      const forecast = await forecastService.forecast({
        sku: input.sku,
        warehouse: input.warehouse,
        forecastDays: input.days,
        historyDays: input.historyDays,
        model: input.model as ForecastModel,
      });
      return forecast;
    }),

  /**
   * Прогноз для нескольких товаров (batch)
   */
  getBatch: publicProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            sku: z.string(),
            warehouse: z.string(),
          })
        ),
        days: z.number().min(7).max(90).default(14),
        model: z.enum(["sma", "ema", "prophet"]).default("sma"),
      })
    )
    .query(async ({ input }) => {
      const forecasts = await forecastService.forecastBatch(input.items, {
        forecastDays: input.days,
        model: input.model as ForecastModel,
      });
      return forecasts;
    }),

  /**
   * Все рекомендации по дозаказу
   */
  getRecommendations: publicProcedure
    .input(
      z.object({
        warehouse: z.string().optional(),
        urgency: z.enum(["critical", "warning", "normal"]).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return reorderService.getRecommendations({
        warehouse: input.warehouse,
        urgency: input.urgency as UrgencyLevel | undefined,
        limit: input.limit,
      });
    }),

  /**
   * Сводка рекомендаций по срочности
   */
  getRecommendationsSummary: publicProcedure
    .input(
      z.object({
        warehouse: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return reorderService.getSummary(input.warehouse);
    }),

  /**
   * Рекомендация для конкретного товара
   */
  getRecommendationForProduct: publicProcedure
    .input(
      z.object({
        sku: z.string(),
        warehouse: z.string(),
        leadTimeDays: z.number().optional(),
        serviceLevel: z.number().min(0.9).max(0.99).optional(),
      })
    )
    .query(async ({ input }) => {
      return reorderService.getRecommendationForProduct(input.sku, input.warehouse, {
        leadTimeDays: input.leadTimeDays,
        serviceLevel: input.serviceLevel,
      });
    }),

  /**
   * Подтвердить рекомендацию
   */
  approveRecommendation: publicProcedure
    .input(
      z.object({
        id: z.number(),
        orderQty: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await reorderService.approve(input.id, input.orderQty);
      return { success: true };
    }),

  /**
   * Тренд потребления товара
   */
  getConsumptionTrend: publicProcedure
    .input(
      z.object({
        sku: z.string(),
        warehouse: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      return consumptionService.getTrend(input);
    }),

  /**
   * Топ товаров по потреблению
   */
  getTopConsumed: publicProcedure
    .input(
      z.object({
        warehouse: z.string().optional(),
        days: z.number().default(30),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      return consumptionService.getTopConsumed(input.warehouse, input.days, input.limit);
    }),

  /**
   * Точность прогнозов (MAPE)
   */
  getAccuracy: publicProcedure
    .input(
      z.object({
        model: z.enum(["sma", "ema", "prophet"]).optional(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      return forecastService.getAccuracy({
        model: input.model as ForecastModel | undefined,
        days: input.days,
      });
    }),

  /**
   * История потребления для графика
   */
  getConsumptionHistory: publicProcedure
    .input(
      z.object({
        sku: z.string(),
        warehouse: z.string(),
        days: z.number().default(60),
      })
    )
    .query(async ({ input }) => {
      return consumptionService.getHistory(input.sku, input.warehouse, input.days);
    }),

  /**
   * Данные для графика прогноза (история + прогноз)
   * @param warehouse - конкретный склад или undefined/"all" для агрегации по всем складам
   */
  getChartData: publicProcedure
    .input(
      z.object({
        sku: z.string(),
        warehouse: z.string().optional(), // undefined = все склады
        historyDays: z.number().default(30),
        forecastDays: z.number().default(14),
        model: z.enum(["sma", "ema", "prophet"]).default("sma"),
      })
    )
    .query(async ({ input }) => {
      // warehouse: undefined или "all" = агрегация по всем складам
      const warehouse = input.warehouse ?? "all";

      // 1. Получаем историю
      const history = await consumptionService.getHistory(
        input.sku,
        warehouse,
        input.historyDays
      );

      // 2. Получаем прогноз
      const forecast = await forecastService.forecast({
        sku: input.sku,
        warehouse,
        historyDays: input.historyDays,
        forecastDays: input.forecastDays,
        model: input.model as ForecastModel,
      });

      // 3. Получаем статистику потребления для расчёта страхового запаса
      const trend = await consumptionService.getTrend({
        sku: input.sku,
        warehouse,
        days: input.historyDays,
      });

      // 4. Рассчитываем корректную точку заказа: ROP = (avg_daily × lead_time) + safety_stock
      const safetyStock = reorderService.calculateSafetyStock(
        trend.stdDevConsumption,
        reorderService.defaultLeadTime,
        reorderService.defaultServiceLevel
      );
      const reorderPoint = reorderService.calculateReorderPoint(
        forecast.avgDailyConsumption,
        reorderService.defaultLeadTime,
        safetyStock
      );

      // 5. Формируем данные для графика
      const chartData = [
        // Историческая часть
        ...history.map((h) => ({
          date: h.date.toISOString().split("T")[0] ?? "",
          actual: h.consumed,
          forecast: undefined as number | undefined,
          confidenceLow: undefined as number | undefined,
          confidenceHigh: undefined as number | undefined,
        })),
        // Прогнозная часть
        ...forecast.forecasts.map((f) => ({
          date: f.date.toISOString().split("T")[0] ?? "",
          actual: undefined as number | undefined,
          forecast: f.predictedQty,
          confidenceLow: f.confidenceLow,
          confidenceHigh: f.confidenceHigh,
        })),
      ].filter((d) => d.date !== "");

      return {
        chartData,
        currentQty: forecast.currentQty,
        reorderPoint,
        safetyStock,
        daysToStockout: forecast.daysToStockout,
        avgDailyConsumption: forecast.avgDailyConsumption,
        trend: forecast.trend,
        mape: forecast.mape,
      };
    }),
});
