/**
 * ForecastService - прогнозирование спроса
 * Phase 4: Predictive Analytics
 * 
 * Алгоритмы: SMA (Simple Moving Average), EMA (Exponential Moving Average)
 * Опционально: Prophet (через microservice)
 */

import { db } from "~/server/db";
import { env } from "~/env";
import { consumptionService } from "./consumption-service";
import { addDays, subDays, startOfDay } from "date-fns";

// ============================================
// Типы
// ============================================

export type ForecastModel = "sma" | "ema" | "prophet";
export type TrendDirection = "increasing" | "stable" | "decreasing";

export interface ForecastInput {
  sku: string;
  warehouse: string;
  historyDays?: number;  // Сколько дней истории использовать (default: 60)
  forecastDays?: number; // На сколько дней прогноз (default: 14)
  model?: ForecastModel;
}

export interface ForecastPoint {
  date: Date;
  predictedQty: number;
  confidenceLow?: number;
  confidenceHigh?: number;
}

export interface ForecastResult {
  sku: string;
  warehouse: string;
  currentQty: number;
  forecasts: ForecastPoint[];
  daysToStockout: number;
  avgDailyConsumption: number;
  trend: TrendDirection;
  seasonality: boolean;
  mape?: number;
  model: ForecastModel;
  historyDays: number;
  generatedAt: Date;
}

export interface ModelAccuracy {
  model: ForecastModel;
  mape: number;
  sampleSize: number;
  period: {
    start: Date;
    end: Date;
  };
}

// ============================================
// Алгоритмы прогнозирования
// ============================================

/**
 * Simple Moving Average
 * Среднее за последние N точек
 */
export function calculateSMA(data: number[], window: number): number {
  if (data.length === 0) return 0;
  if (data.length < window) {
    return data.reduce((a, b) => a + b, 0) / data.length;
  }
  const slice = data.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Exponential Moving Average
 * Взвешенное среднее, где недавние данные важнее
 * smoothing = 2 / (window + 1) — типичное значение
 */
export function calculateEMA(data: number[], smoothing = 0.3): number {
  if (data.length === 0) return 0;
  
  return data.reduce((ema, value, index) => {
    if (index === 0) return value;
    return value * smoothing + ema * (1 - smoothing);
  }, data[0] ?? 0);
}

/**
 * Дней до нулевого остатка
 */
export function daysToStockout(currentQty: number, avgDailyConsumption: number): number {
  if (avgDailyConsumption <= 0) return Infinity;
  return Math.floor(currentQty / avgDailyConsumption);
}

/**
 * Определение тренда через линейную регрессию
 */
export function detectTrend(data: number[]): TrendDirection {
  const n = data.length;
  if (n < 2) return "stable";

  const sumX = (n * (n - 1)) / 2;
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return "stable";

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const avgY = sumY / n;

  // Порог: 10% от среднего или абсолютный минимум
  const threshold = Math.max(avgY * 0.1, 0.1);
  
  if (slope > threshold) return "increasing";
  if (slope < -threshold) return "decreasing";
  return "stable";
}

/**
 * Обнаружение сезонности (упрощённый autocorrelation)
 * Проверяет периоды 7 дней (недельная) и 30 дней (месячная)
 */
export function detectSeasonality(data: number[]): boolean {
  if (data.length < 14) return false;

  // Проверяем недельную сезонность
  const weeklyCorr = calculateAutocorrelation(data, 7);
  if (weeklyCorr > 0.5) return true;

  // Проверяем месячную сезонность если достаточно данных
  if (data.length >= 60) {
    const monthlyCorr = calculateAutocorrelation(data, 30);
    if (monthlyCorr > 0.5) return true;
  }

  return false;
}

/**
 * Автокорреляция с лагом
 */
function calculateAutocorrelation(data: number[], lag: number): number {
  if (data.length < lag * 2) return 0;

  const n = data.length - lag;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (data[i]! - mean) * (data[i + lag]! - mean);
    denominator += Math.pow(data[i]! - mean, 2);
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Расчёт стандартного отклонения
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * MAPE (Mean Absolute Percentage Error)
 */
function calculateMAPE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) return 0;

  let totalError = 0;
  let validCount = 0;

  for (let i = 0; i < actual.length; i++) {
    if (actual[i]! > 0) {
      totalError += Math.abs((actual[i]! - predicted[i]!) / actual[i]!);
      validCount++;
    }
  }

  return validCount > 0 ? (totalError / validCount) * 100 : 0;
}

// ============================================
// ForecastService
// ============================================

export class ForecastService {
  private defaultHistoryDays: number;
  private defaultPeriods: number;

  constructor() {
    this.defaultHistoryDays = env.FORECAST_DEFAULT_HISTORY_DAYS ?? 60;
    this.defaultPeriods = env.FORECAST_DEFAULT_PERIODS ?? 14;
  }

  /**
   * Главный метод прогнозирования
   * @param warehouse - конкретный склад или "all" для агрегации по всем складам
   */
  async forecast(input: ForecastInput): Promise<ForecastResult> {
    const {
      sku,
      warehouse,
      historyDays = this.defaultHistoryDays,
      forecastDays = this.defaultPeriods,
      model = "sma",
    } = input;

    // 1. Получаем историю потребления
    const history = await consumptionService.getHistory(sku, warehouse, historyDays);
    const consumedValues = history.map((h) => h.consumed);

    // 2. Получаем текущий остаток (сумма по всем складам если "all")
    let currentQty: number;
    if (warehouse === "all") {
      const inventorySum = await db.inventory.aggregate({
        where: { sku },
        _sum: { quantity: true },
      });
      currentQty = inventorySum._sum.quantity ?? 0;
    } else {
      const inventory = await db.inventory.findFirst({
        where: { sku, warehouse },
      });
      currentQty = inventory?.quantity ?? 0;
    }

    // 3. Рассчитываем статистику
    const avgDaily = consumedValues.length > 0
      ? consumedValues.reduce((a, b) => a + b, 0) / consumedValues.length
      : 0;
    const stdDev = calculateStdDev(consumedValues);
    const trend = detectTrend(consumedValues);
    const seasonality = detectSeasonality(consumedValues);

    // 4. Генерируем прогноз
    const forecasts: ForecastPoint[] = [];
    const today = startOfDay(new Date());

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = addDays(today, i);
      let predictedQty: number;

      if (model === "ema") {
        // EMA с учётом тренда
        const baseEMA = calculateEMA(consumedValues, 0.3);
        const trendAdjustment = trend === "increasing" ? 1.05 : trend === "decreasing" ? 0.95 : 1;
        predictedQty = Math.round(baseEMA * Math.pow(trendAdjustment, i / 7));
      } else {
        // SMA (default)
        const window = Math.min(7, consumedValues.length);
        predictedQty = Math.round(calculateSMA(consumedValues, window));
      }

      // Доверительный интервал (±1.96σ для 95%)
      const confidenceMargin = Math.round(1.96 * stdDev);

      forecasts.push({
        date: forecastDate,
        predictedQty: Math.max(0, predictedQty),
        confidenceLow: Math.max(0, predictedQty - confidenceMargin),
        confidenceHigh: predictedQty + confidenceMargin,
      });
    }

    // 5. Дней до stockout
    const stockoutDays = daysToStockout(currentQty, avgDaily);

    return {
      sku,
      warehouse,
      currentQty,
      forecasts,
      daysToStockout: stockoutDays === Infinity ? 999 : stockoutDays,
      avgDailyConsumption: Math.round(avgDaily * 100) / 100,
      trend,
      seasonality,
      model,
      historyDays,
      generatedAt: new Date(),
    };
  }

  /**
   * Прогноз для нескольких товаров (batch)
   */
  async forecastBatch(
    items: Array<{ sku: string; warehouse: string }>,
    options?: Omit<ForecastInput, "sku" | "warehouse">
  ): Promise<ForecastResult[]> {
    const results = await Promise.all(
      items.map((item) =>
        this.forecast({
          ...item,
          ...options,
        })
      )
    );
    return results;
  }

  /**
   * Сохранить прогноз в базу
   */
  async saveForecast(result: ForecastResult): Promise<void> {
    for (const point of result.forecasts) {
      await db.forecast.upsert({
        where: {
          sku_warehouse_forecastDate_model: {
            sku: result.sku,
            warehouse: result.warehouse,
            forecastDate: point.date,
            model: result.model,
          },
        },
        create: {
          sku: result.sku,
          warehouse: result.warehouse,
          forecastDate: point.date,
          predictedQty: point.predictedQty,
          confidenceLow: point.confidenceLow,
          confidenceHigh: point.confidenceHigh,
          model: result.model,
        },
        update: {
          predictedQty: point.predictedQty,
          confidenceLow: point.confidenceLow,
          confidenceHigh: point.confidenceHigh,
        },
      });
    }
  }

  /**
   * Получить точность моделей (сравнение прогнозов с фактом)
   */
  async getAccuracy(input: {
    model?: ForecastModel;
    days?: number;
  }): Promise<ModelAccuracy[]> {
    const { model, days = 30 } = input;
    const startDate = subDays(new Date(), days);

    // Получаем прогнозы, которые уже можно сравнить с фактом
    const forecasts = await db.forecast.findMany({
      where: {
        ...(model ? { model } : {}),
        forecastDate: {
          gte: startDate,
          lte: new Date(),
        },
      },
    });

    if (forecasts.length === 0) {
      return [];
    }

    // Собираем уникальные комбинации sku+warehouse+date для batch-запроса
    const uniqueKeys = new Set<string>();
    const lookupKeys: Array<{ sku: string; warehouse: string; date: Date }> = [];
    
    for (const f of forecasts) {
      const key = `${f.sku}:${f.warehouse}:${f.forecastDate.toISOString()}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        lookupKeys.push({ sku: f.sku, warehouse: f.warehouse, date: f.forecastDate });
      }
    }

    // Batch-запрос: загружаем все нужные dailyConsumption записи одним запросом
    const consumptions = await db.dailyConsumption.findMany({
      where: {
        OR: lookupKeys.map((k) => ({
          sku: k.sku,
          warehouse: k.warehouse,
          date: k.date,
        })),
      },
    });

    // Создаём Map для быстрого поиска по ключу
    const consumptionMap = new Map<string, number>();
    for (const c of consumptions) {
      const key = `${c.sku}:${c.warehouse}:${c.date.toISOString()}`;
      consumptionMap.set(key, c.consumed);
    }

    // Группируем по модели (теперь без дополнительных запросов)
    const byModel = new Map<ForecastModel, { actual: number[]; predicted: number[] }>();

    for (const f of forecasts) {
      const key = `${f.sku}:${f.warehouse}:${f.forecastDate.toISOString()}`;
      const actualConsumed = consumptionMap.get(key);

      if (actualConsumed !== undefined) {
        const modelKey = f.model as ForecastModel;
        const data = byModel.get(modelKey) ?? { actual: [], predicted: [] };
        data.actual.push(actualConsumed);
        data.predicted.push(f.predictedQty);
        byModel.set(modelKey, data);
      }
    }

    // Рассчитываем MAPE для каждой модели
    const results: ModelAccuracy[] = [];
    for (const [modelName, data] of byModel) {
      results.push({
        model: modelName,
        mape: calculateMAPE(data.actual, data.predicted),
        sampleSize: data.actual.length,
        period: { start: startDate, end: new Date() },
      });
    }

    return results;
  }

  // === Публичные методы для unit-тестов ===

  calculateSMA = calculateSMA;
  calculateEMA = calculateEMA;
  daysToStockout = daysToStockout;
  detectTrend = detectTrend;
  detectSeasonality = detectSeasonality;
}

// Singleton экземпляр
export const forecastService = new ForecastService();
