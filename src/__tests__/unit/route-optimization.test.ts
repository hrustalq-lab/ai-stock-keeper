/**
 * Unit-тесты для RouteOptimizationService
 * Тестируем алгоритмы оптимизации маршрутов
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  routeOptimizationService,
  type PickItem,
  type Location,
} from "~/server/services/route-optimization";

// Хелпер для создания тестовых элементов
function createPickItem(
  sku: string,
  zone: string,
  aisle: number,
  shelf: number,
  coordX?: number,
  coordY?: number
): PickItem {
  return {
    sku,
    productName: `Product ${sku}`,
    quantity: 1,
    location: {
      code: `${zone}-${String(aisle).padStart(2, "0")}-${String(shelf).padStart(2, "0")}`,
      zone,
      aisle,
      shelf,
      coordX,
      coordY,
    },
  };
}

describe("RouteOptimizationService", () => {
  describe("calculateDistance", () => {
    it("должен использовать Euclidean distance при наличии координат", () => {
      const from: Location = { code: "A-01-01", zone: "A", aisle: 1, shelf: 1, coordX: 0, coordY: 0 };
      const to: Location = { code: "A-01-02", zone: "A", aisle: 1, shelf: 2, coordX: 3, coordY: 4 };

      const distance = routeOptimizationService.calculateDistance(from, to);
      // sqrt(3² + 4²) = 5
      expect(distance).toBe(5);
    });

    it("должен использовать Manhattan distance без координат", () => {
      const from: Location = { code: "A-01-01", zone: "A", aisle: 1, shelf: 1 };
      const to: Location = { code: "B-02-03", zone: "B", aisle: 2, shelf: 3 };

      const distance = routeOptimizationService.calculateDistance(from, to);
      // zone: |A-B| * 10 = 10, aisle: |1-2| * 3 = 3, shelf: |1-3| * 0.5 = 1
      expect(distance).toBe(10 + 3 + 1);
    });

    it("должен возвращать 0 для одинаковых локаций", () => {
      const loc: Location = { code: "A-01-01", zone: "A", aisle: 1, shelf: 1 };
      expect(routeOptimizationService.calculateDistance(loc, loc)).toBe(0);
    });

    it("должен корректно обрабатывать смежные зоны", () => {
      const from: Location = { code: "A-01-01", zone: "A", aisle: 1, shelf: 1 };
      const to: Location = { code: "C-01-01", zone: "C", aisle: 1, shelf: 1 };

      const distance = routeOptimizationService.calculateDistance(from, to);
      // |A-C| = 2, * 10 = 20
      expect(distance).toBe(20);
    });
  });

  describe("nearestNeighbor", () => {
    it("должен возвращать пустой массив для пустого ввода", () => {
      const result = routeOptimizationService.nearestNeighbor([]);
      expect(result).toEqual([]);
    });

    it("должен возвращать тот же элемент для одного ввода", () => {
      const item = createPickItem("SKU1", "A", 1, 1);
      const result = routeOptimizationService.nearestNeighbor([item]);
      expect(result).toHaveLength(1);
      expect(result[0]?.sku).toBe("SKU1");
    });

    it("должен оптимизировать порядок для близких элементов", () => {
      const items = [
        createPickItem("SKU3", "A", 3, 1), // Дальше от старта
        createPickItem("SKU1", "A", 1, 1), // Ближе к старту
        createPickItem("SKU2", "A", 2, 1), // Средний
      ];

      const start: Location = { code: "START", zone: "A", aisle: 0, shelf: 0 };
      const result = routeOptimizationService.nearestNeighbor(items, start);

      // SKU1 ближе к старту, затем SKU2, затем SKU3
      expect(result.map((r) => r.sku)).toEqual(["SKU1", "SKU2", "SKU3"]);
    });

    it("должен группировать элементы по близости", () => {
      const items = [
        createPickItem("SKU1", "A", 1, 1),
        createPickItem("SKU2", "C", 1, 1), // Далеко
        createPickItem("SKU3", "A", 1, 2), // Рядом с SKU1
      ];

      const result = routeOptimizationService.nearestNeighbor(items);

      // Без start начинаем с первого, SKU3 ближе к SKU1, чем SKU2
      const order = result.map((r) => r.sku);
      const sku1Idx = order.indexOf("SKU1");
      const sku3Idx = order.indexOf("SKU3");
      // SKU1 и SKU3 должны быть рядом
      expect(Math.abs(sku1Idx - sku3Idx)).toBe(1);
    });
  });

  describe("zoneBased", () => {
    it("должен возвращать пустой массив для пустого ввода", () => {
      const result = routeOptimizationService.zoneBased([]);
      expect(result).toEqual([]);
    });

    it("должен сортировать по зонам", () => {
      const items = [
        createPickItem("SKU3", "C", 1, 1),
        createPickItem("SKU1", "A", 1, 1),
        createPickItem("SKU2", "B", 1, 1),
      ];

      const result = routeOptimizationService.zoneBased(items);

      // Должны быть в порядке A -> B -> C
      expect(result.map((r) => r.location.zone)).toEqual(["A", "B", "C"]);
    });

    it("должен применять NN внутри каждой зоны", () => {
      const items = [
        createPickItem("SKU_A3", "A", 3, 1),
        createPickItem("SKU_A1", "A", 1, 1),
        createPickItem("SKU_B1", "B", 1, 1),
        createPickItem("SKU_A2", "A", 2, 1),
      ];

      const result = routeOptimizationService.zoneBased(items);

      // В зоне A должны быть по порядку: A1, A2, A3
      const zoneA = result.filter((r) => r.location.zone === "A");
      expect(zoneA.map((r) => r.sku)).toEqual(["SKU_A1", "SKU_A2", "SKU_A3"]);
    });

    it("должен учитывать начальную точку для порядка зон", () => {
      const items = [
        createPickItem("SKU_A", "A", 1, 1),
        createPickItem("SKU_B", "B", 1, 1),
        createPickItem("SKU_C", "C", 1, 1),
      ];

      const start: Location = { code: "START", zone: "B", aisle: 1, shelf: 1 };
      const result = routeOptimizationService.zoneBased(items, start);

      // Начинаем с зоны B
      expect(result[0]?.location.zone).toBe("B");
    });
  });

  describe("optimize", () => {
    it("должен возвращать пустой результат для пустого ввода", () => {
      const result = routeOptimizationService.optimize([]);

      expect(result.items).toEqual([]);
      expect(result.totalDistance).toBe(0);
      expect(result.estimatedMins).toBe(0);
    });

    it("должен использовать nearest_neighbor по умолчанию", () => {
      const items = [createPickItem("SKU1", "A", 1, 1)];
      const result = routeOptimizationService.optimize(items);

      expect(result.algorithm).toBe("nearest_neighbor");
    });

    it("должен использовать zone_based при указании", () => {
      const items = [
        createPickItem("SKU1", "A", 1, 1),
        createPickItem("SKU2", "B", 1, 1),
      ];
      const result = routeOptimizationService.optimize(items, {
        algorithm: "zone_based",
      });

      expect(result.algorithm).toBe("zone_based");
    });

    it("должен вычислять общее расстояние", () => {
      const items = [
        createPickItem("SKU1", "A", 1, 1),
        createPickItem("SKU2", "A", 2, 1),
      ];

      const result = routeOptimizationService.optimize(items);

      // Расстояние между aisle 1 и 2 = 3м
      expect(result.totalDistance).toBe(3);
    });

    it("должен оценивать время сборки", () => {
      const items = [
        createPickItem("SKU1", "A", 1, 1),
        createPickItem("SKU2", "A", 1, 2),
      ];

      const result = routeOptimizationService.optimize(items, {
        walkingSpeedMps: 1.0,
        pickTimeSeconds: 10,
      });

      // Расстояние: 0.5м, время ходьбы: 0.5сек
      // 2 уникальные локации * 10сек = 20сек
      // Итого: ~20.5сек ≈ 0.3 мин
      expect(result.estimatedMins).toBeGreaterThan(0);
      expect(result.estimatedMins).toBeLessThan(1);
    });

    it("должен учитывать начальную и конечную точки", () => {
      const items = [createPickItem("SKU1", "B", 1, 1)];
      const start: Location = { code: "ENTRY", zone: "A", aisle: 1, shelf: 1 };
      const end: Location = { code: "EXIT", zone: "C", aisle: 1, shelf: 1 };

      const result = routeOptimizationService.optimize(items, {
        startLocation: start,
        endLocation: end,
      });

      // A->B = 10м, B->C = 10м, итого 20м
      expect(result.totalDistance).toBe(20);
    });
  });

  describe("calculateTotalDistance", () => {
    it("должен суммировать расстояния между всеми точками", () => {
      const items = [
        createPickItem("SKU1", "A", 1, 1),
        createPickItem("SKU2", "A", 2, 1),
        createPickItem("SKU3", "A", 3, 1),
      ];

      const distance = routeOptimizationService.calculateTotalDistance(items);

      // A1->A2 = 3м, A2->A3 = 3м, итого 6м
      expect(distance).toBe(6);
    });

    it("должен добавлять расстояние от старта", () => {
      const items = [createPickItem("SKU1", "A", 2, 1)];
      const start: Location = { code: "START", zone: "A", aisle: 1, shelf: 1 };

      const distance = routeOptimizationService.calculateTotalDistance(
        items,
        start
      );

      // START->A2 = 3м
      expect(distance).toBe(3);
    });

    it("должен добавлять расстояние до конца", () => {
      const items = [createPickItem("SKU1", "A", 2, 1)];
      const end: Location = { code: "END", zone: "A", aisle: 3, shelf: 1 };

      const distance = routeOptimizationService.calculateTotalDistance(
        items,
        undefined,
        end
      );

      // A2->END = 3м
      expect(distance).toBe(3);
    });
  });

  describe("buildDistanceMatrix", () => {
    it("должен строить симметричную матрицу", () => {
      const locations: Location[] = [
        { code: "A", zone: "A", aisle: 1, shelf: 1 },
        { code: "B", zone: "A", aisle: 2, shelf: 1 },
        { code: "C", zone: "A", aisle: 3, shelf: 1 },
      ];

      const matrix = routeOptimizationService.buildDistanceMatrix(locations);

      expect(matrix).toHaveLength(3);
      // Диагональ должна быть 0
      expect(matrix[0]![0]).toBe(0);
      expect(matrix[1]![1]).toBe(0);
      expect(matrix[2]![2]).toBe(0);
      // Симметрия
      expect(matrix[0]![1]).toBe(matrix[1]![0]);
      expect(matrix[0]![2]).toBe(matrix[2]![0]);
      expect(matrix[1]![2]).toBe(matrix[2]![1]);
    });
  });

  describe("estimatePickingTime", () => {
    it("должен учитывать скорость ходьбы", () => {
      const route = {
        items: [createPickItem("SKU1", "A", 1, 1)],
        totalDistance: 60, // 60 метров
        estimatedMins: 0,
        algorithm: "nearest_neighbor",
      };

      // Скорость 1 м/сек = 60 сек на 60м + время на pick
      const time = routeOptimizationService.estimatePickingTime(route, {
        walkingSpeedMps: 1.0,
        pickTimeSeconds: 0,
      });

      expect(time).toBe(1); // 60 сек = 1 мин
    });

    it("должен учитывать время на pick", () => {
      const route = {
        items: [
          createPickItem("SKU1", "A", 1, 1),
          createPickItem("SKU2", "A", 1, 2),
        ],
        totalDistance: 0,
        estimatedMins: 0,
        algorithm: "nearest_neighbor",
      };

      // 2 локации * 30 сек = 60 сек
      const time = routeOptimizationService.estimatePickingTime(route, {
        walkingSpeedMps: 1.0,
        pickTimeSeconds: 30,
      });

      expect(time).toBe(1); // 60 сек = 1 мин
    });
  });
});
