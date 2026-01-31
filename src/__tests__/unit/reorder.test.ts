/**
 * Unit-тесты ReorderService
 * Phase 4: Predictive Analytics
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { ReorderService } from "../../server/services/reorder-service";

describe("ReorderService", () => {
  let service: ReorderService;

  beforeEach(() => {
    service = new ReorderService();
  });

  describe("calculateReorderPoint", () => {
    it("должен корректно рассчитать точку заказа", () => {
      // ROP = avgDaily * leadTime + safetyStock
      // ROP = 10 * 7 + 20 = 90
      const rop = service.calculateReorderPoint(10, 7, 20);
      expect(rop).toBe(90);
    });

    it("должен округлить вверх", () => {
      // ROP = 3.5 * 7 + 5 = 29.5 → 30
      const rop = service.calculateReorderPoint(3.5, 7, 5);
      expect(rop).toBe(30);
    });

    it("должен обработать нулевое потребление", () => {
      const rop = service.calculateReorderPoint(0, 7, 10);
      expect(rop).toBe(10); // Только safety stock
    });
  });

  describe("calculateSafetyStock", () => {
    it("должен рассчитать страховой запас для 95% уровня сервиса", () => {
      // SS = Z * σ * √(leadTime)
      // SS = 1.65 * 10 * √7 ≈ 43.6 → 44
      const ss = service.calculateSafetyStock(10, 7, 0.95);
      expect(ss).toBeGreaterThan(40);
      expect(ss).toBeLessThan(50);
    });

    it("должен учитывать разные уровни сервиса", () => {
      const ss90 = service.calculateSafetyStock(10, 7, 0.90);
      const ss99 = service.calculateSafetyStock(10, 7, 0.99);
      
      // Более высокий уровень сервиса = больший страховой запас
      expect(ss99).toBeGreaterThan(ss90);
    });

    it("должен обработать нулевое отклонение", () => {
      const ss = service.calculateSafetyStock(0, 7, 0.95);
      expect(ss).toBe(0);
    });
  });

  describe("calculateEOQ", () => {
    it("должен рассчитать оптимальный объём заказа", () => {
      // EOQ = √(2 * D * S / H)
      // EOQ = √(2 * 1000 * 500 / 50) = √20000 ≈ 141.4 → 142
      const eoq = service.calculateEOQ(1000, 500, 50);
      expect(eoq).toBeGreaterThan(140);
      expect(eoq).toBeLessThan(145);
    });

    it("должен вернуть 0 для нулевого спроса", () => {
      expect(service.calculateEOQ(0, 500, 50)).toBe(0);
    });

    it("должен обработать высокую стоимость хранения", () => {
      const eoqLow = service.calculateEOQ(1000, 500, 10);
      const eoqHigh = service.calculateEOQ(1000, 500, 100);
      
      // Более высокая стоимость хранения = меньший EOQ
      expect(eoqHigh).toBeLessThan(eoqLow);
    });
  });

  describe("determineUrgency", () => {
    const leadTime = 7; // дней

    it("должен определить critical если дней до 0 <= leadTime", () => {
      expect(service.determineUrgency(3, leadTime)).toBe("critical");
      expect(service.determineUrgency(7, leadTime)).toBe("critical");
    });

    it("должен определить warning если дней до 0 <= leadTime * 1.5", () => {
      expect(service.determineUrgency(8, leadTime)).toBe("warning");
      expect(service.determineUrgency(10, leadTime)).toBe("warning");
    });

    it("должен определить normal если дней до 0 > leadTime * 1.5", () => {
      expect(service.determineUrgency(11, leadTime)).toBe("normal");
      expect(service.determineUrgency(30, leadTime)).toBe("normal");
    });

    it("должен обработать граничные значения", () => {
      // leadTime * 1.5 = 10.5, так что 10 = warning, 11 = normal
      expect(service.determineUrgency(10, leadTime)).toBe("warning");
      expect(service.determineUrgency(11, leadTime)).toBe("normal");
    });
  });
});
