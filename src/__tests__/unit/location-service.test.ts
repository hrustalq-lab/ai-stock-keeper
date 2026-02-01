/**
 * Unit-тесты для LocationService - чистые функции
 */

import { describe, it, expect } from "@jest/globals";
import { locationService } from "~/server/services/location-service";

describe("LocationService - Pure Functions", () => {
  describe("parseLocationCode", () => {
    it("должен парсить корректный код локации", () => {
      const result = locationService.parseLocationCode("A-01-02");

      expect(result).toEqual({
        zone: "A",
        aisle: 1,
        shelf: 2,
      });
    });

    it("должен парсить код с большими числами", () => {
      const result = locationService.parseLocationCode("B-12-34");

      expect(result).toEqual({
        zone: "B",
        aisle: 12,
        shelf: 34,
      });
    });

    it("должен возвращать null для некорректного формата", () => {
      expect(locationService.parseLocationCode("invalid")).toBeNull();
      expect(locationService.parseLocationCode("AB-01-02")).toBeNull(); // Зона должна быть 1 буква
      expect(locationService.parseLocationCode("a-01-02")).toBeNull(); // Зона должна быть заглавной
      expect(locationService.parseLocationCode("")).toBeNull();
      expect(locationService.parseLocationCode("A--02")).toBeNull(); // Пропущен aisle
      expect(locationService.parseLocationCode("A-01-")).toBeNull(); // Пропущен shelf
    });

    it("должен обрабатывать граничные случаи", () => {
      expect(locationService.parseLocationCode("Z-99-99")).toEqual({
        zone: "Z",
        aisle: 99,
        shelf: 99,
      });

      expect(locationService.parseLocationCode("A-00-00")).toEqual({
        zone: "A",
        aisle: 0,
        shelf: 0,
      });
    });
  });

  describe("generateLocationCode", () => {
    it("должен генерировать корректный код", () => {
      const code = locationService.generateLocationCode("A", 1, 2);
      expect(code).toBe("A-01-02");
    });

    it("должен добавлять ведущие нули", () => {
      const code = locationService.generateLocationCode("B", 5, 9);
      expect(code).toBe("B-05-09");
    });

    it("должен обрабатывать двузначные числа", () => {
      const code = locationService.generateLocationCode("C", 12, 34);
      expect(code).toBe("C-12-34");
    });

    it("должен быть обратим с parseLocationCode", () => {
      const original = { zone: "D", aisle: 7, shelf: 15 };
      const code = locationService.generateLocationCode(
        original.zone,
        original.aisle,
        original.shelf
      );
      const parsed = locationService.parseLocationCode(code);

      expect(parsed).toEqual(original);
    });
  });

  describe("calculateDistance", () => {
    it("должен использовать Euclidean distance при наличии координат", () => {
      const from = {
        zone: "A",
        aisle: 1,
        shelf: 1,
        coordX: 0,
        coordY: 0,
      };
      const to = {
        zone: "A",
        aisle: 1,
        shelf: 2,
        coordX: 3,
        coordY: 4,
      };

      const distance = locationService.calculateDistance(from, to);
      // sqrt(3² + 4²) = 5
      expect(distance).toBe(5);
    });

    it("должен использовать Manhattan distance без координат", () => {
      const from = {
        zone: "A",
        aisle: 1,
        shelf: 1,
      };
      const to = {
        zone: "B",
        aisle: 3,
        shelf: 5,
      };

      const distance = locationService.calculateDistance(from, to);
      // zone: 10, aisle: 2*3=6, shelf: 4*0.5=2
      expect(distance).toBe(10 + 6 + 2);
    });

    it("должен возвращать 0 для одинаковых локаций", () => {
      const loc = { zone: "A", aisle: 1, shelf: 1 };
      expect(locationService.calculateDistance(loc, loc)).toBe(0);
    });

    it("должен обрабатывать null координаты как отсутствующие", () => {
      const from = {
        zone: "A",
        aisle: 1,
        shelf: 1,
        coordX: null,
        coordY: null,
      };
      const to = {
        zone: "A",
        aisle: 2,
        shelf: 1,
        coordX: 10,
        coordY: 10,
      };

      const distance = locationService.calculateDistance(from, to);
      // Должен использовать Manhattan: 3м (один ряд)
      expect(distance).toBe(3);
    });

    it("должен корректно считать расстояние между зонами", () => {
      const from = { zone: "A", aisle: 1, shelf: 1 };
      const to = { zone: "D", aisle: 1, shelf: 1 };

      const distance = locationService.calculateDistance(from, to);
      // |D-A| = 3, * 10 = 30м
      expect(distance).toBe(30);
    });
  });
});
