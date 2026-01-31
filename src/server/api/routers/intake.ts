/**
 * Intake Router — API для приёмки товаров с OCR и распознаванием штрих-кодов
 * Phase 2: Goods Intake with OCR
 */

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { db } from "~/server/db";
import { barcodeService } from "~/server/services/barcode";
import { ocrService } from "~/server/services/ocr";
import {
  productMatcher,
  type MatchResult,
} from "~/server/services/product-matcher";
import { oneCClient } from "~/server/services/one-c-client";

// ============================================
// Схемы валидации
// ============================================

const ImageInputSchema = z.object({
  imageBase64: z.string().min(1, "Изображение обязательно"),
});

const MatchProductSchema = z.object({
  sku: z.string().optional(),
  name: z.string().optional(),
  barcode: z.string().optional(),
});

const IntakeItemSchema = z.object({
  inventoryId: z.number().int().positive("ID товара обязателен"),
  quantity: z.number().int().positive("Количество должно быть положительным"),
  unitPrice: z.number().optional(),
});

const CreateReceiptSchema = z.object({
  items: z.array(IntakeItemSchema).min(1, "Минимум 1 позиция"),
  warehouse: z.string().min(1, "Склад обязателен"),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  ocrConfidence: z.number().optional(), // Средняя уверенность распознавания
  barcodeConfidence: z.number().optional(),
});

// ============================================
// Intake Router
// ============================================

export const intakeRouter = createTRPCRouter({
  /**
   * Распознать штрих-код из изображения
   */
  recognizeBarcode: publicProcedure
    .input(ImageInputSchema)
    .mutation(async ({ input }) => {
      const startTime = Date.now();

      try {
        const result = await barcodeService.recognize(input.imageBase64);
        const elapsed = Date.now() - startTime;

        if (!result) {
          return {
            success: false,
            error: "Штрих-код не найден на изображении",
            elapsed,
          };
        }

        // Валидируем EAN-13 если это EAN формат
        let isValidEAN = true;
        if (result.format === "ean_13") {
          isValidEAN = barcodeService.validateEAN13(result.code);
        }

        return {
          success: true,
          data: {
            code: result.code,
            format: result.format,
            confidence: result.confidence,
            isValidEAN,
          },
          elapsed,
        };
      } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error("[Intake] Ошибка распознавания штрих-кода:", error);

        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Ошибка распознавания штрих-кода",
          elapsed,
        };
      }
    }),

  /**
   * Распознать текст (OCR) из изображения
   */
  recognizeOCR: publicProcedure
    .input(
      ImageInputSchema.extend({
        language: z.enum(["rus", "eng", "rus+eng"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const startTime = Date.now();

      try {
        const { ocr, extracted } = await ocrService.recognizeAndExtract(
          input.imageBase64,
          input.language
        );
        const elapsed = Date.now() - startTime;

        return {
          success: true,
          data: {
            text: ocr.text,
            confidence: ocr.confidence,
            wordCount: ocr.words.length,
            extracted: {
              sku: extracted.sku,
              name: extracted.name,
              quantity: extracted.quantity,
              barcode: extracted.barcode,
            },
          },
          elapsed,
        };
      } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error("[Intake] Ошибка OCR:", error);

        return {
          success: false,
          error: error instanceof Error ? error.message : "Ошибка OCR",
          elapsed,
        };
      }
    }),

  /**
   * Найти товар по SKU, штрих-коду или названию (fuzzy search)
   */
  matchProduct: publicProcedure
    .input(MatchProductSchema)
    .query(async ({ input }) => {
      // Проверяем что хотя бы один параметр передан
      if (!input.sku && !input.name && !input.barcode) {
        return {
          success: false,
          error: "Укажите хотя бы один параметр поиска (sku, name, barcode)",
          matches: [],
        };
      }

      try {
        const matches: MatchResult[] = await productMatcher.multiFieldSearch({
          sku: input.sku,
          name: input.name,
          barcode: input.barcode,
        });

        return {
          success: true,
          matches: matches.map((m: MatchResult) => ({
            id: m.item.id,
            sku: m.item.sku,
            name: m.item.name,
            quantity: m.item.quantity,
            warehouse: m.item.warehouse,
            supplier: m.item.supplier,
            confidence: m.confidence,
            score: m.score,
          })),
          totalFound: matches.length,
        };
      } catch (error) {
        console.error("[Intake] Ошибка поиска товара:", error);

        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Ошибка поиска товара",
          matches: [],
        };
      }
    }),

  /**
   * Создать приёмку товаров
   */
  createReceipt: publicProcedure
    .input(CreateReceiptSchema)
    .mutation(async ({ input }) => {
      const startTime = Date.now();

      try {
        // Получаем информацию о товарах для создания документа
        const inventoryItems = await db.inventory.findMany({
          where: {
            id: { in: input.items.map((i) => i.inventoryId) },
          },
        });

        // Проверяем что все товары найдены
        const foundIds = new Set(inventoryItems.map((i) => i.id));
        const missingIds = input.items
          .filter((i) => !foundIds.has(i.inventoryId))
          .map((i) => i.inventoryId);

        if (missingIds.length > 0) {
          return {
            success: false,
            error: `Товары не найдены: ${missingIds.join(", ")}`,
          };
        }

        // Формируем позиции для 1C
        const items1C = input.items.map((item) => {
          const inv = inventoryItems.find((i) => i.id === item.inventoryId)!;
          return {
            sku: inv.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          };
        });

        // Создаем документ в 1C
        const result1C = await oneCClient.createGoodsReceipt({
          items: items1C,
          warehouse: input.warehouse,
          supplier: input.supplier,
        });

        // Сохраняем документ локально
        await db.document1C.create({
          data: {
            type: "GoodsReceipt",
            docNumber: result1C.docNumber,
            docDate: new Date(),
            warehouse: input.warehouse,
            status: result1C.status,
          },
        });

        // Создаем транзакции для каждой позиции
        for (const item of input.items) {
          const inv = inventoryItems.find((i) => i.id === item.inventoryId)!;

          await db.transaction.create({
            data: {
              type: "intake",
              sku: inv.sku,
              quantity: item.quantity,
              toWarehouse: input.warehouse,
              documentId: result1C.documentId,
              syncedWith1C: true,
              syncedAt: new Date(),
            },
          });

          // Обновляем остаток в inventory
          await db.inventory.update({
            where: { id: item.inventoryId },
            data: {
              quantity: { increment: item.quantity },
            },
          });
        }

        // Логируем в аудит
        await db.auditLog.create({
          data: {
            action: "intake_receipt_created",
            tableName: "documents_1c",
            recordId: result1C.documentId,
            newValue: {
              items: input.items,
              warehouse: input.warehouse,
              supplier: input.supplier,
              ocrConfidence: input.ocrConfidence,
              barcodeConfidence: input.barcodeConfidence,
            },
          },
        });

        const elapsed = Date.now() - startTime;

        return {
          success: true,
          data: {
            documentId: result1C.documentId,
            docNumber: result1C.docNumber,
            status: result1C.status,
            itemsCount: input.items.length,
            totalQuantity: input.items.reduce((sum, i) => sum + i.quantity, 0),
          },
          elapsed,
        };
      } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error("[Intake] Ошибка создания приёмки:", error);

        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Ошибка создания приёмки",
          elapsed,
        };
      }
    }),

  /**
   * Получить историю приёмок
   */
  getHistory: publicProcedure
    .input(
      z
        .object({
          warehouse: z.string().optional(),
          fromDate: z.date().optional(),
          toDate: z.date().optional(),
          limit: z.number().int().positive().default(20),
          offset: z.number().int().nonnegative().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        // Получаем приёмки из документов 1C
        const receipts = await db.document1C.findMany({
          where: {
            type: "GoodsReceipt",
            ...(input?.warehouse ? { warehouse: input.warehouse } : {}),
            ...(input?.fromDate || input?.toDate
              ? {
                  docDate: {
                    ...(input.fromDate ? { gte: input.fromDate } : {}),
                    ...(input.toDate ? { lte: input.toDate } : {}),
                  },
                }
              : {}),
          },
          orderBy: { docDate: "desc" },
          take: input?.limit ?? 20,
          skip: input?.offset ?? 0,
        });

        // Получаем транзакции для каждого документа
        const documentIds = receipts
          .map((r) => r.docNumber)
          .filter((id): id is string => id !== null);

        const transactions = await db.transaction.findMany({
          where: {
            type: "intake",
            documentId: { in: documentIds },
          },
        });

        // Группируем транзакции по документам
        const transactionsByDoc = transactions.reduce(
          (acc, t) => {
            if (t.documentId) {
              acc[t.documentId] ??= [];
              acc[t.documentId]!.push(t);
            }
            return acc;
          },
          {} as Record<string, typeof transactions>
        );

        // Считаем общее количество
        const totalCount = await db.document1C.count({
          where: {
            type: "GoodsReceipt",
            ...(input?.warehouse ? { warehouse: input.warehouse } : {}),
            ...(input?.fromDate || input?.toDate
              ? {
                  docDate: {
                    ...(input?.fromDate ? { gte: input.fromDate } : {}),
                    ...(input?.toDate ? { lte: input.toDate } : {}),
                  },
                }
              : {}),
          },
        });

        return {
          success: true,
          data: {
            receipts: receipts.map((r) => ({
              id: r.id,
              docNumber: r.docNumber,
              docDate: r.docDate,
              warehouse: r.warehouse,
              status: r.status,
              items: transactionsByDoc[r.docNumber ?? ""] ?? [],
              itemsCount: (transactionsByDoc[r.docNumber ?? ""] ?? []).length,
              totalQuantity: (transactionsByDoc[r.docNumber ?? ""] ?? []).reduce(
                (sum, t) => sum + t.quantity,
                0
              ),
            })),
            totalCount,
            hasMore: (input?.offset ?? 0) + receipts.length < totalCount,
          },
        };
      } catch (error) {
        console.error("[Intake] Ошибка получения истории:", error);

        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Ошибка получения истории приёмок",
          data: {
            receipts: [],
            totalCount: 0,
            hasMore: false,
          },
        };
      }
    }),

  /**
   * Получить статистику приёмок
   */
  getStats: publicProcedure
    .input(
      z
        .object({
          warehouse: z.string().optional(),
          days: z.number().int().positive().default(30),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const days = input?.days ?? 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      try {
        // Количество приёмок за период
        const receiptsCount = await db.document1C.count({
          where: {
            type: "GoodsReceipt",
            ...(input?.warehouse ? { warehouse: input.warehouse } : {}),
            docDate: { gte: fromDate },
          },
        });

        // Общее количество принятых товаров
        const intakeTransactions = await db.transaction.aggregate({
          where: {
            type: "intake",
            ...(input?.warehouse ? { toWarehouse: input.warehouse } : {}),
            createdAt: { gte: fromDate },
          },
          _sum: { quantity: true },
          _count: true,
        });

        // Последняя приёмка
        const lastReceipt = await db.document1C.findFirst({
          where: {
            type: "GoodsReceipt",
            ...(input?.warehouse ? { warehouse: input.warehouse } : {}),
          },
          orderBy: { docDate: "desc" },
        });

        return {
          success: true,
          data: {
            receiptsCount,
            totalItemsReceived: intakeTransactions._sum.quantity ?? 0,
            uniqueSkusReceived: intakeTransactions._count,
            lastReceiptDate: lastReceipt?.docDate ?? null,
            periodDays: days,
          },
        };
      } catch (error) {
        console.error("[Intake] Ошибка получения статистики:", error);

        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Ошибка получения статистики",
          data: null,
        };
      }
    }),
});
