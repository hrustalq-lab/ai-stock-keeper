/**
 * ProductMatcherService — сервис поиска товаров
 * Использует Fuse.js для нечёткого (fuzzy) поиска
 * Поддержка кириллицы и взвешенный поиск по полям
 */

import Fuse, { type IFuseOptions } from "fuse.js";
import { db, type Inventory } from "~/server/db";

/**
 * Результат поиска товара
 */
export interface MatchResult {
  item: {
    id: number;
    sku: string;
    name: string;
    quantity: number;
    warehouse: string;
    supplier?: string;
  };
  score: number; // 0-1 (0 = идеальное совпадение)
  confidence: number; // 0-100%
}

/**
 * Конфигурация поисковика
 */
export interface MatcherConfig {
  threshold?: number; // Порог схожести (0-1, меньше = строже)
  limit?: number; // Максимум результатов
  includeScore?: boolean;
  minMatchCharLength?: number;
}

/**
 * Индексируемый товар для Fuse.js
 */
interface IndexedProduct {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  supplier?: string;
  // Дополнительные поля для поиска
  skuNormalized: string;
  nameNormalized: string;
}

/**
 * Сервис нечёткого поиска товаров
 */
export class ProductMatcherService {
  private config: MatcherConfig;
  private fuse: Fuse<IndexedProduct> | null = null;
  private products: IndexedProduct[] = [];
  private lastRefresh: Date | null = null;

  /**
   * Получить настройки Fuse.js
   */
  private getFuseOptions(threshold: number): IFuseOptions<IndexedProduct> {
    return {
      keys: [
        { name: "sku", weight: 0.4 },
        { name: "skuNormalized", weight: 0.3 },
        { name: "name", weight: 0.2 },
        { name: "nameNormalized", weight: 0.1 },
      ],
      threshold, // Порог схожести
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true, // Искать по всей строке
      useExtendedSearch: false,
      findAllMatches: true,
    };
  }

  constructor(config: MatcherConfig = {}) {
    this.config = {
      threshold: config.threshold ?? 0.4,
      limit: config.limit ?? 10,
      includeScore: config.includeScore ?? true,
      minMatchCharLength: config.minMatchCharLength ?? 2,
    };
  }

  /**
   * Нормализация строки для поиска
   */
  private normalize(str: string): string {
    return str
      .toLowerCase()
      // Убираем специальные символы
      .replace(/[^\wа-яё\s]/gi, "")
      // Множественные пробелы в один
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Преобразование Inventory в IndexedProduct
   */
  private toIndexedProduct(inv: Inventory): IndexedProduct {
    return {
      id: inv.id,
      sku: inv.sku,
      name: inv.name,
      quantity: inv.quantity,
      warehouse: inv.warehouse,
      supplier: inv.supplier ?? undefined,
      skuNormalized: this.normalize(inv.sku),
      nameNormalized: this.normalize(inv.name),
    };
  }

  /**
   * Обновить индекс товаров из БД
   */
  async refreshIndex(): Promise<void> {
    console.log("[Matcher] Обновление индекса товаров...");
    const startTime = Date.now();

    try {
      // Загружаем все товары из БД
      const inventory = await db.inventory.findMany({
        orderBy: { sku: "asc" },
      });

      // Преобразуем в индексируемый формат
      this.products = inventory.map((inv) => this.toIndexedProduct(inv));

      // Создаём новый индекс Fuse.js
      this.fuse = new Fuse(
        this.products,
        this.getFuseOptions(this.config.threshold ?? 0.4)
      );

      this.lastRefresh = new Date();
      const elapsed = Date.now() - startTime;

      console.log(
        `[Matcher] Индекс обновлён: ${this.products.length} товаров за ${elapsed}ms`
      );
    } catch (error) {
      console.error("[Matcher] Ошибка обновления индекса:", error);
      throw error;
    }
  }

  /**
   * Проверить, нужно ли обновить индекс
   */
  private needsRefresh(): boolean {
    if (!this.fuse || !this.lastRefresh) return true;

    // Обновляем каждые 5 минут
    const maxAge = 5 * 60 * 1000;
    return Date.now() - this.lastRefresh.getTime() > maxAge;
  }

  /**
   * Убедиться, что индекс актуален
   */
  private async ensureIndex(): Promise<void> {
    if (this.needsRefresh()) {
      await this.refreshIndex();
    }
  }

  /**
   * Найти товары по запросу (fuzzy search)
   */
  async search(query: string, limit?: number): Promise<MatchResult[]> {
    await this.ensureIndex();

    if (!this.fuse) {
      console.warn("[Matcher] Индекс не инициализирован");
      return [];
    }

    const searchQuery = query.trim();
    if (!searchQuery) {
      return [];
    }

    console.log(`[Matcher] Поиск: "${searchQuery}"`);

    const maxResults = limit ?? this.config.limit ?? 10;
    const results = this.fuse.search(searchQuery, { limit: maxResults });

    return results.map((result) => ({
      item: {
        id: result.item.id,
        sku: result.item.sku,
        name: result.item.name,
        quantity: result.item.quantity,
        warehouse: result.item.warehouse,
        supplier: result.item.supplier,
      },
      score: result.score ?? 0,
      confidence: this.scoreToConfidence(result.score ?? 0),
    }));
  }

  /**
   * Найти товар по точному SKU
   */
  async findBySku(sku: string): Promise<MatchResult | null> {
    await this.ensureIndex();

    const normalizedSku = sku.trim().toUpperCase();
    const product = this.products.find(
      (p) => p.sku.toUpperCase() === normalizedSku
    );

    if (!product) {
      return null;
    }

    return {
      item: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        quantity: product.quantity,
        warehouse: product.warehouse,
        supplier: product.supplier,
      },
      score: 0, // Точное совпадение
      confidence: 100,
    };
  }

  /**
   * Найти товар по штрих-коду (точный поиск по SKU)
   */
  async findByBarcode(barcode: string): Promise<MatchResult | null> {
    // Штрих-код часто используется как SKU
    const result = await this.findBySku(barcode);
    if (result) return result;

    // Fallback: fuzzy search
    const fuzzyResults = await this.search(barcode, 1);
    if (fuzzyResults.length > 0 && fuzzyResults[0]!.confidence >= 90) {
      return fuzzyResults[0]!;
    }

    return null;
  }

  /**
   * Поиск с приоритетом по нескольким полям
   *
   * Порядок приоритетов:
   * 1. Точный SKU
   * 2. Точный штрих-код
   * 3. Fuzzy SKU (SKU приоритетнее name, т.к. более точный идентификатор)
   * 4. Fuzzy name
   */
  async multiFieldSearch(params: {
    sku?: string;
    name?: string;
    barcode?: string;
  }): Promise<MatchResult[]> {
    await this.ensureIndex();

    // Приоритет 1: точный SKU
    if (params.sku) {
      const exact = await this.findBySku(params.sku);
      if (exact) return [exact];
    }

    // Приоритет 2: точный штрих-код
    if (params.barcode) {
      const byBarcode = await this.findByBarcode(params.barcode);
      if (byBarcode) return [byBarcode];
    }

    // Приоритет 3: fuzzy search по SKU (SKU важнее name)
    if (params.sku) {
      const fuzzyBySku = await this.search(params.sku);
      if (fuzzyBySku.length > 0) return fuzzyBySku;
    }

    // Приоритет 4: fuzzy search по имени
    if (params.name) {
      return this.search(params.name);
    }

    return [];
  }

  /**
   * Преобразование score Fuse.js в процент уверенности
   * Score: 0 = идеальное совпадение, 1 = нет совпадения
   */
  private scoreToConfidence(score: number): number {
    // Инвертируем и масштабируем
    const confidence = (1 - score) * 100;
    return Math.round(Math.max(0, Math.min(100, confidence)));
  }

  /**
   * Настроить параметры поисковика
   */
  configure(config: Partial<MatcherConfig>): void {
    this.config = { ...this.config, ...config };

    // Пересоздаём индекс с новыми настройками
    if (this.fuse && config.threshold !== undefined) {
      this.fuse = new Fuse(
        this.products,
        this.getFuseOptions(config.threshold ?? 0.4)
      );
    }
  }

  /**
   * Получить текущую конфигурацию
   */
  getConfig(): MatcherConfig {
    return { ...this.config };
  }

  /**
   * Получить статистику индекса
   */
  getStats(): {
    productCount: number;
    lastRefresh: Date | null;
    isInitialized: boolean;
  } {
    return {
      productCount: this.products.length,
      lastRefresh: this.lastRefresh,
      isInitialized: this.fuse !== null,
    };
  }

  /**
   * Принудительно инвалидировать индекс
   */
  invalidateIndex(): void {
    this.fuse = null;
    this.lastRefresh = null;
    this.products = [];
    console.log("[Matcher] Индекс инвалидирован");
  }
}

// Синглтон для использования во всем приложении
export const productMatcher = new ProductMatcherService();
