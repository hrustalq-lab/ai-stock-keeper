/**
 * PickingAnalyticsService - аналитика сборки
 * Phase 5: Picking Optimization
 */

import { db } from "~/server/db";

// ============================================
// Типы
// ============================================

export interface PickingStats {
  period: "today" | "week" | "month";
  totalLists: number;
  completedLists: number;
  totalItems: number;
  totalQuantity: number;
  avgPickingMins: number;
  picksPerHour: number;
  accuracy: number;      // % без ошибок
  shortageRate: number;  // % недостач
}

export interface WorkerPerformance {
  workerId: string;
  completedLists: number;
  totalItems: number;
  avgPickingMins: number;
  picksPerHour: number;
  accuracy: number;
  efficiency: number;    // vs estimated time
  trend: "improving" | "stable" | "declining";
}

export interface IssueStats {
  issueType: string;
  count: number;
  skus: string[];
}

export interface PerformanceTrendPoint {
  date: string;
  picksPerHour: number;
  accuracy: number;
  completedLists: number;
}

// ============================================
// Сервис
// ============================================

class PickingAnalyticsService {
  /**
   * Получить статистику сборки за период
   */
  async getStats(warehouse: string, period: "today" | "week" | "month"): Promise<PickingStats> {
    const startDate = this.getPeriodStartDate(period);

    // Получаем данные из истории
    const histories = await db.pickingHistory.findMany({
      where: {
        warehouse,
        createdAt: { gte: startDate },
      },
    });

    // Получаем листы
    const lists = await db.pickingList.findMany({
      where: {
        warehouse,
        createdAt: { gte: startDate },
      },
      select: { status: true },
    });

    const totalLists = lists.length;
    const completedLists = lists.filter((l) => l.status === "completed").length;

    // Агрегация из истории
    const totalItems = histories.reduce((sum, h) => sum + h.itemCount, 0);
    const totalQuantity = histories.reduce((sum, h) => sum + h.totalQty, 0);
    const totalMins = histories.reduce((sum, h) => sum + h.pickingMins, 0);
    const totalErrors = histories.reduce((sum, h) => sum + h.errorCount, 0);
    const totalShortages = histories.reduce((sum, h) => sum + h.shortageCount, 0);

    const avgPickingMins = histories.length > 0 ? totalMins / histories.length : 0;
    const picksPerHour =
      histories.length > 0
        ? histories.reduce((sum, h) => sum + h.picksPerHour, 0) / histories.length
        : 0;

    const accuracy = totalItems > 0 ? (totalItems - totalErrors) / totalItems : 1;
    const shortageRate = totalItems > 0 ? totalShortages / totalItems : 0;

    return {
      period,
      totalLists,
      completedLists,
      totalItems,
      totalQuantity,
      avgPickingMins: Math.round(avgPickingMins * 10) / 10,
      picksPerHour: Math.round(picksPerHour * 10) / 10,
      accuracy: Math.round(accuracy * 1000) / 1000,
      shortageRate: Math.round(shortageRate * 1000) / 1000,
    };
  }

  /**
   * Получить производительность работников
   */
  async getWorkerPerformance(
    warehouse: string,
    period: "today" | "week" | "month"
  ): Promise<WorkerPerformance[]> {
    const startDate = this.getPeriodStartDate(period);

    // Получаем историю сгруппированную по работникам
    const histories = await db.pickingHistory.findMany({
      where: {
        warehouse,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "asc" },
    });

    // Группируем по работникам
    const byWorker: Record<string, typeof histories> = {};
    for (const h of histories) {
      byWorker[h.workerId] ??= [];
      byWorker[h.workerId]!.push(h);
    }

    // Формируем результат
    const result: WorkerPerformance[] = [];

    for (const [workerId, workerHistories] of Object.entries(byWorker)) {
      const completedLists = workerHistories.length;
      const totalItems = workerHistories.reduce((sum, h) => sum + h.itemCount, 0);
      const totalMins = workerHistories.reduce((sum, h) => sum + h.pickingMins, 0);
      const totalErrors = workerHistories.reduce((sum, h) => sum + h.errorCount, 0);

      const avgPickingMins = completedLists > 0 ? totalMins / completedLists : 0;
      const picksPerHour =
        completedLists > 0
          ? workerHistories.reduce((sum, h) => sum + h.picksPerHour, 0) / completedLists
          : 0;
      const accuracy = totalItems > 0 ? (totalItems - totalErrors) / totalItems : 1;
      const efficiency =
        completedLists > 0
          ? workerHistories.reduce((sum, h) => sum + h.efficiency, 0) / completedLists
          : 1;

      // Определяем тренд (сравниваем первую и последнюю половину)
      const trend = this.calculateTrend(workerHistories);

      result.push({
        workerId,
        completedLists,
        totalItems,
        avgPickingMins: Math.round(avgPickingMins * 10) / 10,
        picksPerHour: Math.round(picksPerHour * 10) / 10,
        accuracy: Math.round(accuracy * 1000) / 1000,
        efficiency: Math.round(efficiency * 100) / 100,
        trend,
      });
    }

    // Сортируем по производительности
    return result.sort((a, b) => b.picksPerHour - a.picksPerHour);
  }

  /**
   * Получить топ ошибок сборки
   */
  async getTopIssues(warehouse: string, limit = 10): Promise<IssueStats[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Получаем позиции с проблемами
    const items = await db.pickingItem.findMany({
      where: {
        pickingList: {
          warehouse,
          createdAt: { gte: thirtyDaysAgo },
        },
        issueType: { not: null },
      },
      select: {
        issueType: true,
        sku: true,
      },
    });

    // Группируем по типу проблемы
    const byIssue: Record<string, Set<string>> = {};
    for (const item of items) {
      if (!item.issueType) continue;
      byIssue[item.issueType] ??= new Set();
      byIssue[item.issueType]!.add(item.sku);
    }

    // Формируем результат
    const result: IssueStats[] = [];
    for (const [issueType, skus] of Object.entries(byIssue)) {
      const skuArray = Array.from(skus);
      result.push({
        issueType,
        count: items.filter((i) => i.issueType === issueType).length,
        skus: skuArray.slice(0, 5), // Топ 5 SKU с этой проблемой
      });
    }

    return result.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  /**
   * Получить тренд производительности по дням
   */
  async getPerformanceTrend(
    warehouse: string,
    days: number
  ): Promise<PerformanceTrendPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const histories = await db.pickingHistory.findMany({
      where: {
        warehouse,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "asc" },
    });

    // Группируем по дням
    const byDay: Record<string, typeof histories> = {};
    for (const h of histories) {
      const date = h.createdAt.toISOString().slice(0, 10);
      byDay[date] ??= [];
      byDay[date].push(h);
    }

    // Формируем результат для каждого дня
    const result: PerformanceTrendPoint[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);

      const dayHistories = byDay[dateStr] ?? [];

      if (dayHistories.length === 0) {
        result.push({
          date: dateStr,
          picksPerHour: 0,
          accuracy: 1,
          completedLists: 0,
        });
        continue;
      }

      const picksPerHour =
        dayHistories.reduce((sum, h) => sum + h.picksPerHour, 0) / dayHistories.length;
      const totalItems = dayHistories.reduce((sum, h) => sum + h.itemCount, 0);
      const totalErrors = dayHistories.reduce((sum, h) => sum + h.errorCount, 0);
      const accuracy = totalItems > 0 ? (totalItems - totalErrors) / totalItems : 1;

      result.push({
        date: dateStr,
        picksPerHour: Math.round(picksPerHour * 10) / 10,
        accuracy: Math.round(accuracy * 1000) / 1000,
        completedLists: dayHistories.length,
      });
    }

    return result;
  }

  /**
   * Получить сводку за сегодня
   */
  async getTodaySummary(warehouse: string): Promise<{
    created: number;
    inProgress: number;
    completed: number;
    avgTime: number;
    errorRate: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lists = await db.pickingList.findMany({
      where: {
        warehouse,
        createdAt: { gte: today },
      },
      select: { status: true },
    });

    const histories = await db.pickingHistory.findMany({
      where: {
        warehouse,
        createdAt: { gte: today },
      },
    });

    const created = lists.filter((l) => l.status === "created").length;
    const inProgress = lists.filter(
      (l) => l.status === "assigned" || l.status === "in_progress"
    ).length;
    const completed = lists.filter((l) => l.status === "completed").length;

    const avgTime =
      histories.length > 0
        ? histories.reduce((sum, h) => sum + h.pickingMins, 0) / histories.length
        : 0;

    const totalItems = histories.reduce((sum, h) => sum + h.itemCount, 0);
    const totalErrors = histories.reduce((sum, h) => sum + h.errorCount, 0);
    const errorRate = totalItems > 0 ? totalErrors / totalItems : 0;

    return {
      created,
      inProgress,
      completed,
      avgTime: Math.round(avgTime * 10) / 10,
      errorRate: Math.round(errorRate * 1000) / 1000,
    };
  }

  /**
   * Получить дату начала периода
   */
  private getPeriodStartDate(period: "today" | "week" | "month"): Date {
    const now = new Date();
    switch (period) {
      case "today":
        now.setHours(0, 0, 0, 0);
        return now;
      case "week":
        now.setDate(now.getDate() - 7);
        now.setHours(0, 0, 0, 0);
        return now;
      case "month":
        now.setMonth(now.getMonth() - 1);
        now.setHours(0, 0, 0, 0);
        return now;
    }
  }

  /**
   * Рассчитать тренд на основе истории
   */
  private calculateTrend(
    histories: Array<{ picksPerHour: number }>
  ): "improving" | "stable" | "declining" {
    if (histories.length < 4) return "stable";

    const mid = Math.floor(histories.length / 2);
    const firstHalf = histories.slice(0, mid);
    const secondHalf = histories.slice(mid);

    const avgFirst =
      firstHalf.reduce((sum, h) => sum + h.picksPerHour, 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((sum, h) => sum + h.picksPerHour, 0) / secondHalf.length;

    const change = (avgSecond - avgFirst) / avgFirst;

    if (change > 0.1) return "improving";
    if (change < -0.1) return "declining";
    return "stable";
  }
}

// Singleton экземпляр
export const pickingAnalyticsService = new PickingAnalyticsService();
