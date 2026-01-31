/**
 * Integration-тесты для Intake Router
 * Тестируем полный flow приёмки товаров с моками зависимостей
 *
 * Используем jest.unstable_mockModule для ESM модулей
 */

import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

// ============================================
// Типы для моков
// ============================================
type MockedPrismaInventory = {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  supplier: string | null;
  reorderPoint: number;
  syncedAt: Date;
  last1CUpdate: Date | null;
};

type MockedPrismaDocument = {
  id: number;
  type: string;
  docNumber: string;
  docDate: Date | null;
  warehouse: string | null;
  status: string | null;
  syncAttempt: number;
  lastSyncError: string | null;
  syncedAt: Date | null;
  createdAt: Date;
};

type MockedPrismaTransaction = {
  id: number;
  type: string;
  sku: string;
  quantity: number;
  fromWarehouse: string | null;
  toWarehouse: string | null;
  documentId: string | null;
  syncedWith1C: boolean;
  syncedAt: Date | null;
  createdAt: Date;
};

// ============================================
// Тестовые данные
// ============================================
const mockInventory: MockedPrismaInventory[] = [
  {
    id: 1,
    sku: "BOLT-M8X30",
    name: "Болт М8x30 оцинкованный",
    quantity: 500,
    warehouse: "main",
    supplier: "ООО Метиз",
    reorderPoint: 100,
    syncedAt: new Date(),
    last1CUpdate: new Date(),
  },
  {
    id: 2,
    sku: "NUT-M8",
    name: "Гайка М8 оцинкованная",
    quantity: 1000,
    warehouse: "main",
    supplier: "ООО Метиз",
    reorderPoint: 200,
    syncedAt: new Date(),
    last1CUpdate: new Date(),
  },
  {
    id: 3,
    sku: "WASHER-8",
    name: "Шайба плоская 8мм",
    quantity: 2000,
    warehouse: "reserve",
    supplier: null,
    reorderPoint: 500,
    syncedAt: new Date(),
    last1CUpdate: new Date(),
  },
];

const mockDocuments: MockedPrismaDocument[] = [];
const mockTransactions: MockedPrismaTransaction[] = [];
const mockAuditLogs: Array<{
  id: number;
  action: string;
  tableName: string | null;
  recordId: string | null;
  newValue: unknown;
}> = [];

// ============================================
// Создаём моки ДО импорта модулей
// ============================================

// Mock 1C Client
const mockOneCResponse = {
  success: true,
  documentId: "DOC-12345",
  docNumber: "ПН-001",
  status: "posted",
};

jest.unstable_mockModule("~/server/services/one-c-client", () => ({
  oneCClient: {
    createGoodsReceipt: jest.fn(() => Promise.resolve(mockOneCResponse)),
  },
}));

// Mock Barcode Service
jest.unstable_mockModule("~/server/services/barcode", () => ({
  barcodeService: {
    recognize: jest.fn((imageBase64: string) => {
      if (imageBase64.includes("empty") || imageBase64.length < 50) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        code: "4607001234567",
        format: "ean_13" as const,
        confidence: 95,
      });
    }),
    validateEAN13: jest.fn((code: string) => {
      if (code.length !== 13 || !/^\d+$/.test(code)) {
        return false;
      }
      return true;
    }),
  },
}));

// Mock OCR Service
jest.unstable_mockModule("~/server/services/ocr", () => ({
  ocrService: {
    recognizeAndExtract: jest.fn((imageBase64: string) => {
      if (imageBase64.includes("empty")) {
        return Promise.resolve({
          ocr: { text: "", confidence: 0, words: [] },
          extracted: {},
        });
      }
      return Promise.resolve({
        ocr: {
          text: "Артикул: BOLT-M8X30\nНаименование: Болт М8x30\nКоличество: 100 шт",
          confidence: 92,
          words: [
            {
              text: "Артикул:",
              confidence: 95,
              bbox: { x0: 0, y0: 0, x1: 50, y1: 20 },
            },
            {
              text: "BOLT-M8X30",
              confidence: 98,
              bbox: { x0: 60, y0: 0, x1: 150, y1: 20 },
            },
          ],
        },
        extracted: {
          sku: "BOLT-M8X30",
          name: "Болт М8x30",
          quantity: 100,
        },
      });
    }),
  },
}));

// Mock Product Matcher
jest.unstable_mockModule("~/server/services/product-matcher", () => ({
  productMatcher: {
    multiFieldSearch: jest.fn(
      (params: { sku?: string; name?: string; barcode?: string }) => {
        const results = mockInventory
          .filter((item) => {
            if (params.sku && item.sku.includes(params.sku)) return true;
            if (
              params.name &&
              item.name.toLowerCase().includes(params.name.toLowerCase())
            )
              return true;
            return false;
          })
          .map((item) => ({
            item: {
              id: item.id,
              sku: item.sku,
              name: item.name,
              quantity: item.quantity,
              warehouse: item.warehouse,
              supplier: item.supplier,
            },
            score: 0.1,
            confidence: 95,
          }));

        return Promise.resolve(results);
      }
    ),
  },
}));

// Mock DB
jest.unstable_mockModule("~/server/db", () => ({
  db: {
    inventory: {
      findMany: jest.fn((args?: { where?: { id?: { in?: number[] } } }) => {
        if (args?.where?.id?.in) {
          return Promise.resolve(
            mockInventory.filter((i) => args.where!.id!.in!.includes(i.id))
          );
        }
        return Promise.resolve(mockInventory);
      }),
      update: jest.fn(
        (args: {
          where: { id: number };
          data: { quantity: { increment: number } };
        }) => {
          const item = mockInventory.find((i) => i.id === args.where.id);
          if (item) {
            item.quantity += args.data.quantity.increment;
          }
          return Promise.resolve(item);
        }
      ),
    },
    document1C: {
      create: jest.fn((args: { data: Partial<MockedPrismaDocument> }) => {
        const doc: MockedPrismaDocument = {
          id: mockDocuments.length + 1,
          type: args.data.type ?? "",
          docNumber: args.data.docNumber ?? "",
          docDate: args.data.docDate ?? null,
          warehouse: args.data.warehouse ?? null,
          status: args.data.status ?? null,
          syncAttempt: 0,
          lastSyncError: null,
          syncedAt: null,
          createdAt: new Date(),
        };
        mockDocuments.push(doc);
        return Promise.resolve(doc);
      }),
      findMany: jest.fn(() => Promise.resolve(mockDocuments)),
      findFirst: jest.fn(() =>
        Promise.resolve(mockDocuments[mockDocuments.length - 1] ?? null)
      ),
      count: jest.fn(() => Promise.resolve(mockDocuments.length)),
    },
    transaction: {
      create: jest.fn((args: { data: Partial<MockedPrismaTransaction> }) => {
        const tx: MockedPrismaTransaction = {
          id: mockTransactions.length + 1,
          type: args.data.type ?? "",
          sku: args.data.sku ?? "",
          quantity: args.data.quantity ?? 0,
          fromWarehouse: args.data.fromWarehouse ?? null,
          toWarehouse: args.data.toWarehouse ?? null,
          documentId: args.data.documentId ?? null,
          syncedWith1C: args.data.syncedWith1C ?? false,
          syncedAt: args.data.syncedAt ?? null,
          createdAt: new Date(),
        };
        mockTransactions.push(tx);
        return Promise.resolve(tx);
      }),
      findMany: jest.fn(() => Promise.resolve(mockTransactions)),
      aggregate: jest.fn(() =>
        Promise.resolve({
          _sum: {
            quantity: mockTransactions.reduce((sum, t) => sum + t.quantity, 0),
          },
          _count: mockTransactions.length,
        })
      ),
    },
    auditLog: {
      create: jest.fn(
        (args: {
          data: {
            action: string;
            tableName?: string;
            recordId?: string;
            newValue?: unknown;
          };
        }) => {
          const log = {
            id: mockAuditLogs.length + 1,
            action: args.data.action,
            tableName: args.data.tableName ?? null,
            recordId: args.data.recordId ?? null,
            newValue: args.data.newValue,
          };
          mockAuditLogs.push(log);
          return Promise.resolve(log);
        }
      ),
    },
  },
}));

// ============================================
// Импортируем модули ПОСЛЕ создания моков
// ============================================
const { intakeRouter } = await import("~/server/api/routers/intake");
const { createCallerFactory } = await import("~/server/api/trpc");

// Создаём caller для тестирования
const createCaller = createCallerFactory(intakeRouter);

// ============================================
// Тесты
// ============================================
describe("Intake Router Integration Tests", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    // Очищаем моковые данные перед каждым тестом
    mockDocuments.length = 0;
    mockTransactions.length = 0;
    mockAuditLogs.length = 0;

    // Восстанавливаем начальные количества inventory
    mockInventory[0]!.quantity = 500;
    mockInventory[1]!.quantity = 1000;
    mockInventory[2]!.quantity = 2000;

    // Создаём новый caller с минимальным контекстом
    caller = createCaller({ headers: new Headers() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // recognizeBarcode тесты
  // ============================================
  describe("recognizeBarcode", () => {
    it("должен успешно распознать штрих-код из изображения", async () => {
      // imageBase64 должен быть > 50 символов для успешного распознавания в моке
      const result = await caller.recognizeBarcode({
        imageBase64: "valid_image_base64_content_long_enough_for_barcode_recognition_test",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.code).toBe("4607001234567");
      expect(result.data?.format).toBe("ean_13");
      expect(result.data?.confidence).toBe(95);
      expect(result.data?.isValidEAN).toBe(true);
      expect(result.elapsed).toBeDefined();
    });

    it("должен возвращать ошибку для пустого изображения", async () => {
      const result = await caller.recognizeBarcode({
        imageBase64: "empty",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Штрих-код не найден на изображении");
    });
  });

  // ============================================
  // recognizeOCR тесты
  // ============================================
  describe("recognizeOCR", () => {
    it("должен успешно распознать текст из изображения", async () => {
      const result = await caller.recognizeOCR({
        imageBase64: "valid_image_content",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.text).toContain("BOLT-M8X30");
      expect(result.data?.confidence).toBe(92);
      expect(result.data?.extracted.sku).toBe("BOLT-M8X30");
      expect(result.data?.extracted.quantity).toBe(100);
    });

    it("должен принимать параметр language", async () => {
      const result = await caller.recognizeOCR({
        imageBase64: "valid_image_content",
        language: "rus+eng",
      });

      expect(result.success).toBe(true);
    });

    it("должен возвращать пустые данные для пустого изображения", async () => {
      const result = await caller.recognizeOCR({
        imageBase64: "empty",
      });

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBe(0);
    });
  });

  // ============================================
  // matchProduct тесты
  // ============================================
  describe("matchProduct", () => {
    it("должен найти товар по SKU", async () => {
      const result = await caller.matchProduct({
        sku: "BOLT",
      });

      expect(result.success).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0]?.sku).toBe("BOLT-M8X30");
    });

    it("должен найти товар по названию", async () => {
      const result = await caller.matchProduct({
        name: "Болт",
      });

      expect(result.success).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it("должен возвращать ошибку без параметров поиска", async () => {
      const result = await caller.matchProduct({});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Укажите хотя бы один параметр");
    });

    it("должен возвращать пустой массив для несуществующего товара", async () => {
      const result = await caller.matchProduct({
        sku: "NONEXISTENT",
      });

      expect(result.success).toBe(true);
      expect(result.matches).toHaveLength(0);
    });
  });

  // ============================================
  // createReceipt тесты
  // ============================================
  describe("createReceipt", () => {
    it("должен успешно создать приёмку товаров", async () => {
      const result = await caller.createReceipt({
        items: [
          { inventoryId: 1, quantity: 50, unitPrice: 10.5 },
          { inventoryId: 2, quantity: 100 },
        ],
        warehouse: "main",
        supplier: "ООО Поставщик",
        notes: "Тестовая приёмка",
        ocrConfidence: 92,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.documentId).toBe("DOC-12345");
      expect(result.data?.docNumber).toBe("ПН-001");
      expect(result.data?.status).toBe("posted");
      expect(result.data?.itemsCount).toBe(2);
      expect(result.data?.totalQuantity).toBe(150);

      // Проверяем что документ создан
      expect(mockDocuments.length).toBe(1);
      expect(mockDocuments[0]?.type).toBe("GoodsReceipt");

      // Проверяем что транзакции созданы
      expect(mockTransactions.length).toBe(2);

      // Проверяем audit log
      expect(mockAuditLogs.length).toBe(1);
      expect(mockAuditLogs[0]?.action).toBe("intake_receipt_created");
    });

    it("должен возвращать ошибку для несуществующего товара", async () => {
      const result = await caller.createReceipt({
        items: [{ inventoryId: 999, quantity: 50 }],
        warehouse: "main",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Товары не найдены: 999");
    });

    it("должен обновить количество в inventory", async () => {
      const initialQty = mockInventory[0]!.quantity;

      await caller.createReceipt({
        items: [{ inventoryId: 1, quantity: 100 }],
        warehouse: "main",
      });

      // Количество должно увеличиться
      expect(mockInventory[0]!.quantity).toBe(initialQty + 100);
    });
  });

  // ============================================
  // getHistory тесты
  // ============================================
  describe("getHistory", () => {
    it("должен возвращать пустую историю", async () => {
      const result = await caller.getHistory();

      expect(result.success).toBe(true);
      expect(result.data?.receipts).toHaveLength(0);
      expect(result.data?.totalCount).toBe(0);
    });

    it("должен возвращать историю после создания приёмки", async () => {
      // Создаём приёмку
      await caller.createReceipt({
        items: [{ inventoryId: 1, quantity: 50 }],
        warehouse: "main",
      });

      const result = await caller.getHistory();

      expect(result.success).toBe(true);
      expect(result.data?.totalCount).toBe(1);
    });

    it("должен поддерживать пагинацию", async () => {
      const result = await caller.getHistory({
        limit: 10,
        offset: 0,
      });

      expect(result.success).toBe(true);
    });

    it("должен фильтровать по складу", async () => {
      const result = await caller.getHistory({
        warehouse: "main",
      });

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // getStats тесты
  // ============================================
  describe("getStats", () => {
    it("должен возвращать статистику за период", async () => {
      const result = await caller.getStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.periodDays).toBe(30);
    });

    it("должен принимать параметр days", async () => {
      const result = await caller.getStats({
        days: 7,
      });

      expect(result.success).toBe(true);
      expect(result.data?.periodDays).toBe(7);
    });

    it("должен обновлять статистику после создания приёмки", async () => {
      // Получаем начальную статистику
      const initialStats = await caller.getStats();

      // Создаём приёмку
      await caller.createReceipt({
        items: [{ inventoryId: 1, quantity: 100 }],
        warehouse: "main",
      });

      // Проверяем обновлённую статистику
      const updatedStats = await caller.getStats();

      expect(updatedStats.success).toBe(true);
      // Количество приёмок должно увеличиться
      expect(updatedStats.data?.receiptsCount).toBeGreaterThanOrEqual(
        initialStats.data?.receiptsCount ?? 0
      );
    });
  });

  // ============================================
  // Full Intake Flow тест (E2E-like)
  // ============================================
  describe("Full Intake Flow", () => {
    it("должен выполнить полный flow приёмки: scan → match → create", async () => {
      // Шаг 1: Распознаём штрих-код
      // imageBase64 должен быть > 50 символов для успешного распознавания
      const barcodeResult = await caller.recognizeBarcode({
        imageBase64: "valid_barcode_image_content_with_enough_length_for_recognition",
      });

      expect(barcodeResult.success).toBe(true);
      expect(barcodeResult.data?.code).toBe("4607001234567");

      // Шаг 2: Распознаём текст (OCR)
      const ocrResult = await caller.recognizeOCR({
        imageBase64: "invoice_image_content",
      });

      expect(ocrResult.success).toBe(true);
      expect(ocrResult.data?.extracted.sku).toBe("BOLT-M8X30");
      expect(ocrResult.data?.extracted.quantity).toBe(100);

      // Шаг 3: Ищем товар по SKU
      const matchResult = await caller.matchProduct({
        sku: ocrResult.data?.extracted.sku,
      });

      expect(matchResult.success).toBe(true);
      expect(matchResult.matches.length).toBeGreaterThan(0);

      const matchedProduct = matchResult.matches[0];
      expect(matchedProduct).toBeDefined();

      // Шаг 4: Создаём приёмку
      const receiptResult = await caller.createReceipt({
        items: [
          {
            inventoryId: matchedProduct!.id,
            quantity: ocrResult.data?.extracted.quantity ?? 0,
          },
        ],
        warehouse: matchedProduct!.warehouse,
        ocrConfidence: ocrResult.data?.confidence,
        barcodeConfidence: barcodeResult.data?.confidence,
      });

      expect(receiptResult.success).toBe(true);
      expect(receiptResult.data?.documentId).toBeDefined();

      // Шаг 5: Проверяем историю
      const historyResult = await caller.getHistory();

      expect(historyResult.success).toBe(true);
      expect(historyResult.data?.receipts.length).toBe(1);

      // Шаг 6: Проверяем статистику
      const statsResult = await caller.getStats();

      expect(statsResult.success).toBe(true);
      expect(statsResult.data?.receiptsCount).toBe(1);
    });
  });

  // ============================================
  // Edge cases и Error handling
  // ============================================
  describe("Error Handling", () => {
    it("должен обрабатывать пустой imageBase64", async () => {
      // Zod валидация должна отклонить пустую строку
      await expect(
        caller.recognizeBarcode({ imageBase64: "" })
      ).rejects.toThrow();
    });

    it("должен обрабатывать отрицательное количество", async () => {
      // Zod валидация должна отклонить отрицательное число
      await expect(
        caller.createReceipt({
          items: [{ inventoryId: 1, quantity: -10 }],
          warehouse: "main",
        })
      ).rejects.toThrow();
    });

    it("должен обрабатывать пустой массив items", async () => {
      // Zod валидация требует минимум 1 позицию
      await expect(
        caller.createReceipt({
          items: [],
          warehouse: "main",
        })
      ).rejects.toThrow();
    });
  });
});
