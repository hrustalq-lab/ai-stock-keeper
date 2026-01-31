# Phase 3: Real-Time Inventory Sync & Dashboard

**Цель:** Live dashboard с real-time обновлениями и алертами  
**Срок:** 2 недели (Week 6-7)  
**Статус:** 📋 В планировании  
**Начало:** После завершения Phase 2

---

## 1. Обзор

### 1.1 Deliverable
Real-time dashboard с мониторингом остатков, алертами и визуализацией

### 1.2 User Story
```
Как менеджер склада,
я хочу видеть остатки в реальном времени на dashboard,
получать уведомления при низком остатке,
чтобы вовремя заказывать товар и избегать простоев.
```

### 1.3 Архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Real-Time Dashboard Flow                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📡 1C Webhook → 🔄 WebhookProcessor → 📦 InventoryCache             │
│                                              │                      │
│                                              ▼                      │
│                                    📢 Redis Pub/Sub                 │
│                                              │                      │
│                 ┌────────────────────────────┼────────────────┐     │
│                 ▼                            ▼                ▼     │
│           🔔 AlertService           📺 SSE Endpoint     💾 Snapshot │
│                 │                            │                      │
│                 ▼                            ▼                      │
│          📧 Email (Resend)           🖥️ Dashboard UI                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

| Компонент | Библиотека | Версия | Описание |
|-----------|------------|--------|----------|
| **Real-Time** | SSE (native) | - | Server-Sent Events для push-обновлений |
| **Charts** | `recharts` | ^2.x | Графики уровней запасов |
| **Email** | `resend` | ^3.x | Email уведомления |
| **Date Utils** | `date-fns` | ^3.x | Форматирование времени |
| **UI Components** | `shadcn/ui` | latest | Компоненты интерфейса |

### 2.1 Почему эти библиотеки

**SSE (Server-Sent Events):**
- Проще WebSocket (односторонний поток)
- Native browser support
- Автоматическое reconnection
- Достаточно для dashboard (read-only)

**Recharts:**
- React-native, декларативный
- Хорошая документация
- Responsive из коробки
- Лёгкий bundle size

**Resend:**
- Современный API
- Отличный DX (TypeScript SDK)
- Бесплатный tier (100 emails/day)
- React Email templates support

---

## 3. Задачи

### 3.1 Блок 1: Real-Time SSE Infrastructure (Day 1-2) ⬜

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 1.1 | Установить зависимости | `package.json` | ⬜ |
| 1.2 | SSE Endpoint | `src/app/api/sse/inventory/route.ts` | ⬜ |
| 1.3 | Redis Subscriber Service | `src/server/services/sse-manager.ts` | ⬜ |
| 1.4 | React Hook `useInventoryUpdates` | `src/hooks/useInventoryUpdates.ts` | ⬜ |
| 1.5 | Unit-тесты SSE | `src/__tests__/unit/sse.test.ts` | ⬜ |

**Зависимости для установки:**
```bash
npm install recharts resend date-fns
npm install --save-dev @types/recharts
```

---

### 3.2 Блок 2: Dashboard UI (Day 3-5) ⬜

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 2.1 | Dashboard Page | `src/app/dashboard/page.tsx` | ⬜ |
| 2.2 | InventoryOverview | `src/app/_components/dashboard/InventoryOverview.tsx` | ⬜ |
| 2.3 | LowStockWidget | `src/app/_components/dashboard/LowStockWidget.tsx` | ⬜ |
| 2.4 | RecentActivityFeed | `src/app/_components/dashboard/RecentActivityFeed.tsx` | ⬜ |
| 2.5 | StockLevelChart | `src/app/_components/dashboard/StockLevelChart.tsx` | ⬜ |
| 2.6 | AlertsWidget | `src/app/_components/dashboard/AlertsWidget.tsx` | ⬜ |
| 2.7 | WarehouseSelector | `src/app/_components/dashboard/WarehouseSelector.tsx` | ⬜ |
| 2.8 | Index exports | `src/app/_components/dashboard/index.ts` | ⬜ |

**Dashboard Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 AI Stock Keeper Dashboard                    [🔔 3] [⚙️] [👤]    │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┬─────────────────────┬─────────────────────┐│
│  │ 📦 Всего товаров    │ ⚠️ Низкий остаток   │ 🔄 Синхронизация   ││
│  │     1,234          │       12            │    ✅ 2 мин назад  ││
│  └─────────────────────┴─────────────────────┴─────────────────────┘│
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  ┌─────────────────────────┐  │
│  │ 📈 Уровень запасов (7 дней)      │  │ 🔔 Алерты               │  │
│  │                                  │  │ ─────────────────────── │  │
│  │    ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁             │  │ ⚠️ SKU-001 < 10 шт     │  │
│  │                                  │  │ ⚠️ SKU-045 < 5 шт      │  │
│  │  Mon  Tue  Wed  Thu  Fri  Sat   │  │ 🔴 SKU-012 закончился   │  │
│  └──────────────────────────────────┘  └─────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│  📋 Последние операции                           [Warehouse: All ▼] │
│  ├─ 10:45  📥 Приёмка SKU-001 (+50)    warehouse_main              │
│  ├─ 10:32  📤 Отгрузка SKU-015 (-10)   warehouse_main              │
│  ├─ 10:15  🔄 Перемещение SKU-003      main → spb                  │
│  └─ 09:58  📥 Приёмка SKU-022 (+100)   warehouse_spb               │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Блок 3: Alert System (Day 6-8) ⬜

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 3.1 | AlertRule Model | `prisma/schema.prisma` | ⬜ |
| 3.2 | AlertService | `src/server/services/alert-service.ts` | ⬜ |
| 3.3 | NotificationService (Resend) | `src/server/services/notification-service.ts` | ⬜ |
| 3.4 | Email Templates | `src/server/email-templates/` | ⬜ |
| 3.5 | Alerts tRPC Router | `src/server/api/routers/alerts.ts` | ⬜ |
| 3.6 | Alert Settings Page | `src/app/settings/alerts/page.tsx` | ⬜ |
| 3.7 | Unit-тесты AlertService | `src/__tests__/unit/alert-service.test.ts` | ⬜ |

**Prisma Schema дополнения:**
```prisma
// Правила алертов
model AlertRule {
  id           Int       @id @default(autoincrement())
  name         String    @db.VarChar(100)
  sku          String?   @db.VarChar(50)   // null = все товары
  warehouse    String?   @db.VarChar(50)   // null = все склады
  condition    String    @db.VarChar(20)   // "below", "above", "equals"
  threshold    Int
  channel      String    @db.VarChar(20)   // "email", "webhook", "sms"
  recipient    String    @db.VarChar(255)  // email/url/phone
  isActive     Boolean   @default(true) @map("is_active")
  cooldownMins Int       @default(60) @map("cooldown_mins")
  lastTriggeredAt DateTime? @map("last_triggered_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@index([sku])
  @@index([isActive])
  @@map("alert_rules")
}

// История алертов
model AlertHistory {
  id          Int      @id @default(autoincrement())
  ruleId      Int      @map("rule_id")
  sku         String   @db.VarChar(50)
  warehouse   String   @db.VarChar(50)
  oldValue    Int      @map("old_value")
  newValue    Int      @map("new_value")
  channel     String   @db.VarChar(20)
  status      String   @db.VarChar(20) // "sent", "failed"
  errorMessage String? @map("error_message")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([ruleId])
  @@map("alert_history")
}
```

---

### 3.4 Блок 4: Inventory Diff & Reconciliation (Day 9-10) ⬜

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 4.1 | InventorySnapshot Model | `prisma/schema.prisma` | ⬜ |
| 4.2 | SnapshotService | `src/server/services/inventory-snapshot.ts` | ⬜ |
| 4.3 | DiffCalculator | `src/server/services/diff-calculator.ts` | ⬜ |
| 4.4 | Reconciliation Report Endpoint | `src/server/api/routers/dashboard.ts` | ⬜ |
| 4.5 | Scheduled Snapshot Job | `scripts/snapshot-worker.ts` | ⬜ |
| 4.6 | Unit-тесты Diff | `src/__tests__/unit/diff-calculator.test.ts` | ⬜ |

**Prisma Schema дополнения:**
```prisma
// Снапшоты инвентаря
model InventorySnapshot {
  id          Int      @id @default(autoincrement())
  warehouse   String   @db.VarChar(50)
  snapshot    Json     // { "SKU-001": 100, "SKU-002": 50, ... }
  totalItems  Int      @map("total_items")
  totalQty    Int      @map("total_qty")
  source      String   @db.VarChar(20) // "local", "1c"
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([warehouse])
  @@index([createdAt])
  @@map("inventory_snapshots")
}
```

---

### 3.5 Блок 5: Backend API (Day 9-10) ⬜

| ID | Задача | Endpoint | Статус |
|----|--------|----------|--------|
| 5.1 | Dashboard stats | `dashboard.getStats` | ⬜ |
| 5.2 | Recent activity | `dashboard.getRecentActivity` | ⬜ |
| 5.3 | Stock trends | `dashboard.getStockTrends` | ⬜ |
| 5.4 | Alert rules CRUD | `alerts.*` | ⬜ |
| 5.5 | Alert history | `alerts.getHistory` | ⬜ |
| 5.6 | Reconciliation report | `dashboard.getReconciliation` | ⬜ |

**tRPC Routers:**
```typescript
// src/server/api/routers/dashboard.ts
export const dashboardRouter = createTRPCRouter({
  getStats: publicProcedure.query(async () => { ... }),
  getRecentActivity: publicProcedure.input(...).query(async () => { ... }),
  getStockTrends: publicProcedure.input(...).query(async () => { ... }),
  getReconciliation: publicProcedure.input(...).query(async () => { ... }),
});

// src/server/api/routers/alerts.ts
export const alertsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => { ... }),
  create: publicProcedure.input(...).mutation(async () => { ... }),
  update: publicProcedure.input(...).mutation(async () => { ... }),
  delete: publicProcedure.input(...).mutation(async () => { ... }),
  getHistory: publicProcedure.input(...).query(async () => { ... }),
  test: publicProcedure.input(...).mutation(async () => { ... }),
});
```

---

### 3.6 Блок 6: Тестирование (Day 10) ⬜

| ID | Задача | Тип | Статус |
|----|--------|-----|--------|
| 6.1 | Unit-тесты SSE Manager | Jest | ⬜ |
| 6.2 | Unit-тесты AlertService | Jest | ⬜ |
| 6.3 | Unit-тесты DiffCalculator | Jest | ⬜ |
| 6.4 | Integration тест dashboard flow | Jest | ⬜ |
| 6.5 | Manual E2E тестирование | Manual | ⬜ |

---

## 4. Детальные спецификации

### 4.1 SSE Endpoint

```typescript
// src/app/api/sse/inventory/route.ts

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Подписка на Redis pub/sub
      const subscriber = redis.duplicate();
      await subscriber.subscribe("inventory:updated");
      
      subscriber.on("message", (channel, message) => {
        const data = `data: ${message}\n\n`;
        controller.enqueue(encoder.encode(data));
      });
      
      // Heartbeat каждые 30 сек
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30000);
      
      // Cleanup при закрытии
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        subscriber.unsubscribe();
        subscriber.quit();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### 4.2 useInventoryUpdates Hook

```typescript
// src/hooks/useInventoryUpdates.ts

import { useEffect, useState, useCallback } from "react";

interface InventoryUpdate {
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  syncedAt: string;
}

export function useInventoryUpdates() {
  const [updates, setUpdates] = useState<InventoryUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource("/api/sse/inventory");

    eventSource.onopen = () => setIsConnected(true);
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data) as InventoryUpdate;
      setUpdates((prev) => [update, ...prev.slice(0, 99)]); // Keep last 100
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      // EventSource auto-reconnects
    };

    return () => eventSource.close();
  }, []);

  return { updates, isConnected };
}
```

### 4.3 AlertService

```typescript
// src/server/services/alert-service.ts

interface AlertCheckResult {
  triggered: boolean;
  rule: AlertRule;
  currentValue: number;
}

export class AlertService {
  /**
   * Проверить все активные правила для товара
   */
  async checkAlerts(sku: string, warehouse: string, newQuantity: number): Promise<void>;

  /**
   * Проверить одно правило
   */
  async checkRule(rule: AlertRule, quantity: number): Promise<AlertCheckResult>;

  /**
   * Отправить уведомление
   */
  async sendNotification(rule: AlertRule, sku: string, quantity: number): Promise<void>;

  /**
   * Проверить cooldown
   */
  isInCooldown(rule: AlertRule): boolean;
}
```

### 4.4 NotificationService (Resend)

```typescript
// src/server/services/notification-service.ts

import { Resend } from "resend";

export class NotificationService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * Отправить email алерт
   */
  async sendEmailAlert(params: {
    to: string;
    sku: string;
    productName: string;
    currentQuantity: number;
    threshold: number;
    warehouse: string;
  }): Promise<void>;

  /**
   * Отправить webhook
   */
  async sendWebhook(url: string, payload: object): Promise<void>;
}
```

---

## 5. Таймлайн

```
Week 1 (Days 1-5)
├── Day 1: Установка зависимостей, SSE endpoint
├── Day 2: Redis subscriber, useInventoryUpdates hook
├── Day 3: Dashboard page layout, InventoryOverview
├── Day 4: LowStockWidget, RecentActivityFeed
└── Day 5: StockLevelChart (Recharts), AlertsWidget

Week 2 (Days 6-10)
├── Day 6: Prisma models (AlertRule, AlertHistory), AlertService
├── Day 7: NotificationService (Resend), Email templates
├── Day 8: Alert Settings UI, tRPC routers
├── Day 9: InventorySnapshot, DiffCalculator
└── Day 10: Тестирование, документация
```

---

## 6. Файловая структура

```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx                    # Главный dashboard
│   ├── settings/
│   │   └── alerts/
│   │       └── page.tsx                # Настройки алертов
│   ├── api/
│   │   └── sse/
│   │       └── inventory/
│   │           └── route.ts            # SSE endpoint
│   └── _components/
│       └── dashboard/
│           ├── index.ts
│           ├── InventoryOverview.tsx
│           ├── LowStockWidget.tsx
│           ├── RecentActivityFeed.tsx
│           ├── StockLevelChart.tsx
│           ├── AlertsWidget.tsx
│           └── WarehouseSelector.tsx
├── hooks/
│   └── useInventoryUpdates.ts
├── server/
│   ├── services/
│   │   ├── alert-service.ts
│   │   ├── notification-service.ts
│   │   ├── inventory-snapshot.ts
│   │   ├── diff-calculator.ts
│   │   └── sse-manager.ts
│   ├── api/
│   │   └── routers/
│   │       ├── alerts.ts
│   │       └── dashboard.ts
│   └── email-templates/
│       └── low-stock-alert.tsx
├── __tests__/
│   └── unit/
│       ├── sse.test.ts
│       ├── alert-service.test.ts
│       └── diff-calculator.test.ts
└── scripts/
    └── snapshot-worker.ts
```

---

## 7. Environment Variables

```env
# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=alerts@yourdomain.com

# Alert defaults
ALERT_DEFAULT_COOLDOWN_MINS=60
```

---

## 8. Критерии успеха

| Метрика | Цель | Измерение |
|---------|------|-----------|
| **SSE Latency** | < 2 сек | Время от 1C webhook до UI обновления |
| **Alert Delivery** | < 30 сек | Время от trigger до email |
| **Dashboard Load** | < 1 сек | First Contentful Paint |
| **SSE Reconnect** | < 5 сек | Время восстановления соединения |
| **Email Delivery Rate** | > 99% | % успешно доставленных алертов |

---

## 9. Риски и митигации

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| SSE connection drops | Средняя | Среднее | Auto-reconnect в EventSource |
| Email rate limits (Resend) | Низкая | Среднее | Cooldown на правилах, batch emails |
| Redis pub/sub пропуск сообщений | Низкая | Высокое | Polling fallback, message buffer |
| Большое количество алертов | Средняя | Среднее | Alert aggregation, digest emails |

---

## 10. Зависимости от Phase 1-2

| Компонент Phase 1-2 | Использование в Phase 3 |
|---------------------|-------------------------|
| `InventoryCache` | Real-time обновления через pub/sub |
| `WebhookProcessor` | Триггер для AlertService |
| `AuditLog` | RecentActivityFeed |
| `Redis pub/sub` | SSE broadcast |
| `inventory.getLowStock` | LowStockWidget |

---

## 11. Следующие шаги

После завершения Phase 3:
- [ ] **Phase 4:** Predictive Analytics (Prophet/statsmodels)
- [ ] **Phase 5:** Picking Optimization
- [ ] **Future:** SMS алерты (Twilio)
- [ ] **Future:** Mobile PWA

---

**Документ создан:** 2026-01-31  
**Последнее обновление:** 2026-01-31  
**Автор:** AI Stock Keeper Team
