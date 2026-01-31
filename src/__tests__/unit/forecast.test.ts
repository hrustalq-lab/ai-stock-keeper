/**
 * Unit-тесты ForecastService
 * Phase 4: Predictive Analytics
 */

import { describe, it, expect } from "@jest/globals";
import {
  calculateSMA,
  calculateEMA,
  daysToStockout,
  detectTrend,
  detectSeasonality,
} from "../../server/services/forecast-service";

describe("ForecastService", () => {
  describe("calculateSMA", () => {
    it("должен корректно рассчитать простое скользящее среднее", () => {
      const data = [10, 20, 30, 40, 50];
      const sma = calculateSMA(data, 3);
      expect(sma).toBe(40); // (30 + 40 + 50) / 3
    });

    it("должен обработать окно больше данных", () => {
      const data = [10, 20];
      const sma = calculateSMA(data, 5);
      expect(sma).toBe(15); // (10 + 20) / 2
    });

    it("должен вернуть 0 для пустого массива", () => {
      expect(calculateSMA([], 3)).toBe(0);
    });

    it("должен обработать одно значение", () => {
      expect(calculateSMA([100], 3)).toBe(100);
    });
  });

  describe("calculateEMA", () => {
    it("должен взвешивать недавние данные больше", () => {
      const data = [10, 10, 10, 100]; // Spike в конце
      const ema = calculateEMA(data, 0.5);
      expect(ema).toBeGreaterThan(30); // Должен быть ближе к 100
    });

    it("должен вернуть 0 для пустого массива", () => {
      expect(calculateEMA([], 0.3)).toBe(0);
    });

    it("должен вернуть значение для одного элемента", () => {
      expect(calculateEMA([50], 0.3)).toBe(50);
    });

    it("должен работать с разными коэффициентами сглаживания", () => {
      const data = [10, 20, 30, 40, 50];
      const ema03 = calculateEMA(data, 0.3);
      const ema07 = calculateEMA(data, 0.7);
      
      // Более высокий коэффициент = больше вес последним данным
      expect(ema07).toBeGreaterThan(ema03);
    });
  });

  describe("daysToStockout", () => {
    it("должен корректно рассчитать дни до нуля", () => {
      expect(daysToStockout(100, 10)).toBe(10);
      expect(daysToStockout(50, 7)).toBe(7);
      expect(daysToStockout(25, 5)).toBe(5);
    });

    it("должен вернуть Infinity при нулевом потреблении", () => {
      expect(daysToStockout(100, 0)).toBe(Infinity);
    });

    it("должен вернуть Infinity при отрицательном потреблении", () => {
      expect(daysToStockout(100, -5)).toBe(Infinity);
    });

    it("должен округлить вниз", () => {
      expect(daysToStockout(25, 6)).toBe(4); // 25/6 = 4.16 → 4
    });
  });

  describe("detectTrend", () => {
    it("должен определить растущий тренд", () => {
      const data = [10, 15, 20, 25, 30];
      expect(detectTrend(data)).toBe("increasing");
    });

    it("должен определить падающий тренд", () => {
      const data = [30, 25, 20, 15, 10];
      expect(detectTrend(data)).toBe("decreasing");
    });

    it("должен определить стабильный тренд", () => {
      const data = [20, 21, 19, 20, 21, 20];
      expect(detectTrend(data)).toBe("stable");
    });

    it("должен вернуть stable для пустого массива", () => {
      expect(detectTrend([])).toBe("stable");
    });

    it("должен вернуть stable для одной точки", () => {
      expect(detectTrend([100])).toBe("stable");
    });

    it("должен обработать две точки", () => {
      expect(detectTrend([10, 50])).toBe("increasing");
      expect(detectTrend([50, 10])).toBe("decreasing");
    });

    it("должен обработать одинаковые значения", () => {
      const data = [10, 10, 10, 10, 10];
      expect(detectTrend(data)).toBe("stable");
    });
  });

  describe("detectSeasonality", () => {
    it("должен вернуть false для короткого массива", () => {
      const data = [10, 20, 30, 40, 50];
      expect(detectSeasonality(data)).toBe(false);
    });

    it("должен обнаружить недельную сезонность", () => {
      // Паттерн повторяется каждые 7 дней
      const data = [
        100, 80, 60, 40, 60, 80, 100, // Неделя 1
        100, 80, 60, 40, 60, 80, 100, // Неделя 2
        100, 80, 60, 40, 60, 80, 100, // Неделя 3
      ];
      // Ожидаем обнаружение сезонности
      expect(detectSeasonality(data)).toBe(true);
    });

    it("должен вернуть false для случайных данных", () => {
      const data = [23, 67, 12, 89, 45, 78, 34, 56, 90, 11, 43, 76, 28, 65];
      // Случайные данные не должны показывать сезонность
      expect(detectSeasonality(data)).toBe(false);
    });
  });
});
