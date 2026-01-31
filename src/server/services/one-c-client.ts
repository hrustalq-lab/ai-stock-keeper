import { env } from "~/env";
import { oneCAuth } from "./one-c-auth";

// ============================================
// Типы данных 1C
// ============================================

/**
 * Товар из 1C
 */
export interface OneCGoods {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  reorderPoint: number;
  supplier?: string;
  lastUpdated: string; // ISO date
}

/**
 * Позиция в документе
 */
export interface OneCDocumentItem {
  sku: string;
  quantity: number;
  unitPrice?: number;
}

/**
 * Результат создания документа
 */
export interface OneCDocumentResult {
  documentId: string;
  docNumber: string;
  status: "draft" | "posted" | "processed";
}

/**
 * Параметры запроса товаров
 */
export interface GetGoodsParams {
  warehouse?: string;
  limit?: number;
  offset?: number;
}

/**
 * Параметры создания приходной накладной
 */
export interface CreateGoodsReceiptParams {
  items: OneCDocumentItem[];
  warehouse: string;
  supplier?: string;
}

/**
 * Параметры создания отгрузки
 */
export interface CreateShipmentParams {
  orderNumber: string;
  items: OneCDocumentItem[];
  warehouse: string;
}

/**
 * Параметры перемещения
 */
export interface CreateTransferParams {
  fromWarehouse: string;
  toWarehouse: string;
  items: OneCDocumentItem[];
}

// ============================================
// 1C API Client
// ============================================

/**
 * Клиент для работы с 1C API
 * Инкапсулирует все HTTP-запросы к 1C
 */
export class OneCClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? env.ONE_C_BASE_URL;
  }

  /**
   * Выполнить GET-запрос к 1C API
   */
  private async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    const headers = await oneCAuth.getAuthHeaders();
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[1C API] GET ${endpoint} failed: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Выполнить POST-запрос к 1C API
   */
  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const headers = await oneCAuth.getAuthHeaders();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[1C API] POST ${endpoint} failed: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  // ============================================
  // Товары (Goods)
  // ============================================

  /**
   * Получить список товаров из 1C
   */
  async getGoods(params?: GetGoodsParams): Promise<OneCGoods[]> {
    return this.get<OneCGoods[]>("/goods", {
      warehouse: params?.warehouse ?? "",
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    });
  }

  /**
   * Получить товар по SKU
   */
  async getGoodsBySku(sku: string): Promise<OneCGoods | null> {
    try {
      return await this.get<OneCGoods>(`/goods/${encodeURIComponent(sku)}`);
    } catch (error) {
      // Товар не найден - возвращаем null
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  // ============================================
  // Документы
  // ============================================

  /**
   * Создать приходную накладную (Поступление товаров)
   */
  async createGoodsReceipt(params: CreateGoodsReceiptParams): Promise<OneCDocumentResult> {
    return this.post<OneCDocumentResult>("/documents/goods-receipt", {
      items: params.items,
      warehouse: params.warehouse,
      supplier: params.supplier,
    });
  }

  /**
   * Создать отгрузку (Реализация товаров)
   */
  async createShipment(params: CreateShipmentParams): Promise<OneCDocumentResult> {
    return this.post<OneCDocumentResult>("/documents/shipment", {
      orderNumber: params.orderNumber,
      items: params.items,
      warehouse: params.warehouse,
    });
  }

  /**
   * Создать перемещение между складами
   */
  async createTransfer(params: CreateTransferParams): Promise<OneCDocumentResult> {
    return this.post<OneCDocumentResult>("/documents/transfer", {
      fromWarehouse: params.fromWarehouse,
      toWarehouse: params.toWarehouse,
      items: params.items,
    });
  }

  // ============================================
  // Синхронизация
  // ============================================

  /**
   * Получить статус синхронизации
   */
  async getSyncStatus(): Promise<{ lastSync: string; itemsInQueue: number }> {
    return this.get("/sync/status");
  }

  /**
   * Проверить соединение с 1C
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.get("/health");
      return true;
    } catch {
      return false;
    }
  }
}

// Синглтон для использования во всем приложении
export const oneCClient = new OneCClient();
