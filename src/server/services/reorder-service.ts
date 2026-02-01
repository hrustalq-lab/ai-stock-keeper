/**
 * ReorderService - рекомендации по дозаказу
 * Phase 4: Predictive Analytics
 * 
 * Расчёт: Reorder Point, Safety Stock, EOQ (Economic Order Quantity)
 */

import { db } from "~/server/db";
import { env } from "~/env";
import { consumptionService } from "./consumption-service";
import { addDays } from "date-fns";

// ============================================
// Типы
// ============================================

export type UrgencyLevel = "critical" | "warning" | "normal";

export interface ReorderConfig {
  leadTimeDays: number;        // Время доставки от поставщика
  serviceLevel: number;        // Желаемый уровень сервиса (0.90-0.99)
  reviewPeriodDays: number;    // Период пересчёта
  minOrderQty?: number;        // Минимальный заказ
  maxOrderQty?: number;        // Максимальный заказ
}

export interface ReorderRecommendation {
  sku: string;
  warehouse: string;
  productName: string;
  currentQty: number;
  reorderPoint: number;
  recommendedQty: number;
  optimalOrderQty: number;   // EOQ
  daysToStockout: number;
  urgency: UrgencyLevel;
  estimatedCost?: number;
  supplier?: string;
  reasoning: string;
}

// ============================================
// Z-значения для уровней сервиса
// ============================================
const Z_SCORES: Record<number, number> = {
  0.90: 1.28,
  0.91: 1.34,
  0.92: 1.41,
  0.93: 1.48,
  0.94: 1.55,
  0.95: 1.65,
  0.96: 1.75,
  0.97: 1.88,
  0.98: 2.05,
  0.99: 2.33,
};

/**
 * Получить Z-score для уровня сервиса
 */
function getZScore(serviceLevel: number): number {
  // Округляем до ближайшего значения в таблице
  const rounded = Math.round(serviceLevel * 100) / 100;
  return Z_SCORES[rounded] ?? 1.65; // default 95%
}

// ============================================
// ReorderService
// ============================================

export class ReorderService {
  private _defaultLeadTime: number;
  private _defaultServiceLevel: number;

  constructor() {
    this._defaultLeadTime = env.REORDER_DEFAULT_LEAD_TIME_DAYS ?? 7;
    this._defaultServiceLevel = env.REORDER_DEFAULT_SERVICE_LEVEL ?? 0.95;
  }

  /** Время поставки по умолчанию (дней) */
  get defaultLeadTime(): number {
    return this._defaultLeadTime;
  }

  /** Уровень сервиса по умолчанию (0.90-0.99) */
  get defaultServiceLevel(): number {
    return this._defaultServiceLevel;
  }

  /**
   * Рассчитать точку заказа (Reorder Point)
   * ROP = (avg_daily × lead_time) + safety_stock
   */
  calculateReorderPoint(
    avgDailyConsumption: number,
    leadTimeDays: number,
    safetyStock: number
  ): number {
    return Math.ceil(avgDailyConsumption * leadTimeDays + safetyStock);
  }

  /**
   * Рассчитать страховой запас
   * Safety Stock = Z × σ × √(lead_time)
   * Z = 1.65 для 95% service level
   */
  calculateSafetyStock(
    stdDevConsumption: number,
    leadTimeDays: number,
    serviceLevel = 0.95
  ): number {
    const z = getZScore(serviceLevel);
    return Math.ceil(z * stdDevConsumption * Math.sqrt(leadTimeDays));
  }

  /**
   * Рассчитать оптимальный объём заказа (EOQ)
   * EOQ = √(2 × D × S / H)
   * D = годовой спрос
   * S = стоимость размещения заказа
   * H = стоимость хранения единицы в год
   */
  calculateEOQ(
    annualDemand: number,
    orderCost = 500, // Стоимость размещения заказа (руб)
    holdingCostPerUnit = 50 // Стоимость хранения (руб/шт/год)
  ): number {
    if (annualDemand <= 0 || holdingCostPerUnit <= 0) return 0;
    return Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit));
  }

  /**
   * Определить срочность
   */
  determineUrgency(daysToStockout: number, leadTimeDays: number): UrgencyLevel {
    if (daysToStockout <= leadTimeDays) return "critical";
    if (daysToStockout <= leadTimeDays * 1.5) return "warning";
    return "normal";
  }

  /**
   * Сформировать обоснование рекомендации
   */
  private generateReasoning(
    urgency: UrgencyLevel,
    daysToStockout: number,
    avgDaily: number,
    trend: string
  ): string {
    const parts: string[] = [];

    if (urgency === "critical") {
      parts.push(`⚠️ Критично: запас закончится через ${daysToStockout} дн.`);
    } else if (urgency === "warning") {
      parts.push(`⚡ Внимание: запас закончится через ${daysToStockout} дн.`);
    }

    parts.push(`Средний расход: ${avgDaily.toFixed(1)} шт/день.`);

    if (trend === "increasing") {
      parts.push("📈 Тренд: потребление растёт.");
    } else if (trend === "decreasing") {
      parts.push("📉 Тренд: потребление снижается.");
    }

    return parts.join(" ");
  }

  /**
   * Получить рекомендации для одного товара
   */
  async getRecommendationForProduct(
    sku: string,
    warehouse: string,
    config?: Partial<ReorderConfig>
  ): Promise<ReorderRecommendation | null> {
    const leadTime = config?.leadTimeDays ?? this.defaultLeadTime;
    const serviceLevel = config?.serviceLevel ?? this.defaultServiceLevel;

    // 1. Получаем данные о товаре
    const inventory = await db.inventory.findFirst({
      where: { sku, warehouse },
    });

    if (!inventory) return null;

    // 2. Получаем статистику потребления
    const trend = await consumptionService.getTrend({ sku, warehouse, days: 30 });

    // 3. Рассчитываем параметры заказа
    const avgDaily = trend.avgDailyConsumption;
    const stdDev = trend.stdDevConsumption;
    const daysToStockout = avgDaily > 0 
      ? Math.floor(inventory.quantity / avgDaily) 
      : 999;

    const safetyStock = this.calculateSafetyStock(stdDev, leadTime, serviceLevel);
    const reorderPoint = this.calculateReorderPoint(avgDaily, leadTime, safetyStock);
    
    // EOQ: годовой спрос = avg_daily × 365
    const annualDemand = Math.round(avgDaily * 365);
    const eoq = this.calculateEOQ(annualDemand);

    // Рекомендуемое количество: до reorder point + EOQ
    const deficit = Math.max(0, reorderPoint - inventory.quantity);
    const recommendedQty = config?.minOrderQty
      ? Math.max(deficit + eoq, config.minOrderQty)
      : deficit + eoq;

    const urgency = this.determineUrgency(daysToStockout, leadTime);

    return {
      sku,
      warehouse,
      productName: inventory.name,
      currentQty: inventory.quantity,
      reorderPoint,
      recommendedQty: Math.ceil(recommendedQty),
      optimalOrderQty: eoq,
      daysToStockout,
      urgency,
      supplier: inventory.supplier ?? undefined,
      reasoning: this.generateReasoning(urgency, daysToStockout, avgDaily, trend.trend),
    };
  }

  /**
   * Получить все рекомендации по дозаказу
   */
  async getRecommendations(input?: {
    warehouse?: string;
    urgency?: UrgencyLevel;
    limit?: number;
  }): Promise<ReorderRecommendation[]> {
    const { warehouse, urgency, limit = 50 } = input ?? {};

    // 1. Получаем все товары
    const inventoryItems = await db.inventory.findMany({
      where: warehouse ? { warehouse } : {},
      orderBy: { quantity: "asc" },
    });

    // 2. Генерируем рекомендации для каждого
    const recommendations: ReorderRecommendation[] = [];

    for (const item of inventoryItems) {
      const rec = await this.getRecommendationForProduct(item.sku, item.warehouse);
      
      if (rec) {
        // Фильтр по срочности
        if (urgency && rec.urgency !== urgency) continue;
        
        // Добавляем только если нужен заказ
        if (rec.currentQty <= rec.reorderPoint || rec.urgency !== "normal") {
          recommendations.push(rec);
        }
      }

      if (recommendations.length >= limit) break;
    }

    // 3. Сортируем по срочности
    const urgencyOrder: Record<UrgencyLevel, number> = {
      critical: 0,
      warning: 1,
      normal: 2,
    };

    return recommendations.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.daysToStockout - b.daysToStockout;
    });
  }

  /**
   * Сохранить рекомендацию в базу
   */
  async saveRecommendation(rec: ReorderRecommendation): Promise<number> {
    const expiresAt = addDays(new Date(), 7); // Рекомендация действует 7 дней

    const saved = await db.reorderRecommendation.create({
      data: {
        sku: rec.sku,
        warehouse: rec.warehouse,
        currentQty: rec.currentQty,
        reorderPoint: rec.reorderPoint,
        recommendedQty: rec.recommendedQty,
        daysToStockout: rec.daysToStockout,
        urgency: rec.urgency,
        expiresAt,
      },
    });

    return saved.id;
  }

  /**
   * Подтвердить рекомендацию (пользователь решил заказать)
   */
  async approve(id: number, orderQty?: number): Promise<void> {
    const recommendation = await db.reorderRecommendation.findUnique({
      where: { id },
    });

    if (!recommendation) {
      throw new Error(`Рекомендация ${id} не найдена`);
    }

    await db.reorderRecommendation.update({
      where: { id },
      data: {
        status: "approved",
        recommendedQty: orderQty ?? recommendation.recommendedQty,
      },
    });
  }

  /**
   * Получить сводку рекомендаций
   */
  async getSummary(warehouse?: string): Promise<{
    critical: number;
    warning: number;
    normal: number;
    totalRecommendedQty: number;
    estimatedTotalCost: number;
  }> {
    const recommendations = await this.getRecommendations({ warehouse, limit: 1000 });

    return {
      critical: recommendations.filter((r) => r.urgency === "critical").length,
      warning: recommendations.filter((r) => r.urgency === "warning").length,
      normal: recommendations.filter((r) => r.urgency === "normal").length,
      totalRecommendedQty: recommendations.reduce((sum, r) => sum + r.recommendedQty, 0),
      estimatedTotalCost: recommendations.reduce(
        (sum, r) => sum + (r.estimatedCost ?? 0),
        0
      ),
    };
  }

  /**
   * Очистить устаревшие рекомендации
   */
  async cleanupExpired(): Promise<number> {
    const result = await db.reorderRecommendation.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        status: "pending",
      },
    });
    return result.count;
  }
}

// Singleton экземпляр
export const reorderService = new ReorderService();
