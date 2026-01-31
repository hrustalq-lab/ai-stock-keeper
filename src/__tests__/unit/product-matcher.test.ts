/**
 * Unit-тесты для ProductMatcherService
 * Тестируем только чистые методы без зависимости от БД
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  ProductMatcherService,
  type MatchResult,
  type MatcherConfig,
} from "~/server/services/product-matcher";

describe("ProductMatcherService", () => {
  let service: ProductMatcherService;

  beforeEach(() => {
    service = new ProductMatcherService();
  });

  describe("constructor", () => {
    it("должен создаваться с дефолтной конфигурацией", () => {
      const config = service.getConfig();

      expect(config.threshold).toBe(0.4);
      expect(config.limit).toBe(10);
      expect(config.includeScore).toBe(true);
      expect(config.minMatchCharLength).toBe(2);
    });

    it("должен принимать кастомную конфигурацию", () => {
      const customService = new ProductMatcherService({
        threshold: 0.3,
        limit: 5,
      });
      const config = customService.getConfig();

      expect(config.threshold).toBe(0.3);
      expect(config.limit).toBe(5);
    });
  });

  describe("configure", () => {
    it("должен обновлять конфигурацию", () => {
      service.configure({ threshold: 0.2 });
      const config = service.getConfig();

      expect(config.threshold).toBe(0.2);
      expect(config.limit).toBe(10);
    });

    it("должен частично обновлять конфигурацию", () => {
      service.configure({ limit: 5 });
      const config = service.getConfig();

      expect(config.threshold).toBe(0.4);
      expect(config.limit).toBe(5);
    });
  });

  describe("getStats", () => {
    it("должен возвращать начальную статистику", () => {
      const stats = service.getStats();

      expect(stats.productCount).toBe(0);
      expect(stats.lastRefresh).toBeNull();
      expect(stats.isInitialized).toBe(false);
    });
  });

  describe("invalidateIndex", () => {
    it("должен сбрасывать индекс", () => {
      service.invalidateIndex();

      const stats = service.getStats();
      expect(stats.isInitialized).toBe(false);
      expect(stats.productCount).toBe(0);
      expect(stats.lastRefresh).toBeNull();
    });
  });

  // Примечание: тесты search, findBySku, multiFieldSearch требуют подключения к БД
  // и вынесены в integration-тесты

  describe("типы MatchResult", () => {
    it("должен соответствовать интерфейсу", () => {
      const result: MatchResult = {
        item: {
          id: 1,
          sku: "SKU-001",
          name: "Товар",
          quantity: 100,
          warehouse: "main",
          supplier: "Поставщик",
        },
        score: 0.1,
        confidence: 90,
      };

      expect(result.item.sku).toBe("SKU-001");
      expect(result.item.name).toBe("Товар");
      expect(result.item.quantity).toBe(100);
      expect(result.item.warehouse).toBe("main");
      expect(result.item.supplier).toBe("Поставщик");
      expect(result.score).toBe(0.1);
      expect(result.confidence).toBe(90);
    });

    it("должен допускать отсутствие supplier", () => {
      const result: MatchResult = {
        item: {
          id: 2,
          sku: "SKU-002",
          name: "Товар 2",
          quantity: 50,
          warehouse: "reserve",
        },
        score: 0,
        confidence: 100,
      };

      expect(result.item.supplier).toBeUndefined();
    });
  });

  describe("типы MatcherConfig", () => {
    it("должен соответствовать интерфейсу", () => {
      const config: MatcherConfig = {
        threshold: 0.3,
        limit: 5,
        includeScore: true,
        minMatchCharLength: 3,
      };

      expect(config.threshold).toBe(0.3);
      expect(config.limit).toBe(5);
      expect(config.includeScore).toBe(true);
      expect(config.minMatchCharLength).toBe(3);
    });

    it("должен допускать частичную конфигурацию", () => {
      const partialConfig: MatcherConfig = {
        threshold: 0.5,
      };

      expect(partialConfig.threshold).toBe(0.5);
      expect(partialConfig.limit).toBeUndefined();
      expect(partialConfig.includeScore).toBeUndefined();
    });

    it("должен допускать пустую конфигурацию", () => {
      const emptyConfig: MatcherConfig = {};

      expect(emptyConfig.threshold).toBeUndefined();
      expect(emptyConfig.limit).toBeUndefined();
    });
  });

  describe("конфигурация threshold", () => {
    it("должен принимать строгий порог (0.1)", () => {
      const strictService = new ProductMatcherService({ threshold: 0.1 });
      expect(strictService.getConfig().threshold).toBe(0.1);
    });

    it("должен принимать мягкий порог (0.6)", () => {
      const lenientService = new ProductMatcherService({ threshold: 0.6 });
      expect(lenientService.getConfig().threshold).toBe(0.6);
    });

    it("должен менять порог через configure", () => {
      service.configure({ threshold: 0.25 });
      expect(service.getConfig().threshold).toBe(0.25);
    });
  });

  describe("конфигурация limit", () => {
    it("должен принимать разные лимиты", () => {
      const configs = [1, 5, 10, 50, 100];

      configs.forEach((limit) => {
        const s = new ProductMatcherService({ limit });
        expect(s.getConfig().limit).toBe(limit);
      });
    });
  });
});
