/**
 * ConsumptionService - агрегация дневного потребления товаров
 * Phase 4: Predictive Analytics
 * 
 * Собирает данные из Transaction для расчёта прогнозов
 */

import { db } from "~/server/db";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

// ============================================
// Типы
// ============================================

export interface DailyConsumptionData {
  date: Date;
  consumed: number;
  received: number;
  netChange: number;
}

export interface ConsumptionTrend {
  sku: string;
  warehouse: string;
  period: {
    start: Date;
    end: Date;
  };
  totalConsumed: number;
  totalReceived: number;
  avgDailyConsumption: number;
  stdDevConsumption: number;
  minDaily: number;
  maxDaily: number;
  daysWithData: number;
  trend: "increasing" | "stable" | "decreasing";
  dailyData: DailyConsumptionData[];
}

export interface AggregationResult {
  sku: string;
  warehouse: string;
  date: Date;
  consumed: number;
  received: number;
  netChange: number;
}

// ============================================
// Утилиты
// ============================================

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
 * Определение тренда через линейную регрессию
 */
function detectTrendFromData(values: number[]): "increasing" | "stable" | "decreasing" {
  const n = values.length;
  if (n < 2) return "stable";

  // Линейная регрессия: y = mx + b
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return "stable";

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const avgY = sumY / n;

  // Порог 10% от среднего значения
  const threshold = avgY * 0.1 || 0.1;
  
  if (slope > threshold) return "increasing";
  if (slope < -threshold) return "decreasing";
  return "stable";
}

// ============================================
// ConsumptionService
// ============================================

export class ConsumptionService {
  /**
   * Агрегирует транзакции за день в DailyConsumption
   * Запускается как cron job или вручную
   */
  async aggregateDay(date: Date): Promise<AggregationResult[]> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Получаем все транзакции за день
    const transactions = await db.transaction.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    // Группируем по SKU + warehouse
    const grouped = new Map<string, { consumed: number; received: number }>();

    for (const tx of transactions) {
      // Обрабатываем исходящие (picking - отгрузка со склада)
      if (tx.type === "picking") {
        const warehouse = tx.fromWarehouse ?? "unknown";
        const key = `${tx.sku}:${warehouse}`;
        const current = grouped.get(key) ?? { consumed: 0, received: 0 };
        current.consumed += tx.quantity;
        grouped.set(key, current);
      }

      // Обрабатываем входящие (intake - приёмка на склад)
      if (tx.type === "intake") {
        const warehouse = tx.toWarehouse ?? "unknown";
        const key = `${tx.sku}:${warehouse}`;
        const current = grouped.get(key) ?? { consumed: 0, received: 0 };
        current.received += tx.quantity;
        grouped.set(key, current);
      }

      // Трансферы: из одного склада уходит, на другой приходит
      if (tx.type === "transfer") {
        if (tx.fromWarehouse) {
          const keyFrom = `${tx.sku}:${tx.fromWarehouse}`;
          const currentFrom = grouped.get(keyFrom) ?? { consumed: 0, received: 0 };
          currentFrom.consumed += tx.quantity;
          grouped.set(keyFrom, currentFrom);
        }
        if (tx.toWarehouse) {
          const keyTo = `${tx.sku}:${tx.toWarehouse}`;
          const currentTo = grouped.get(keyTo) ?? { consumed: 0, received: 0 };
          currentTo.received += tx.quantity;
          grouped.set(keyTo, currentTo);
        }
      }

      // Корректировки (adjustment - ручная корректировка остатка)
      if (tx.type === "adjustment") {
        const warehouse = tx.fromWarehouse ?? tx.toWarehouse ?? "unknown";
        const key = `${tx.sku}:${warehouse}`;
        const current = grouped.get(key) ?? { consumed: 0, received: 0 };
        // Положительное значение = приход, отрицательное = списание
        if (tx.quantity >= 0) {
          current.received += tx.quantity;
        } else {
          current.consumed += Math.abs(tx.quantity);
        }
        grouped.set(key, current);
      }
    }

    // Сохраняем в базу
    const results: AggregationResult[] = [];

    for (const [key, data] of grouped) {
      const [sku, warehouse] = key.split(":");
      if (!sku || !warehouse) continue;

      const netChange = data.consumed - data.received;

      await db.dailyConsumption.upsert({
        where: {
          sku_warehouse_date: { sku, warehouse, date: dayStart },
        },
        create: {
          sku,
          warehouse,
          date: dayStart,
          consumed: data.consumed,
          received: data.received,
          netChange,
        },
        update: {
          consumed: data.consumed,
          received: data.received,
          netChange,
        },
      });

      results.push({
        sku,
        warehouse,
        date: dayStart,
        consumed: data.consumed,
        received: data.received,
        netChange,
      });
    }

    return results;
  }

  /**
   * Агрегация за период (backfill)
   */
  async aggregateRange(startDate: Date, endDate: Date): Promise<number> {
    let count = 0;
    let current = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (current <= end) {
      await this.aggregateDay(current);
      count++;
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }

    return count;
  }

  /**
   * Получить историю потребления для SKU
   * @param warehouse - конкретный склад или "all" для агрегации по всем складам
   */
  async getHistory(
    sku: string,
    warehouse: string,
    days = 60
  ): Promise<DailyConsumptionData[]> {
    const startDate = subDays(new Date(), days);

    // Если warehouse = "all", агрегируем по всем складам
    if (warehouse === "all") {
      const grouped = await db.dailyConsumption.groupBy({
        by: ["date"],
        where: {
          sku,
          date: { gte: startOfDay(startDate) },
        },
        _sum: {
          consumed: true,
          received: true,
          netChange: true,
        },
        orderBy: { date: "asc" },
      });

      return grouped.map((r) => ({
        date: r.date,
        consumed: r._sum.consumed ?? 0,
        received: r._sum.received ?? 0,
        netChange: r._sum.netChange ?? 0,
      }));
    }

    // Обычный запрос для конкретного склада
    const records = await db.dailyConsumption.findMany({
      where: {
        sku,
        warehouse,
        date: { gte: startOfDay(startDate) },
      },
      orderBy: { date: "asc" },
    });

    return records.map((r) => ({
      date: r.date,
      consumed: r.consumed,
      received: r.received,
      netChange: r.netChange,
    }));
  }

  /**
   * Получить тренд потребления с статистикой
   * @param warehouse - конкретный склад или "all" для агрегации по всем складам
   */
  async getTrend(input: {
    sku: string;
    warehouse: string;
    days?: number;
  }): Promise<ConsumptionTrend> {
    const { sku, warehouse, days = 30 } = input;
    const startDate = subDays(new Date(), days);

    // Используем getHistory для поддержки "all"
    const dailyData = await this.getHistory(sku, warehouse, days);

    const consumedValues = dailyData.map((r) => r.consumed);
    const totalConsumed = consumedValues.reduce((a, b) => a + b, 0);
    const totalReceived = dailyData.reduce((a, r) => a + r.received, 0);

    return {
      sku,
      warehouse,
      period: {
        start: startDate,
        end: new Date(),
      },
      totalConsumed,
      totalReceived,
      avgDailyConsumption: dailyData.length > 0 ? totalConsumed / dailyData.length : 0,
      stdDevConsumption: calculateStdDev(consumedValues),
      minDaily: consumedValues.length > 0 ? Math.min(...consumedValues) : 0,
      maxDaily: consumedValues.length > 0 ? Math.max(...consumedValues) : 0,
      daysWithData: dailyData.length,
      trend: detectTrendFromData(consumedValues),
      dailyData,
    };
  }

  /**
   * Получить топ товаров по потреблению
   */
  async getTopConsumed(
    warehouse: string | undefined,
    days = 30,
    limit = 10
  ): Promise<Array<{ sku: string; totalConsumed: number; avgDaily: number }>> {
    const startDate = subDays(new Date(), days);

    // Используем raw query для агрегации
    const result = await db.dailyConsumption.groupBy({
      by: ["sku"],
      where: {
        ...(warehouse ? { warehouse } : {}),
        date: { gte: startOfDay(startDate) },
      },
      _sum: { consumed: true },
      orderBy: { _sum: { consumed: "desc" } },
      take: limit,
    });

    return result.map((r) => ({
      sku: r.sku,
      totalConsumed: r._sum.consumed ?? 0,
      avgDaily: (r._sum.consumed ?? 0) / days,
    }));
  }
}

// Singleton экземпляр
export const consumptionService = new ConsumptionService();
