/**
 * OCRService — сервис распознавания текста
 * Использует Tesseract.js для извлечения текста из изображений
 * Поддержка кириллицы (русский язык)
 */

import Tesseract from "tesseract.js";

/**
 * Слово с координатами и уверенностью
 */
export interface OCRWord {
  text: string;
  confidence: number; // 0-100
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

/**
 * Результат OCR
 */
export interface OCRResult {
  text: string;
  confidence: number; // 0-100
  words: OCRWord[];
}

/**
 * Извлечённые данные о товаре
 */
export interface ExtractedProductData {
  sku?: string;
  name?: string;
  quantity?: number;
  barcode?: string;
}

/**
 * Конфигурация OCR
 */
export interface OCRConfig {
  language?: string; // 'rus', 'eng', 'rus+eng'
  psm?: number; // Page segmentation mode
}

/**
 * Регулярные выражения для извлечения данных
 */
const PATTERNS = {
  // SKU: артикулы вида "ART-12345", "SKU-001", "12345678"
  // Ищем латинские буквы и цифры после ключевых слов
  sku: /(?:арт\.?|артикул|sku|код)[:\s]*([A-Za-z0-9][\w\-]*)/i,
  skuAlt: /\b([A-Z]{2,4}[-]?\d{3,8})\b/i,

  // Количество: "10 шт", "100 штук", "кол-во: 50"
  quantity:
    /(?:кол\.?(?:-во)?|количество)[:\s]*(\d+)|(\d+)\s*(?:шт\.?(?:ук)?)/i,

  // Штрих-код EAN-13
  ean13: /\b(\d{13})\b/,

  // Название товара (после "Наименование:")
  name: /(?:наименование|название|товар)[:\s]*([^\n\r]+)/i,
};

/**
 * Сервис оптического распознавания символов
 */
export class OCRService {
  private config: OCRConfig;
  private scheduler: Tesseract.Scheduler | null = null;

  constructor(config: OCRConfig = {}) {
    this.config = {
      language: config.language ?? "rus",
      psm: config.psm ?? 3, // Fully automatic page segmentation
    };
  }

  /**
   * Инициализация воркера Tesseract (для повторного использования)
   */
  async initialize(): Promise<void> {
    if (this.scheduler) return;

    this.scheduler = Tesseract.createScheduler();
    const worker = await Tesseract.createWorker(this.config.language ?? "rus");
    this.scheduler.addWorker(worker);

    console.log(`[OCR] Инициализирован с языком: ${this.config.language}`);
  }

  /**
   * Завершить работу воркера
   */
  async terminate(): Promise<void> {
    if (this.scheduler) {
      await this.scheduler.terminate();
      this.scheduler = null;
    }
  }

  /**
   * Распознать текст из base64 изображения
   */
  async recognize(
    imageBase64: string,
    language?: string
  ): Promise<OCRResult> {
    const lang = language ?? this.config.language ?? "rus";

    // Убираем data URL prefix если есть
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageDataUrl = `data:image/jpeg;base64,${base64Data}`;

    console.log(`[OCR] Начинаю распознавание (язык: ${lang})...`);
    const startTime = Date.now();

    try {
      // Используем одноразовый воркер для простоты
      const result = await Tesseract.recognize(imageDataUrl, lang, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            // Можно добавить прогресс, но для MVP пропускаем
          }
        },
      });

      const elapsed = Date.now() - startTime;
      console.log(`[OCR] Завершено за ${elapsed}ms`);

      // Преобразуем результат
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      const rawWords = (result.data as any).words as Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
      }> | undefined;

      const words: OCRWord[] = (rawWords ?? []).map((word) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: word.bbox,
      }));

      const ocrResult: OCRResult = {
        text: result.data.text.trim(),
        confidence: result.data.confidence,
        words,
      };

      console.log(
        `[OCR] Распознано ${words.length} слов, уверенность: ${ocrResult.confidence.toFixed(1)}%`
      );

      return ocrResult;
    } catch (error) {
      console.error("[OCR] Ошибка распознавания:", error);
      throw new Error(
        `OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Извлечь структурированные данные о товаре из текста
   */
  extractProductData(text: string): ExtractedProductData {
    const data: ExtractedProductData = {};

    // Извлекаем SKU
    const skuMatch = PATTERNS.sku.exec(text) ?? PATTERNS.skuAlt.exec(text);
    if (skuMatch?.[1]) {
      data.sku = skuMatch[1].trim().toUpperCase();
    }

    // Извлекаем количество
    const qtyMatch = PATTERNS.quantity.exec(text);
    if (qtyMatch) {
      const qty = qtyMatch[1] ?? qtyMatch[2];
      if (qty) {
        data.quantity = parseInt(qty, 10);
      }
    }

    // Извлекаем штрих-код
    const eanMatch = PATTERNS.ean13.exec(text);
    if (eanMatch?.[1]) {
      data.barcode = eanMatch[1];
    }

    // Извлекаем название
    const nameMatch = PATTERNS.name.exec(text);
    if (nameMatch?.[1]) {
      data.name = nameMatch[1].trim();
    }

    console.log("[OCR] Извлечённые данные:", data);
    return data;
  }

  /**
   * Распознать и извлечь данные за один вызов
   */
  async recognizeAndExtract(
    imageBase64: string,
    language?: string
  ): Promise<{
    ocr: OCRResult;
    extracted: ExtractedProductData;
  }> {
    const ocr = await this.recognize(imageBase64, language);
    const extracted = this.extractProductData(ocr.text);

    return { ocr, extracted };
  }

  /**
   * Настроить параметры OCR
   */
  configure(config: Partial<OCRConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Получить текущую конфигурацию
   */
  getConfig(): OCRConfig {
    return { ...this.config };
  }

  /**
   * Предобработка текста для улучшения качества извлечения
   */
  preprocessText(text: string): string {
    return text
      // Нормализуем переносы строк (должно быть до замены пробелов)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Исправляем типичные ошибки OCR для кириллицы
      .replace(/[оО]0/g, "00")
      .replace(/0[оО]/g, "00")
      .replace(/[Зз]3/g, "33")
      .replace(/3[Зз]/g, "33")
      // Убираем множественные пробелы (но не переносы строк)
      .replace(/[^\S\n]+/g, " ")
      .trim();
  }
}

// Синглтон для использования во всем приложении
export const ocrService = new OCRService();
