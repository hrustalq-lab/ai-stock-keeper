/**
 * Unit-тесты для OCRService
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  OCRService,
  type OCRResult,
  type ExtractedProductData,
} from "~/server/services/ocr";

describe("OCRService", () => {
  let service: OCRService;

  beforeEach(() => {
    service = new OCRService();
  });

  describe("constructor", () => {
    it("должен создаваться с дефолтной конфигурацией", () => {
      const config = service.getConfig();

      expect(config.language).toBe("rus");
      expect(config.psm).toBe(3);
    });

    it("должен принимать кастомную конфигурацию", () => {
      const customService = new OCRService({
        language: "eng",
        psm: 6,
      });
      const config = customService.getConfig();

      expect(config.language).toBe("eng");
      expect(config.psm).toBe(6);
    });
  });

  describe("configure", () => {
    it("должен обновлять конфигурацию", () => {
      service.configure({ language: "rus+eng" });
      const config = service.getConfig();

      expect(config.language).toBe("rus+eng");
      expect(config.psm).toBe(3);
    });
  });

  describe("extractProductData", () => {
    it("должен извлекать SKU из текста", () => {
      const text = "Артикул: SKU-12345\nНаименование: Болт М8x30";
      const data = service.extractProductData(text);

      expect(data.sku).toBe("SKU-12345");
    });

    it("должен извлекать SKU в разных форматах", () => {
      const variants = [
        { text: "арт. ABC-123", expected: "ABC-123" },
        { text: "Артикул: XYZ789", expected: "XYZ789" },
        { text: "SKU: PROD-001", expected: "PROD-001" },
        { text: "код: TEST123", expected: "TEST123" },
      ];

      variants.forEach(({ text, expected }) => {
        const data = service.extractProductData(text);
        expect(data.sku).toBe(expected.toUpperCase());
      });
    });

    it("должен извлекать альтернативный формат SKU", () => {
      const text = "Товар: AB-12345 в наличии";
      const data = service.extractProductData(text);

      expect(data.sku).toBe("AB-12345");
    });

    it("должен извлекать количество", () => {
      const variants = [
        { text: "Количество: 100", expected: 100 },
        { text: "кол-во: 50", expected: 50 },
        { text: "25 шт.", expected: 25 },
        { text: "Принято 200 штук", expected: 200 },
      ];

      variants.forEach(({ text, expected }) => {
        const data = service.extractProductData(text);
        expect(data.quantity).toBe(expected);
      });
    });

    it("должен извлекать EAN-13 штрих-код", () => {
      const text = "Штрих-код: 5901234123457\nКоличество: 10";
      const data = service.extractProductData(text);

      expect(data.barcode).toBe("5901234123457");
    });

    it("должен извлекать название товара", () => {
      const text = "Наименование: Гайка М10 оцинкованная\nКол-во: 500";
      const data = service.extractProductData(text);

      expect(data.name).toBe("Гайка М10 оцинкованная");
    });

    it("должен извлекать название в разных форматах", () => {
      const variants = [
        {
          text: "Название: Шайба плоская 8мм",
          expected: "Шайба плоская 8мм",
        },
        { text: "Товар: Винт М6x20", expected: "Винт М6x20" },
      ];

      variants.forEach(({ text, expected }) => {
        const data = service.extractProductData(text);
        expect(data.name).toBe(expected);
      });
    });

    it("должен извлекать все данные из накладной", () => {
      const invoiceText = `
        НАКЛАДНАЯ №123
        Артикул: BOLT-M8X30
        Наименование: Болт М8x30 оцинкованный
        Количество: 500 шт
        Штрих-код: 4607001234567
      `;

      const data = service.extractProductData(invoiceText);

      expect(data.sku).toBe("BOLT-M8X30");
      expect(data.name).toBe("Болт М8x30 оцинкованный");
      expect(data.quantity).toBe(500);
      expect(data.barcode).toBe("4607001234567");
    });

    it("должен возвращать пустой объект для текста без данных", () => {
      const text = "Случайный текст без структуры";
      const data = service.extractProductData(text);

      expect(data.sku).toBeUndefined();
      expect(data.name).toBeUndefined();
      expect(data.quantity).toBeUndefined();
      expect(data.barcode).toBeUndefined();
    });
  });

  describe("preprocessText", () => {
    it("должен убирать множественные пробелы", () => {
      const result = service.preprocessText("текст   с    пробелами");
      expect(result).toBe("текст с пробелами");
    });

    it("должен нормализовать переносы строк Windows (CRLF -> LF)", () => {
      const result = service.preprocessText("строка1\r\nстрока2");
      expect(result).toBe("строка1\nстрока2");
    });

    it("должен нормализовать переносы строк Mac (CR -> LF)", () => {
      const result = service.preprocessText("строка1\rстрока2");
      expect(result).toBe("строка1\nстрока2");
    });

    it("должен убирать начальные и конечные пробелы", () => {
      const result = service.preprocessText("   текст   ");
      expect(result).toBe("текст");
    });

    it("должен исправлять типичные ошибки OCR", () => {
      // о0 -> 00
      expect(service.preprocessText("арт о0123")).toBe("арт 00123");
      // 0о -> 00
      expect(service.preprocessText("код 0о456")).toBe("код 00456");
    });
  });

  describe("типы OCRResult", () => {
    it("должен соответствовать интерфейсу", () => {
      const result: OCRResult = {
        text: "Распознанный текст",
        confidence: 85,
        words: [
          {
            text: "Распознанный",
            confidence: 90,
            bbox: { x0: 0, y0: 0, x1: 100, y1: 20 },
          },
        ],
      };

      expect(result.text).toBe("Распознанный текст");
      expect(result.confidence).toBe(85);
      expect(result.words).toHaveLength(1);
      expect(result.words[0]?.bbox.x0).toBe(0);
    });
  });

  describe("типы ExtractedProductData", () => {
    it("должен соответствовать интерфейсу", () => {
      const data: ExtractedProductData = {
        sku: "SKU-001",
        name: "Товар",
        quantity: 10,
        barcode: "1234567890123",
      };

      expect(data.sku).toBe("SKU-001");
      expect(data.name).toBe("Товар");
      expect(data.quantity).toBe(10);
      expect(data.barcode).toBe("1234567890123");
    });

    it("должен допускать частичные данные", () => {
      const partialData: ExtractedProductData = {
        sku: "SKU-002",
      };

      expect(partialData.sku).toBe("SKU-002");
      expect(partialData.name).toBeUndefined();
      expect(partialData.quantity).toBeUndefined();
    });
  });
});
