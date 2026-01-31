/**
 * Unit-тесты для BarcodeService
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  BarcodeService,
  type BarcodeResult,
  type BarcodeFormat,
} from "~/server/services/barcode";

describe("BarcodeService", () => {
  let service: BarcodeService;

  beforeEach(() => {
    service = new BarcodeService();
  });

  describe("constructor", () => {
    it("должен создаваться с дефолтной конфигурацией", () => {
      const config = service.getConfig();

      expect(config.formats).toEqual(["ean_13", "code_128", "code_39"]);
      expect(config.multiple).toBe(false);
    });

    it("должен принимать кастомную конфигурацию", () => {
      const customService = new BarcodeService({
        formats: ["ean_13", "ean_8"],
        multiple: true,
      });
      const config = customService.getConfig();

      expect(config.formats).toEqual(["ean_13", "ean_8"]);
      expect(config.multiple).toBe(true);
    });
  });

  describe("configure", () => {
    it("должен обновлять конфигурацию", () => {
      service.configure({ multiple: true });
      const config = service.getConfig();

      expect(config.multiple).toBe(true);
      expect(config.formats).toEqual(["ean_13", "code_128", "code_39"]);
    });

    it("должен частично обновлять конфигурацию", () => {
      service.configure({ formats: ["upc_a"] });
      const config = service.getConfig();

      expect(config.formats).toEqual(["upc_a"]);
      expect(config.multiple).toBe(false);
    });
  });

  describe("validateEAN13", () => {
    it("должен валидировать корректный EAN-13", () => {
      // Валидные EAN-13 коды
      expect(service.validateEAN13("4607001234567")).toBe(false); // Этот код невалидный (контрольная сумма)
      expect(service.validateEAN13("5901234123457")).toBe(true); // Валидный EAN-13
      expect(service.validateEAN13("0012345678905")).toBe(true); // Валидный EAN-13
    });

    it("должен отклонять невалидный EAN-13", () => {
      // Неправильная контрольная сумма
      expect(service.validateEAN13("5901234123458")).toBe(false);
      expect(service.validateEAN13("0012345678901")).toBe(false);
    });

    it("должен отклонять неправильную длину", () => {
      expect(service.validateEAN13("123456789")).toBe(false); // Слишком короткий
      expect(service.validateEAN13("12345678901234")).toBe(false); // Слишком длинный
      expect(service.validateEAN13("")).toBe(false); // Пустой
    });

    it("должен отклонять нечисловые символы", () => {
      expect(service.validateEAN13("590123412345A")).toBe(false);
      expect(service.validateEAN13("590123412345!")).toBe(false);
      expect(service.validateEAN13("abcdefghijklm")).toBe(false);
    });
  });

  describe("recognize (интеграционный)", () => {
    // Примечание: этот тест требует реального изображения
    // В unit-тестах мокаем или пропускаем

    it("должен возвращать null для пустого изображения", async () => {
      // Минимальное белое изображение 1x1 пиксель (PNG base64)
      const emptyImageBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const result = await service.recognize(emptyImageBase64);

      expect(result).toBeNull();
    });
  });

  describe("типы BarcodeFormat", () => {
    it("должен поддерживать все форматы", () => {
      const formats: BarcodeFormat[] = [
        "ean_13",
        "ean_8",
        "code_128",
        "code_39",
        "upc_a",
        "upc_e",
        "unknown",
      ];

      formats.forEach((format) => {
        expect(typeof format).toBe("string");
      });
    });
  });

  describe("BarcodeResult", () => {
    it("должен соответствовать интерфейсу", () => {
      const result: BarcodeResult = {
        code: "5901234123457",
        format: "ean_13",
        confidence: 95,
      };

      expect(result.code).toBe("5901234123457");
      expect(result.format).toBe("ean_13");
      expect(result.confidence).toBe(95);
    });
  });
});
