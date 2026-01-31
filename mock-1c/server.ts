/**
 * Mock 1C Server для разработки
 * Эмулирует API 1C:Enterprise для тестирования интеграции
 * 
 * Запуск: npx tsx mock-1c/server.ts
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";

const PORT = 3001;

// ============================================
// Mock данные
// ============================================

interface MockGoods {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  reorderPoint: number;
  supplier: string;
  lastUpdated: string;
}

interface MockDocument {
  documentId: string;
  docNumber: string;
  type: string;
  status: "draft" | "posted" | "processed";
  items: Array<{ sku: string; quantity: number }>;
  warehouse: string;
  orderNumber?: string; // Номер заказа (для отгрузок)
  createdAt: string;
}

// Начальные товары
const mockGoods: MockGoods[] = [
  {
    id: "1",
    sku: "SKU-001",
    name: "Болт М8x30",
    quantity: 1500,
    warehouse: "warehouse_main",
    reorderPoint: 200,
    supplier: "ООО Метизы",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "2",
    sku: "SKU-002",
    name: "Гайка М8",
    quantity: 2000,
    warehouse: "warehouse_main",
    reorderPoint: 300,
    supplier: "ООО Метизы",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "3",
    sku: "SKU-003",
    name: "Шайба М8",
    quantity: 3000,
    warehouse: "warehouse_main",
    reorderPoint: 500,
    supplier: "ООО Метизы",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "4",
    sku: "SKU-004",
    name: "Винт М6x20",
    quantity: 800,
    warehouse: "warehouse_main",
    reorderPoint: 150,
    supplier: "ЗАО Крепеж",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "5",
    sku: "SKU-005",
    name: "Саморез 4.2x32",
    quantity: 50,
    warehouse: "warehouse_main",
    reorderPoint: 100,
    supplier: "ЗАО Крепеж",
    lastUpdated: new Date().toISOString(),
  },
];

const mockDocuments: MockDocument[] = [];
let documentCounter = 1000;
let accessToken = "";

// ============================================
// Утилиты
// ============================================

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function checkAuth(req: IncomingMessage): boolean {
  const auth = req.headers.authorization;
  if (!auth) return false;
  const token = auth.replace("Bearer ", "");
  return token === accessToken && accessToken !== "";
}

function validateDocumentBody(
  body: unknown,
  requiredFields: string[]
): { valid: true } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }
  const obj = body as Record<string, unknown>;
  for (const field of requiredFields) {
    if (field === "items") {
      if (!obj.items || !Array.isArray(obj.items) || obj.items.length === 0) {
        return { valid: false, error: "items is required and must be a non-empty array" };
      }
    } else if (!obj[field] || typeof obj[field] !== "string") {
      return { valid: false, error: `${field} is required` };
    }
  }
  return { valid: true };
}

// ============================================
// Роуты
// ============================================

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname.replace("/api/1c", "");
  const method = req.method ?? "GET";

  console.log(`[Mock 1C] ${method} ${path}`);

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check (без авторизации)
  if (path === "/health") {
    return sendJson(res, 200, { status: "ok", timestamp: new Date().toISOString() });
  }

  // Аутентификация
  if (path === "/auth/token" && method === "POST") {
    const body = (await parseBody(req)) as { username?: string; password?: string };
    
    if (body.username === "admin" && body.password === "dev_password") {
      accessToken = `mock_token_${Date.now()}`;
      return sendJson(res, 200, {
        accessToken,
        expiresIn: 3600,
        tokenType: "Bearer",
      });
    }
    
    return sendJson(res, 401, { error: "Invalid credentials" });
  }

  // Проверка авторизации для остальных эндпоинтов
  if (!checkAuth(req)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  // GET /goods - список товаров
  if (path === "/goods" && method === "GET") {
    const warehouse = url.searchParams.get("warehouse");
    const limit = parseInt(url.searchParams.get("limit") ?? "100");
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    let filtered = mockGoods;
    if (warehouse) {
      filtered = filtered.filter((g) => g.warehouse === warehouse);
    }

    return sendJson(res, 200, filtered.slice(offset, offset + limit));
  }

  // GET /goods/:sku - товар по SKU
  if (path.startsWith("/goods/") && method === "GET") {
    const sku = decodeURIComponent(path.replace("/goods/", ""));
    const goods = mockGoods.find((g) => g.sku === sku);
    
    if (!goods) {
      return sendJson(res, 404, { error: "Goods not found" });
    }
    
    return sendJson(res, 200, goods);
  }

  // POST /documents/goods-receipt - приходная накладная
  if (path === "/documents/goods-receipt" && method === "POST") {
    const body = (await parseBody(req)) as {
      items: Array<{ sku: string; quantity: number }>;
      warehouse: string;
    };

    documentCounter++;
    const doc: MockDocument = {
      documentId: `doc_${documentCounter}`,
      docNumber: `ПН-${documentCounter}`,
      type: "GoodsReceipt",
      status: "posted",
      items: body.items,
      warehouse: body.warehouse,
      createdAt: new Date().toISOString(),
    };

    mockDocuments.push(doc);

    // Обновляем остатки
    for (const item of body.items) {
      const goods = mockGoods.find((g) => g.sku === item.sku);
      if (goods) {
        goods.quantity += item.quantity;
        goods.lastUpdated = new Date().toISOString();
      }
    }

    console.log(`[Mock 1C] Создана приходная накладная: ${doc.docNumber}`);

    return sendJson(res, 201, {
      documentId: doc.documentId,
      docNumber: doc.docNumber,
      status: doc.status,
    });
  }

  // POST /documents/shipment - отгрузка
  if (path === "/documents/shipment" && method === "POST") {
    const rawBody = await parseBody(req);
    const validation = validateDocumentBody(rawBody, ["items", "warehouse", "orderNumber"]);
    if (!validation.valid) {
      return sendJson(res, 400, { error: validation.error });
    }
    const body = rawBody as {
      orderNumber: string;
      items: Array<{ sku: string; quantity: number }>;
      warehouse: string;
    };

    documentCounter++;
    const doc: MockDocument = {
      documentId: `doc_${documentCounter}`,
      docNumber: `РН-${documentCounter}`,
      type: "Shipment",
      status: "posted",
      items: body.items,
      warehouse: body.warehouse,
      orderNumber: body.orderNumber,
      createdAt: new Date().toISOString(),
    };

    mockDocuments.push(doc);

    // Обновляем остатки
    for (const item of body.items) {
      const goods = mockGoods.find((g) => g.sku === item.sku);
      if (goods) {
        goods.quantity = Math.max(0, goods.quantity - item.quantity);
        goods.lastUpdated = new Date().toISOString();
      }
    }

    console.log(`[Mock 1C] Создана отгрузка: ${doc.docNumber} (заказ: ${body.orderNumber})`);

    return sendJson(res, 201, {
      documentId: doc.documentId,
      docNumber: doc.docNumber,
      status: doc.status,
    });
  }

  // POST /documents/transfer - перемещение
  if (path === "/documents/transfer" && method === "POST") {
    const body = (await parseBody(req)) as {
      fromWarehouse: string;
      toWarehouse: string;
      items: Array<{ sku: string; quantity: number }>;
    };

    documentCounter++;
    const doc: MockDocument = {
      documentId: `doc_${documentCounter}`,
      docNumber: `ПМ-${documentCounter}`,
      type: "Transfer",
      status: "posted",
      items: body.items,
      warehouse: body.fromWarehouse,
      createdAt: new Date().toISOString(),
    };

    mockDocuments.push(doc);

    // Обновляем остатки: уменьшаем на складе-источнике, увеличиваем на складе-получателе
    for (const item of body.items) {
      // Уменьшаем на складе-источнике
      const sourceGoods = mockGoods.find(
        (g) => g.sku === item.sku && g.warehouse === body.fromWarehouse
      );
      if (sourceGoods) {
        sourceGoods.quantity = Math.max(0, sourceGoods.quantity - item.quantity);
        sourceGoods.lastUpdated = new Date().toISOString();
      }

      // Увеличиваем на складе-получателе (или создаём новую запись)
      const targetGoods = mockGoods.find(
        (g) => g.sku === item.sku && g.warehouse === body.toWarehouse
      );
      if (targetGoods) {
        targetGoods.quantity += item.quantity;
        targetGoods.lastUpdated = new Date().toISOString();
      } else if (sourceGoods) {
        // Создаём новую запись на целевом складе
        mockGoods.push({
          id: `${mockGoods.length + 1}`,
          sku: item.sku,
          name: sourceGoods.name,
          quantity: item.quantity,
          warehouse: body.toWarehouse,
          reorderPoint: sourceGoods.reorderPoint,
          supplier: sourceGoods.supplier,
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    console.log(`[Mock 1C] Создано перемещение: ${doc.docNumber}`);

    return sendJson(res, 201, {
      documentId: doc.documentId,
      docNumber: doc.docNumber,
      status: doc.status,
    });
  }

  // GET /sync/status
  if (path === "/sync/status" && method === "GET") {
    return sendJson(res, 200, {
      lastSync: new Date().toISOString(),
      itemsInQueue: 0,
    });
  }

  // 404 для неизвестных роутов
  sendJson(res, 404, { error: "Not found" });
}

// ============================================
// Запуск сервера
// ============================================

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error("[Mock 1C] Error:", error);
    sendJson(res, 500, { error: "Internal server error" });
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║           🏭 Mock 1C Server запущен                    ║
╠════════════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}/api/1c                    ║
║                                                        ║
║  Credentials:                                          ║
║    Username: admin                                     ║
║    Password: dev_password                              ║
║                                                        ║
║  Endpoints:                                            ║
║    POST /auth/token         - получить токен           ║
║    GET  /goods              - список товаров           ║
║    GET  /goods/:sku         - товар по SKU             ║
║    POST /documents/goods-receipt - приход              ║
║    POST /documents/shipment      - отгрузка            ║
║    POST /documents/transfer      - перемещение         ║
║    GET  /sync/status        - статус синхронизации     ║
║    GET  /health             - проверка здоровья        ║
╚════════════════════════════════════════════════════════╝
  `);
});