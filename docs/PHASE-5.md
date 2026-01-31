# Phase 5: Picking Optimization

**Цель:** Оптимизация сборки заказов — быстрее, меньше ошибок  
**Срок:** 3 недели (Week 11-13)  
**Статус:** 📋 Планирование  
**Дата создания:** 2026-01-31

---

## 1. Обзор

### 1.1 Deliverable

Система умной сборки заказов (picking) с оптимизацией маршрутов по складу, чек-листами и интеграцией с отгрузочными документами 1C.

### 1.2 User Story

```
Как менеджер склада,
я хочу создавать оптимизированные списки сборки для работников,
с рассчитанным маршрутом по складу и подтверждением каждой позиции,
чтобы сократить время сборки на 40% и уменьшить ошибки.

Как работник склада,
я хочу получать задание на сборку со списком товаров,
их локациями и оптимальным маршрутом обхода,
чтобы быстро собрать заказ без лишних перемещений.
```

### 1.3 Архитектура

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Picking Optimization Flow                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📦 Orders from 1C                                                          │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────┐                                                    │
│  │ PickingListService  │                                                    │
│  │ (создание листов)   │                                                    │
│  └──────────┬──────────┘                                                    │
│             │                                                               │
│             ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ RouteOptimizationService                                            │   │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │ │ MVP:      Greedy Nearest-Neighbor (O(n²))                      │ │   │
│  │ │ Advanced: Google OR-Tools / Branch-and-Bound (O(2ⁿ) optimal)   │ │   │
│  │ │ Future:   Warehouse-specific ML model                          │ │   │
│  │ └─────────────────────────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────┬─────────────────────────────────┘   │
│                                      │                                     │
│         ┌────────────────────────────┼────────────────────────┐            │
│         ▼                            ▼                        ▼            │
│  ┌─────────────────┐     ┌─────────────────────┐    ┌──────────────────┐  │
│  │ Picking UI      │     │ Mobile Checklist    │    │ 1C Integration   │  │
│  │ (задания)       │     │ (confirm + scan)    │    │ (Shipment docs)  │  │
│  └────────┬────────┘     └──────────┬──────────┘    └────────┬─────────┘  │
│           │                         │                        │             │
│           └─────────────────────────┼────────────────────────┘             │
│                                     ▼                                      │
│                           ┌─────────────────┐                              │
│                           │ Performance     │                              │
│                           │ Analytics       │                              │
│                           │ (pick time)     │                              │
│                           └─────────────────┘                              │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Ключевые метрики

| Метрика | Описание | Цель |
|---------|----------|------|
| **Pick Time** | Среднее время сборки одного заказа | -40% vs baseline |
| **Pick Accuracy** | % заказов без ошибок | >99% |
| **Distance Saved** | Сокращение пути по складу | -30% |
| **Picks per Hour** | Производительность работника | +50% |
| **Error Rate** | Ошибки сборки (wrong item/qty) | <1% |

---

## 2. Tech Stack

| Компонент | Библиотека | Версия | Описание |
|-----------|------------|--------|----------|
| **Route Optimization MVP** | Custom Nearest-Neighbor | - | Жадный алгоритм (JavaScript) |
| **Route Optimization v2** | `@google-or/solve` | ^9.x | Google OR-Tools (WASM) |
| **Barcode Scanning** | `quagga2` | ^1.x | Уже установлен (Phase 2) |
| **UI Components** | `@tanstack/react-table` | ^8.x | Таблица picking list |
| **Drag-n-Drop** | `@dnd-kit/core` | ^6.x | Ручная сортировка маршрута |
| **Mobile UX** | PWA + Service Worker | - | Offline capability |
| **Maps (optional)** | Custom SVG / Canvas | - | Визуализация склада |

### 2.1 Поэтапная реализация

1. **MVP (Week 1):** Nearest-Neighbor + Basic UI
   - Простой алгоритм оптимизации
   - Список товаров с локациями
   - Сканирование для подтверждения

2. **v2 (Week 2):** OR-Tools + Enhanced UX
   - Оптимальные маршруты
   - Batch picking (несколько заказов)
   - Wave picking (по зонам)

3. **v3 (Week 3):** 1C Integration + Analytics
   - Автоматическое создание отгрузочных документов
   - Дашборд производительности
   - AI verification (опционально)

---

## 3. Модель данных

### 3.1 Prisma Schema дополнения

```prisma
// ============================================
// Phase 5: Локации товаров на складе
// ============================================
model WarehouseLocation {
  id          Int      @id @default(autoincrement())
  warehouse   String   @db.VarChar(50)
  locationCode String  @map("location_code") @db.VarChar(20) // "A-01-02" (зона-ряд-полка)
  zone        String   @db.VarChar(10)     // "A", "B", "C" - зоны склада
  aisle       Int      // Ряд
  shelf       Int      // Полка
  position    Int      @default(1)         // Позиция на полке
  
  // Координаты для расчёта расстояния (опционально)
  coordX      Float?   @map("coord_x")
  coordY      Float?   @map("coord_y")
  
  // Метаданные
  maxCapacity Int?     @map("max_capacity")
  locationType String  @default("shelf") @map("location_type") @db.VarChar(20) // "shelf", "pallet", "bin", "floor"
  isActive    Boolean  @default(true) @map("is_active")
  
  // SKU на этой локации (one-to-many через InventoryLocation)
  inventoryLocations InventoryLocation[]
  
  @@unique([warehouse, locationCode])
  @@index([warehouse])
  @@index([zone])
  @@map("warehouse_locations")
}

// ============================================
// Phase 5: Связь товаров с локациями
// ============================================
model InventoryLocation {
  id         Int      @id @default(autoincrement())
  sku        String   @db.VarChar(50)
  locationId Int      @map("location_id")
  quantity   Int      @default(0)
  isPrimary  Boolean  @default(true) @map("is_primary") // Основная локация товара
  
  location   WarehouseLocation @relation(fields: [locationId], references: [id])
  
  @@unique([sku, locationId])
  @@index([sku])
  @@index([locationId])
  @@map("inventory_locations")
}

// ============================================
// Phase 5: Лист сборки (Picking List)
// ============================================
model PickingList {
  id              Int       @id @default(autoincrement())
  listNumber      String    @unique @map("list_number") @db.VarChar(30) // "PL-2026-01-31-001"
  warehouse       String    @db.VarChar(50)
  
  // Тип сборки
  pickingType     String    @map("picking_type") @db.VarChar(20) // "single", "batch", "wave"
  
  // Статус
  status          String    @default("created") @db.VarChar(20) // "created", "assigned", "in_progress", "completed", "cancelled"
  priority        Int       @default(0) // 0-низкий, 1-нормальный, 2-высокий, 3-срочный
  
  // Назначение
  assignedTo      String?   @map("assigned_to") @db.VarChar(100) // Worker ID/name
  assignedAt      DateTime? @map("assigned_at")
  
  // Время
  startedAt       DateTime? @map("started_at")
  completedAt     DateTime? @map("completed_at")
  estimatedMins   Int?      @map("estimated_mins") // Оценка времени сборки
  actualMins      Int?      @map("actual_mins")    // Фактическое время
  
  // Маршрут
  optimizedRoute  Json?     @map("optimized_route") // Последовательность локаций
  totalDistance   Float?    @map("total_distance")  // Расчётное расстояние (метры)
  
  // Связи
  items           PickingItem[]
  orders          PickingOrder[]
  
  // Метаданные
  notes           String?   @db.Text
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  @@index([warehouse])
  @@index([status])
  @@index([assignedTo])
  @@index([createdAt])
  @@map("picking_lists")
}

// ============================================
// Phase 5: Позиции в листе сборки
// ============================================
model PickingItem {
  id            Int       @id @default(autoincrement())
  pickingListId Int       @map("picking_list_id")
  
  // Товар
  sku           String    @db.VarChar(50)
  productName   String    @map("product_name") @db.VarChar(255)
  
  // Количество
  requiredQty   Int       @map("required_qty")  // Требуется собрать
  pickedQty     Int       @default(0) @map("picked_qty") // Фактически собрано
  
  // Локация
  locationCode  String    @map("location_code") @db.VarChar(20)
  zone          String    @db.VarChar(10)
  
  // Порядок обхода
  sequenceNum   Int       @map("sequence_num") // Порядковый номер в маршруте
  
  // Статус
  status        String    @default("pending") @db.VarChar(20) // "pending", "picked", "skipped", "shortage"
  
  // Подтверждение
  confirmedAt   DateTime? @map("confirmed_at")
  confirmedBy   String?   @map("confirmed_by") @db.VarChar(100)
  barcodeScan   String?   @map("barcode_scan") @db.VarChar(100) // Отсканированный штрихкод
  
  // Проблемы
  issueType     String?   @map("issue_type") @db.VarChar(30) // "not_found", "wrong_location", "damaged", "shortage"
  issueNote     String?   @map("issue_note") @db.Text
  
  // Связи
  pickingList   PickingList @relation(fields: [pickingListId], references: [id])
  
  @@index([pickingListId])
  @@index([sku])
  @@index([status])
  @@map("picking_items")
}

// ============================================
// Phase 5: Заказы в листе сборки (для batch picking)
// ============================================
model PickingOrder {
  id            Int       @id @default(autoincrement())
  pickingListId Int       @map("picking_list_id")
  
  // Заказ из 1C
  orderNumber   String    @map("order_number") @db.VarChar(50)
  customerName  String?   @map("customer_name") @db.VarChar(255)
  
  // Статус в контексте сборки
  status        String    @default("pending") @db.VarChar(20) // "pending", "in_progress", "completed"
  
  // Связь с документом 1C (после завершения)
  shipmentDocId String?   @map("shipment_doc_id") @db.VarChar(100)
  
  // Связи
  pickingList   PickingList @relation(fields: [pickingListId], references: [id])
  
  @@index([pickingListId])
  @@index([orderNumber])
  @@map("picking_orders")
}

// ============================================
// Phase 5: История сборок (аналитика)
// ============================================
model PickingHistory {
  id            Int       @id @default(autoincrement())
  pickingListId Int       @map("picking_list_id")
  workerId      String    @map("worker_id") @db.VarChar(100)
  warehouse     String    @db.VarChar(50)
  
  // Метрики
  itemCount     Int       @map("item_count")
  totalQty      Int       @map("total_qty")
  pickingMins   Int       @map("picking_mins")
  errorCount    Int       @default(0) @map("error_count")
  shortageCount Int       @default(0) @map("shortage_count")
  
  // Расчётные метрики
  picksPerHour  Float     @map("picks_per_hour")
  accuracy      Float     // 0.0 - 1.0
  
  // Сравнение с оценкой
  estimatedMins Int       @map("estimated_mins")
  efficiency    Float     // actual vs estimated (< 1.0 = быстрее ожидаемого)
  
  createdAt     DateTime  @default(now()) @map("created_at")
  
  @@index([workerId])
  @@index([warehouse])
  @@index([createdAt])
  @@map("picking_history")
}
```

---

## 4. Задачи

### 4.1 Блок 1: Warehouse Location Model (Day 1-2)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 1.1 | Prisma: WarehouseLocation model | `prisma/schema.prisma` | ⬜ |
| 1.2 | Prisma: InventoryLocation model | `prisma/schema.prisma` | ⬜ |
| 1.3 | LocationService | `src/server/services/location-service.ts` | ⬜ |
| 1.4 | tRPC: location router | `src/server/api/routers/location.ts` | ⬜ |
| 1.5 | Location import (CSV/JSON) | `scripts/import-locations.ts` | ⬜ |
| 1.6 | Unit-тесты LocationService | `src/__tests__/unit/location.test.ts` | ⬜ |

**LocationService API:**

```typescript
// src/server/services/location-service.ts

export interface LocationInput {
  warehouse: string;
  locationCode: string;  // "A-01-02"
  zone: string;          // "A"
  aisle: number;         // 1
  shelf: number;         // 2
  position?: number;     // 1
  coordX?: number;
  coordY?: number;
  maxCapacity?: number;
  locationType?: "shelf" | "pallet" | "bin" | "floor";
}

export class LocationService {
  /**
   * Создать локацию
   */
  async createLocation(input: LocationInput): Promise<WarehouseLocation>;

  /**
   * Получить все локации склада
   */
  async getLocations(warehouse: string): Promise<WarehouseLocation[]>;

  /**
   * Получить локации для товара
   */
  async getLocationsForSku(sku: string, warehouse: string): Promise<InventoryLocation[]>;

  /**
   * Назначить товар на локацию
   */
  async assignSkuToLocation(
    sku: string,
    locationId: number,
    quantity: number,
    isPrimary?: boolean
  ): Promise<InventoryLocation>;

  /**
   * Рассчитать расстояние между двумя локациями
   */
  calculateDistance(from: WarehouseLocation, to: WarehouseLocation): number;

  /**
   * Импорт локаций из CSV
   */
  async importFromCSV(warehouse: string, csvPath: string): Promise<number>;
}
```

**Формат локации:**

```
Код локации: "A-01-02"
             │  │   │
             │  │   └── Полка (shelf)
             │  └────── Ряд (aisle)
             └───────── Зона (zone)

Координаты (опционально):
- coordX: позиция по горизонтали (метры от входа)
- coordY: позиция по вертикали (метры от входа)
```

---

### 4.2 Блок 2: Route Optimization (Day 3-5)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 2.1 | RouteOptimizationService | `src/server/services/route-optimization.ts` | ⬜ |
| 2.2 | Nearest-Neighbor algorithm | `src/server/services/route-optimization.ts` | ⬜ |
| 2.3 | Zone-based optimization | `src/server/services/route-optimization.ts` | ⬜ |
| 2.4 | OR-Tools integration (v2) | `src/server/services/route-optimization.ts` | ⬜ |
| 2.5 | Distance matrix calculation | `src/server/services/route-optimization.ts` | ⬜ |
| 2.6 | Unit-тесты RouteOptimization | `src/__tests__/unit/route-optimization.test.ts` | ⬜ |

**RouteOptimizationService API:**

```typescript
// src/server/services/route-optimization.ts

export interface Location {
  code: string;
  zone: string;
  aisle: number;
  shelf: number;
  coordX?: number;
  coordY?: number;
}

export interface PickItem {
  sku: string;
  productName: string;
  quantity: number;
  location: Location;
}

export interface OptimizedRoute {
  items: PickItem[];        // Отсортированные по маршруту
  totalDistance: number;    // Общее расстояние (метры)
  estimatedMins: number;    // Оценка времени (минуты)
  algorithm: string;        // "nearest_neighbor" | "or_tools" | "zone_based"
}

export interface OptimizationConfig {
  algorithm: "nearest_neighbor" | "or_tools" | "zone_based";
  startLocation?: Location;  // Начальная точка (вход на склад)
  endLocation?: Location;    // Конечная точка (зона упаковки)
  walkingSpeedMps?: number;  // Скорость ходьбы м/сек (default: 1.4)
  pickTimeSeconds?: number;  // Время на один pick (default: 15)
}

export class RouteOptimizationService {
  /**
   * Оптимизировать маршрут сборки
   */
  optimize(items: PickItem[], config?: OptimizationConfig): OptimizedRoute;

  /**
   * Nearest-Neighbor алгоритм (MVP)
   * Жадный: всегда идём к ближайшей следующей точке
   * O(n²) сложность, ~90% от оптимума
   */
  nearestNeighbor(items: PickItem[], start?: Location): PickItem[];

  /**
   * Zone-based оптимизация
   * Сначала сортируем по зонам, затем внутри зоны по nearest-neighbor
   */
  zoneBased(items: PickItem[], start?: Location): PickItem[];

  /**
   * Google OR-Tools (Advanced)
   * Оптимальное решение TSP
   */
  orToolsOptimize(items: PickItem[]): Promise<PickItem[]>;

  /**
   * Рассчитать матрицу расстояний
   */
  buildDistanceMatrix(locations: Location[]): number[][];

  /**
   * Рассчитать расстояние между точками
   * Использует Manhattan distance если нет координат
   */
  calculateDistance(from: Location, to: Location): number;

  /**
   * Оценить время сборки
   */
  estimatePickingTime(route: OptimizedRoute, config?: OptimizationConfig): number;
}
```

**Алгоритмы оптимизации:**

```typescript
// Nearest-Neighbor (MVP)
function nearestNeighbor(items: PickItem[], start?: Location): PickItem[] {
  const result: PickItem[] = [];
  const remaining = [...items];
  let current = start ?? remaining[0]?.location;

  while (remaining.length > 0) {
    // Найти ближайший элемент
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateDistance(current!, remaining[i]!.location);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    // Добавить в результат и удалить из remaining
    const nearest = remaining.splice(nearestIdx, 1)[0]!;
    result.push(nearest);
    current = nearest.location;
  }

  return result;
}

// Zone-based (сортировка по зонам, затем NN внутри зоны)
function zoneBased(items: PickItem[]): PickItem[] {
  // Группируем по зонам
  const byZone = items.reduce((acc, item) => {
    const zone = item.location.zone;
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(item);
    return acc;
  }, {} as Record<string, PickItem[]>);

  // Сортируем зоны (A, B, C...)
  const sortedZones = Object.keys(byZone).sort();

  // Применяем NN внутри каждой зоны
  const result: PickItem[] = [];
  for (const zone of sortedZones) {
    const zoneItems = byZone[zone]!;
    const optimized = nearestNeighbor(zoneItems);
    result.push(...optimized);
  }

  return result;
}

// Manhattan Distance (для локаций без координат)
function manhattanDistance(from: Location, to: Location): number {
  // Расстояние между зонами (примерно 10м между зонами)
  const zoneDist = Math.abs(from.zone.charCodeAt(0) - to.zone.charCodeAt(0)) * 10;
  
  // Расстояние между рядами (примерно 3м между рядами)
  const aisleDist = Math.abs(from.aisle - to.aisle) * 3;
  
  // Расстояние между полками (примерно 0.5м между полками)
  const shelfDist = Math.abs(from.shelf - to.shelf) * 0.5;

  return zoneDist + aisleDist + shelfDist;
}

// Euclidean Distance (для локаций с координатами)
function euclideanDistance(from: Location, to: Location): number {
  if (from.coordX === undefined || to.coordX === undefined) {
    return manhattanDistance(from, to);
  }
  
  const dx = to.coordX - from.coordX;
  const dy = to.coordY! - from.coordY!;
  return Math.sqrt(dx * dx + dy * dy);
}
```

---

### 4.3 Блок 3: Picking List Service (Day 6-8)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 3.1 | Prisma: PickingList, PickingItem models | `prisma/schema.prisma` | ⬜ |
| 3.2 | PickingListService | `src/server/services/picking-list-service.ts` | ⬜ |
| 3.3 | Create picking list from orders | `src/server/services/picking-list-service.ts` | ⬜ |
| 3.4 | Batch picking (объединение заказов) | `src/server/services/picking-list-service.ts` | ⬜ |
| 3.5 | Wave picking (по зонам) | `src/server/services/picking-list-service.ts` | ⬜ |
| 3.6 | Pick confirmation flow | `src/server/services/picking-list-service.ts` | ⬜ |
| 3.7 | tRPC: picking router | `src/server/api/routers/picking.ts` | ⬜ |
| 3.8 | Unit-тесты PickingListService | `src/__tests__/unit/picking.test.ts` | ⬜ |

**PickingListService API:**

```typescript
// src/server/services/picking-list-service.ts

export interface CreatePickingListInput {
  warehouse: string;
  orders: Array<{
    orderNumber: string;
    customerName?: string;
    items: Array<{
      sku: string;
      quantity: number;
    }>;
  }>;
  pickingType?: "single" | "batch" | "wave";
  priority?: number;
  assignTo?: string;
}

export interface PickConfirmation {
  itemId: number;
  pickedQty: number;
  barcodeScan?: string;
  confirmedBy: string;
}

export interface PickIssue {
  itemId: number;
  issueType: "not_found" | "wrong_location" | "damaged" | "shortage";
  note?: string;
}

export class PickingListService {
  /**
   * Создать лист сборки из заказов
   */
  async createPickingList(input: CreatePickingListInput): Promise<PickingList>;

  /**
   * Получить лист сборки с оптимизированным маршрутом
   */
  async getPickingList(listId: number): Promise<PickingList & { items: PickingItem[] }>;

  /**
   * Получить активные листы для работника
   */
  async getAssignedLists(workerId: string): Promise<PickingList[]>;

  /**
   * Назначить лист на работника
   */
  async assignToWorker(listId: number, workerId: string): Promise<PickingList>;

  /**
   * Начать сборку
   */
  async startPicking(listId: number, workerId: string): Promise<PickingList>;

  /**
   * Подтвердить сборку позиции
   */
  async confirmPick(confirmation: PickConfirmation): Promise<PickingItem>;

  /**
   * Сообщить о проблеме
   */
  async reportIssue(issue: PickIssue): Promise<PickingItem>;

  /**
   * Завершить сборку
   */
  async completePicking(listId: number, workerId: string): Promise<PickingList>;

  /**
   * Batch Picking: объединить несколько заказов в один лист
   * Товары группируются по SKU для одного прохода по складу
   */
  async createBatchPicking(
    warehouse: string,
    orderNumbers: string[]
  ): Promise<PickingList>;

  /**
   * Wave Picking: разделить большой лист по зонам
   * Каждый работник собирает свою зону
   */
  async createWavePicking(
    warehouse: string,
    orders: CreatePickingListInput["orders"],
    zones: string[]
  ): Promise<PickingList[]>;

  /**
   * Генерировать номер листа
   */
  generateListNumber(): string;
}
```

**Типы сборки:**

| Тип | Описание | Когда использовать |
|-----|----------|-------------------|
| **Single** | Один заказ = один лист | Крупные заказы, VIP клиенты |
| **Batch** | Несколько заказов объединены | Много мелких заказов |
| **Wave** | Разделение по зонам | Большой склад, много работников |

---

### 4.4 Блок 4: Picking UI (Day 9-12)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 4.1 | Picking Page | `src/app/picking/page.tsx` | ⬜ |
| 4.2 | PickingListTable component | `src/app/_components/picking/PickingListTable.tsx` | ⬜ |
| 4.3 | PickingItemCard component | `src/app/_components/picking/PickingItemCard.tsx` | ⬜ |
| 4.4 | PickingConfirmModal component | `src/app/_components/picking/PickingConfirmModal.tsx` | ⬜ |
| 4.5 | RouteVisualization component | `src/app/_components/picking/RouteVisualization.tsx` | ⬜ |
| 4.6 | PickingProgress component | `src/app/_components/picking/PickingProgress.tsx` | ⬜ |
| 4.7 | CreatePickingListForm | `src/app/_components/picking/CreatePickingListForm.tsx` | ⬜ |
| 4.8 | Mobile-optimized picking view | `src/app/picking/[id]/page.tsx` | ⬜ |
| 4.9 | Index exports | `src/app/_components/picking/index.ts` | ⬜ |

**Picking Page Layout (Desktop - Manager View):**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  📋 Управление сборкой                  [Склад: Москва ▼] [+ Новый лист]   │
├────────────────────────────────────────────────────────────────────────────┤
│  📊 Статистика сегодня                                                     │
│  ├─ Создано: 45        ├─ В работе: 12       ├─ Завершено: 30             │
│  └─ Picks/час: 42      └─ Среднее время: 8 мин └─ Ошибки: 2 (0.5%)        │
├────────────────────────────────────────────────────────────────────────────┤
│  📦 Активные листы сборки                           [Фильтр ▼] [Поиск 🔍] │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ № Листа       │ Тип    │ Позиций │ Работник  │ Статус   │ Действия │  │
│  ├───────────────┼────────┼─────────┼───────────┼──────────┼──────────┤  │
│  │ PL-2026-01-001│ Batch  │   12    │ Иванов А. │ 🟡 Сборка │ [👁] [✏]│  │
│  │ PL-2026-01-002│ Single │    5    │    —      │ 🔵 Создан │ [👤] [🗑]│  │
│  │ PL-2026-01-003│ Wave   │   28    │ Петров В. │ 🟡 Сборка │ [👁] [✏]│  │
│  └─────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  🚶 Работники онлайн                                                       │
│  ├─ [🟢] Иванов А. — PL-001 (8/12 позиций)                                │
│  ├─ [🟢] Петров В. — PL-003 (15/28 позиций)                               │
│  └─ [⚪] Сидоров К. — Свободен                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Mobile Picking View (Worker):**

```
┌────────────────────────────────────────┐
│  📋 Лист PL-2026-01-001                │
│  Batch • 12 позиций • ~15 мин          │
├────────────────────────────────────────┤
│  ████████░░░░░░░░░░░░  4/12 (33%)      │
├────────────────────────────────────────┤
│  📍 Следующая позиция                  │
│  ┌──────────────────────────────────┐  │
│  │  🏷️ Болт М8x30 (SKU-001)         │  │
│  │                                   │  │
│  │  📦 Количество: 25 шт            │  │
│  │  📍 Локация: A-03-02             │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │    [Сканировать штрихкод]   │ │  │
│  │  │           или               │ │  │
│  │  │    [Подтвердить вручную]    │ │  │
│  │  └─────────────────────────────┘ │  │
│  │                                   │  │
│  │  [⚠️ Проблема]                    │  │
│  └──────────────────────────────────┘  │
├────────────────────────────────────────┤
│  📋 Остальные позиции (свернуто)       │
│  ├─ B-01-05: Гайка М10 × 50           │
│  ├─ B-02-03: Шайба 12мм × 100         │
│  └─ ... ещё 5 позиций                  │
├────────────────────────────────────────┤
│         [🏁 Завершить сборку]          │
└────────────────────────────────────────┘
```

**PickingItemCard Component:**

```typescript
// src/app/_components/picking/PickingItemCard.tsx

interface PickingItemCardProps {
  item: {
    id: number;
    sku: string;
    productName: string;
    requiredQty: number;
    pickedQty: number;
    locationCode: string;
    zone: string;
    status: "pending" | "picked" | "skipped" | "shortage";
    sequenceNum: number;
  };
  isActive: boolean;
  onConfirm: (itemId: number, qty: number, barcode?: string) => void;
  onReportIssue: (itemId: number, issue: string, note?: string) => void;
}

export function PickingItemCard({
  item,
  isActive,
  onConfirm,
  onReportIssue,
}: PickingItemCardProps) {
  return (
    <div className={cn(
      "rounded-lg border p-4 transition-all",
      isActive && "ring-2 ring-blue-500 bg-blue-50",
      item.status === "picked" && "bg-green-50 border-green-200",
      item.status === "shortage" && "bg-red-50 border-red-200",
    )}>
      {/* ... */}
    </div>
  );
}
```

---

### 4.5 Блок 5: 1C Integration (Day 13-14)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 5.1 | Import orders from 1C | `src/server/services/one-c-client.ts` | ⬜ |
| 5.2 | Create Shipment document in 1C | `src/server/services/one-c-client.ts` | ⬜ |
| 5.3 | Auto-sync picking completion | `src/server/services/picking-list-service.ts` | ⬜ |
| 5.4 | Webhook: order status updates | `src/app/api/webhooks/one-c/route.ts` | ⬜ |
| 5.5 | Integration tests | `src/__tests__/integration/picking.test.ts` | ⬜ |

**1C Integration Flow:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      1C ↔ Picking Integration                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1C Orders                    AI Stock Keeper                       │
│  ┌─────────┐                 ┌──────────────┐                       │
│  │ Order 1 │─────────────────▶│              │                       │
│  │ Order 2 │      Import      │ Picking List │                       │
│  │ Order 3 │─────────────────▶│              │                       │
│  └─────────┘                 └──────┬───────┘                       │
│                                     │                               │
│                                     │ Сборка завершена              │
│                                     ▼                               │
│                              ┌──────────────┐                       │
│                              │ Create       │                       │
│                              │ Shipment Doc │                       │
│                              └──────┬───────┘                       │
│                                     │                               │
│                                     ▼                               │
│  1C Documents                ┌──────────────┐                       │
│  ┌───────────┐◀──────────────│ POST to 1C   │                       │
│  │ Shipment  │    Sync       │ API          │                       │
│  │ Document  │◀──────────────│              │                       │
│  └───────────┘               └──────────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**1C API расширения:**

```typescript
// src/server/services/one-c-client.ts (дополнения)

export interface OrderItem {
  sku: string;
  productName: string;
  quantity: number;
  price?: number;
}

export interface Order1C {
  orderNumber: string;
  customerName: string;
  warehouse: string;
  items: OrderItem[];
  status: "new" | "confirmed" | "in_picking" | "shipped" | "cancelled";
  createdAt: Date;
}

export interface ShipmentInput {
  orderNumber: string;
  pickingListId: number;
  items: Array<{
    sku: string;
    quantity: number; // Фактически отгружено
  }>;
  warehouse: string;
  shippedAt?: Date;
}

export class OneCClient {
  // ... existing methods ...

  /**
   * Получить заказы, готовые к сборке
   */
  async getOrdersForPicking(warehouse: string): Promise<Order1C[]>;

  /**
   * Получить детали заказа
   */
  async getOrderDetails(orderNumber: string): Promise<Order1C>;

  /**
   * Создать документ отгрузки
   */
  async createShipmentDocument(input: ShipmentInput): Promise<Document1C>;

  /**
   * Обновить статус заказа в 1C
   */
  async updateOrderStatus(
    orderNumber: string,
    status: "in_picking" | "shipped"
  ): Promise<void>;
}
```

---

### 4.6 Блок 6: Analytics & Performance (Day 15)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 6.1 | PickingAnalyticsService | `src/server/services/picking-analytics.ts` | ⬜ |
| 6.2 | Worker performance metrics | `src/server/services/picking-analytics.ts` | ⬜ |
| 6.3 | Dashboard widget | `src/app/_components/dashboard/PickingWidget.tsx` | ⬜ |
| 6.4 | tRPC: analytics endpoints | `src/server/api/routers/picking.ts` | ⬜ |
| 6.5 | Export reports | `src/server/services/picking-analytics.ts` | ⬜ |

**PickingAnalyticsService API:**

```typescript
// src/server/services/picking-analytics.ts

export interface PickingStats {
  period: "today" | "week" | "month";
  totalLists: number;
  completedLists: number;
  totalItems: number;
  totalQuantity: number;
  avgPickingMins: number;
  picksPerHour: number;
  accuracy: number;          // % без ошибок
  shortageRate: number;      // % недостач
}

export interface WorkerPerformance {
  workerId: string;
  workerName: string;
  completedLists: number;
  totalItems: number;
  avgPickingMins: number;
  picksPerHour: number;
  accuracy: number;
  efficiency: number;        // vs estimated time
  trend: "improving" | "stable" | "declining";
}

export class PickingAnalyticsService {
  /**
   * Общая статистика сборки
   */
  async getStats(warehouse: string, period: string): Promise<PickingStats>;

  /**
   * Производительность работников
   */
  async getWorkerPerformance(
    warehouse: string,
    period: string
  ): Promise<WorkerPerformance[]>;

  /**
   * Топ ошибок сборки
   */
  async getTopIssues(warehouse: string, limit?: number): Promise<Array<{
    issueType: string;
    count: number;
    skus: string[];
  }>>;

  /**
   * Тренд производительности
   */
  async getPerformanceTrend(
    warehouse: string,
    days: number
  ): Promise<Array<{
    date: string;
    picksPerHour: number;
    accuracy: number;
  }>>;

  /**
   * Сохранить историю сборки
   */
  async recordPickingHistory(
    pickingList: PickingList,
    workerId: string
  ): Promise<PickingHistory>;
}
```

**Dashboard Widget:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  📋 Сборка сегодня                                          [Подробнее →] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │     30      │  │    8 мин    │  │   42/час    │  │   99.5%     │       │
│  │  Завершено  │  │ Среднее вр. │  │ Picks/час   │  │  Точность   │       │
│  │   ↑12%      │  │   ↓15%      │  │   ↑8%       │  │    =        │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                            │
│  📈 Активность по часам                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │    ██                                                               │   │
│  │    ██  ████                                                         │   │
│  │    ██  ████  ████████                                               │   │
│  │    ██  ████  ████████  ████  ████  ████                             │   │
│  │ ───08──09────10────────11────12────13────14────15────16────17───    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.7 Блок 7: Backend API

| ID | Endpoint | Описание | Статус |
|----|----------|----------|--------|
| 7.1 | `location.getAll` | Все локации склада | ⬜ |
| 7.2 | `location.create` | Создать локацию | ⬜ |
| 7.3 | `location.assignSku` | Назначить товар на локацию | ⬜ |
| 7.4 | `location.import` | Импорт из CSV | ⬜ |
| 7.5 | `picking.create` | Создать лист сборки | ⬜ |
| 7.6 | `picking.getList` | Получить лист с маршрутом | ⬜ |
| 7.7 | `picking.getAssigned` | Листы работника | ⬜ |
| 7.8 | `picking.assign` | Назначить на работника | ⬜ |
| 7.9 | `picking.start` | Начать сборку | ⬜ |
| 7.10 | `picking.confirmItem` | Подтвердить позицию | ⬜ |
| 7.11 | `picking.reportIssue` | Сообщить о проблеме | ⬜ |
| 7.12 | `picking.complete` | Завершить сборку | ⬜ |
| 7.13 | `picking.getStats` | Статистика сборки | ⬜ |
| 7.14 | `picking.getWorkerPerformance` | Производительность работников | ⬜ |

**tRPC Routers:**

```typescript
// src/server/api/routers/location.ts

export const locationRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({ warehouse: z.string() }))
    .query(async ({ input }) => {
      return locationService.getLocations(input.warehouse);
    }),

  create: publicProcedure
    .input(z.object({
      warehouse: z.string(),
      locationCode: z.string(),
      zone: z.string(),
      aisle: z.number(),
      shelf: z.number(),
      coordX: z.number().optional(),
      coordY: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return locationService.createLocation(input);
    }),

  assignSku: publicProcedure
    .input(z.object({
      sku: z.string(),
      locationId: z.number(),
      quantity: z.number(),
      isPrimary: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return locationService.assignSkuToLocation(
        input.sku,
        input.locationId,
        input.quantity,
        input.isPrimary
      );
    }),
});

// src/server/api/routers/picking.ts

export const pickingRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({
      warehouse: z.string(),
      orders: z.array(z.object({
        orderNumber: z.string(),
        customerName: z.string().optional(),
        items: z.array(z.object({
          sku: z.string(),
          quantity: z.number(),
        })),
      })),
      pickingType: z.enum(["single", "batch", "wave"]).optional(),
      priority: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return pickingListService.createPickingList(input);
    }),

  getList: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return pickingListService.getPickingList(input.id);
    }),

  confirmItem: publicProcedure
    .input(z.object({
      itemId: z.number(),
      pickedQty: z.number(),
      barcodeScan: z.string().optional(),
      confirmedBy: z.string(),
    }))
    .mutation(async ({ input }) => {
      return pickingListService.confirmPick(input);
    }),

  reportIssue: publicProcedure
    .input(z.object({
      itemId: z.number(),
      issueType: z.enum(["not_found", "wrong_location", "damaged", "shortage"]),
      note: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return pickingListService.reportIssue(input);
    }),

  complete: publicProcedure
    .input(z.object({
      listId: z.number(),
      workerId: z.string(),
    }))
    .mutation(async ({ input }) => {
      return pickingListService.completePicking(input.listId, input.workerId);
    }),

  getStats: publicProcedure
    .input(z.object({
      warehouse: z.string(),
      period: z.enum(["today", "week", "month"]).default("today"),
    }))
    .query(async ({ input }) => {
      return pickingAnalyticsService.getStats(input.warehouse, input.period);
    }),
});
```

---

### 4.8 Блок 8: Тестирование

| ID | Задача | Тип | Статус |
|----|--------|-----|--------|
| 8.1 | Unit-тесты RouteOptimization | Jest | ⬜ |
| 8.2 | Unit-тесты PickingListService | Jest | ⬜ |
| 8.3 | Unit-тесты LocationService | Jest | ⬜ |
| 8.4 | Integration: picking flow | Jest | ⬜ |
| 8.5 | Integration: 1C shipment | Jest | ⬜ |
| 8.6 | E2E: mobile picking | Playwright | ⬜ |
| 8.7 | Performance: route optimization | Jest | ⬜ |
| 8.8 | Benchmark: NN vs OR-Tools | Manual | ⬜ |

**Test Cases:**

```typescript
// src/__tests__/unit/route-optimization.test.ts

describe("RouteOptimizationService", () => {
  describe("nearestNeighbor", () => {
    it("should return items in optimal order", () => {
      const items: PickItem[] = [
        { sku: "1", productName: "A", quantity: 1, location: { code: "C-01-01", zone: "C", aisle: 1, shelf: 1 } },
        { sku: "2", productName: "B", quantity: 1, location: { code: "A-01-01", zone: "A", aisle: 1, shelf: 1 } },
        { sku: "3", productName: "C", quantity: 1, location: { code: "B-01-01", zone: "B", aisle: 1, shelf: 1 } },
      ];

      const start = { code: "A-00-00", zone: "A", aisle: 0, shelf: 0 };
      const result = routeService.nearestNeighbor(items, start);

      // Должен начать с зоны A (ближайшая к старту)
      expect(result[0]?.location.zone).toBe("A");
    });

    it("should handle empty array", () => {
      const result = routeService.nearestNeighbor([]);
      expect(result).toEqual([]);
    });

    it("should handle single item", () => {
      const items: PickItem[] = [
        { sku: "1", productName: "A", quantity: 1, location: { code: "A-01-01", zone: "A", aisle: 1, shelf: 1 } },
      ];
      const result = routeService.nearestNeighbor(items);
      expect(result).toHaveLength(1);
    });
  });

  describe("zoneBased", () => {
    it("should group items by zone first", () => {
      const items: PickItem[] = [
        { sku: "1", productName: "A", quantity: 1, location: { code: "C-01-01", zone: "C", aisle: 1, shelf: 1 } },
        { sku: "2", productName: "B", quantity: 1, location: { code: "A-01-01", zone: "A", aisle: 1, shelf: 1 } },
        { sku: "3", productName: "C", quantity: 1, location: { code: "A-02-01", zone: "A", aisle: 2, shelf: 1 } },
        { sku: "4", productName: "D", quantity: 1, location: { code: "B-01-01", zone: "B", aisle: 1, shelf: 1 } },
      ];

      const result = routeService.zoneBased(items);

      // Все товары зоны A должны идти подряд
      const aIndices = result
        .map((item, idx) => item.location.zone === "A" ? idx : -1)
        .filter(idx => idx !== -1);

      expect(aIndices).toEqual([0, 1]); // Зона A первая
    });
  });

  describe("calculateDistance", () => {
    it("should use Manhattan distance for locations without coords", () => {
      const from = { code: "A-01-01", zone: "A", aisle: 1, shelf: 1 };
      const to = { code: "B-03-05", zone: "B", aisle: 3, shelf: 5 };

      const distance = routeService.calculateDistance(from, to);

      // Zone diff: 1 × 10m = 10m
      // Aisle diff: 2 × 3m = 6m
      // Shelf diff: 4 × 0.5m = 2m
      // Total: 18m
      expect(distance).toBe(18);
    });

    it("should use Euclidean distance when coords available", () => {
      const from = { code: "A-01-01", zone: "A", aisle: 1, shelf: 1, coordX: 0, coordY: 0 };
      const to = { code: "A-01-02", zone: "A", aisle: 1, shelf: 2, coordX: 3, coordY: 4 };

      const distance = routeService.calculateDistance(from, to);

      // √(3² + 4²) = 5
      expect(distance).toBe(5);
    });
  });

  describe("estimatePickingTime", () => {
    it("should calculate based on distance and item count", () => {
      const route: OptimizedRoute = {
        items: Array(10).fill({ sku: "1", productName: "A", quantity: 1, location: {} }),
        totalDistance: 100, // 100 метров
        estimatedMins: 0,
        algorithm: "nearest_neighbor",
      };

      const time = routeService.estimatePickingTime(route, {
        walkingSpeedMps: 1.0,  // 1 м/сек
        pickTimeSeconds: 15,   // 15 сек на pick
      });

      // Walking: 100m / 1m/s = 100s
      // Picking: 10 items × 15s = 150s
      // Total: 250s = 4.17 mins
      expect(time).toBeCloseTo(4.17, 1);
    });
  });
});
```

```typescript
// src/__tests__/unit/picking.test.ts

describe("PickingListService", () => {
  describe("createPickingList", () => {
    it("should create list with optimized route", async () => {
      const input: CreatePickingListInput = {
        warehouse: "MSK-01",
        orders: [{
          orderNumber: "ORD-001",
          items: [
            { sku: "SKU-001", quantity: 10 },
            { sku: "SKU-002", quantity: 5 },
          ],
        }],
      };

      const list = await pickingService.createPickingList(input);

      expect(list.status).toBe("created");
      expect(list.items).toHaveLength(2);
      expect(list.optimizedRoute).toBeDefined();
      expect(list.totalDistance).toBeGreaterThan(0);
    });

    it("should assign sequence numbers based on route", async () => {
      // ... test that items have correct sequenceNum
    });
  });

  describe("confirmPick", () => {
    it("should update item status to picked", async () => {
      const item = await pickingService.confirmPick({
        itemId: 1,
        pickedQty: 10,
        confirmedBy: "worker-1",
      });

      expect(item.status).toBe("picked");
      expect(item.pickedQty).toBe(10);
    });

    it("should mark as shortage if qty < required", async () => {
      const item = await pickingService.confirmPick({
        itemId: 1,
        pickedQty: 5, // required is 10
        confirmedBy: "worker-1",
      });

      expect(item.status).toBe("shortage");
    });
  });

  describe("completePicking", () => {
    it("should create 1C shipment document", async () => {
      const list = await pickingService.completePicking(1, "worker-1");

      expect(list.status).toBe("completed");
      expect(list.completedAt).toBeDefined();
      // Should trigger 1C integration
    });

    it("should record picking history", async () => {
      await pickingService.completePicking(1, "worker-1");

      const history = await db.pickingHistory.findFirst({
        where: { pickingListId: 1 },
      });

      expect(history).toBeDefined();
      expect(history?.workerId).toBe("worker-1");
    });
  });
});
```

---

## 5. Environment Variables

```env
# Route Optimization
ROUTE_OPTIMIZATION_ALGORITHM=nearest_neighbor  # "nearest_neighbor" | "or_tools" | "zone_based"

# Warehouse defaults
WAREHOUSE_WALKING_SPEED_MPS=1.4    # Скорость ходьбы м/сек
WAREHOUSE_PICK_TIME_SECONDS=15    # Время на один pick

# OR-Tools (v2)
OR_TOOLS_TIMEOUT_MS=5000          # Таймаут для OR-Tools

# 1C Integration
ONE_C_AUTO_CREATE_SHIPMENT=true   # Автоматически создавать отгрузку
```

---

## 6. Таймлайн

```
Week 1 (Days 1-5) - Foundation
├── Day 1: Prisma models (Location, InventoryLocation)
├── Day 2: LocationService, CSV import
├── Day 3: RouteOptimizationService (Nearest-Neighbor)
├── Day 4: RouteOptimizationService (Zone-based, distance matrix)
└── Day 5: Unit tests, tRPC endpoints

Week 2 (Days 6-10) - Picking Core
├── Day 6: Prisma models (PickingList, PickingItem)
├── Day 7: PickingListService (create, optimize)
├── Day 8: PickingListService (confirm, complete)
├── Day 9: Picking Page UI (Desktop)
├── Day 10: Picking Item Card, Progress components

Week 3 (Days 11-15) - Integration & Polish
├── Day 11: Mobile picking view
├── Day 12: 1C integration (orders import, shipment)
├── Day 13: Analytics service, dashboard widget
├── Day 14: OR-Tools integration (optional v2)
└── Day 15: Testing, documentation, performance benchmark
```

---

## 7. Файловая структура

```
src/
├── app/
│   ├── picking/
│   │   ├── page.tsx                    # Управление сборкой (desktop)
│   │   └── [id]/
│   │       └── page.tsx                # Мобильная сборка
│   └── _components/
│       ├── picking/
│       │   ├── index.ts
│       │   ├── PickingListTable.tsx    # Таблица листов
│       │   ├── PickingItemCard.tsx     # Карточка позиции
│       │   ├── PickingConfirmModal.tsx # Модалка подтверждения
│       │   ├── PickingProgress.tsx     # Прогресс сборки
│       │   ├── RouteVisualization.tsx  # Визуализация маршрута
│       │   └── CreatePickingListForm.tsx
│       └── dashboard/
│           └── PickingWidget.tsx       # Виджет на дашборде
├── server/
│   ├── services/
│   │   ├── location-service.ts         # Управление локациями
│   │   ├── route-optimization.ts       # Оптимизация маршрутов
│   │   ├── picking-list-service.ts     # Листы сборки
│   │   └── picking-analytics.ts        # Аналитика
│   └── api/
│       └── routers/
│           ├── location.ts             # tRPC router
│           └── picking.ts              # tRPC router
├── __tests__/
│   ├── unit/
│   │   ├── location.test.ts
│   │   ├── route-optimization.test.ts
│   │   └── picking.test.ts
│   └── integration/
│       └── picking.test.ts
└── scripts/
    └── import-locations.ts             # Импорт локаций
```

---

## 8. Критерии успеха

| Метрика | Цель | Измерение |
|---------|------|-----------|
| **Pick Time Reduction** | -40% | Avg time before vs after |
| **Pick Accuracy** | >99% | (correct picks / total picks) |
| **Route Efficiency** | >85% | (optimal distance / actual distance) |
| **Worker Productivity** | +50% picks/hour | Before vs after |
| **1C Sync Success** | >99% | Shipment docs created |
| **Mobile UX** | <3 taps per pick | User testing |
| **Page Load** | <2 sec | First Contentful Paint |

---

## 9. Риски и митигации

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Нет данных о локациях | Высокая | Высокое | CSV import tool, ручной ввод UI |
| OR-Tools сложен в интеграции | Средняя | Низкое | Nearest-Neighbor достаточен для MVP |
| Работники не хотят сканировать | Средняя | Среднее | Опция ручного подтверждения |
| Склад без зонирования | Средняя | Среднее | Fallback на простой список |
| 1C API rate limits | Низкая | Среднее | Batch создание документов |
| Offline на складе | Средняя | Высокое | PWA с локальным кешем |

---

## 10. Зависимости от предыдущих фаз

| Компонент | Использование в Phase 5 |
|-----------|-------------------------|
| `Inventory` model | Текущие остатки для проверки |
| `Transaction` model | Создание picking транзакций |
| `OneCClient` | Импорт заказов, создание отгрузок |
| `BarcodeService` | Сканирование при подтверждении |
| `AlertService` | Алерты о проблемах сборки |
| `Dashboard` | PickingWidget интеграция |

---

## 11. Optional: AI Verification (Future)

### 11.1 Концепция

После сборки заказа работник фотографирует собранные товары. AI проверяет:
- Все ли товары на фото
- Правильное ли количество
- Нет ли повреждений

### 11.2 Tech Stack (если реализовывать)

| Компонент | Варианты |
|-----------|----------|
| **Object Detection** | YOLO v8, TensorFlow.js |
| **Cloud Vision** | Google Cloud Vision, AWS Rekognition |
| **Training** | Custom model на товарах клиента |

### 11.3 Flow

```
┌─────────────────────────────────────────────────────────────┐
│  📸 Worker takes photo → AI analyzes → ✅ Confirm / ⚠️ Alert │
└─────────────────────────────────────────────────────────────┘
```

**Приоритет:** Low (Phase 7+)

---

## 12. Следующие шаги

После завершения Phase 5:
- [ ] **Phase 6:** Multi-Warehouse Sync
- [ ] **Phase 7:** Mobile App (PWA / React Native)
- [ ] **Future:** AI Verification
- [ ] **Future:** Voice-guided picking

---

**Документ создан:** 2026-01-31  
**Последнее обновление:** 2026-01-31  
**Статус:** 📋 Планирование  
**Автор:** AI Stock Keeper Team
