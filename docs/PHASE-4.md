# Phase 4: Predictive Analytics

**Цель:** Прогнозирование запасов, рекомендации по дозаказу  
**Срок:** 3 недели (Week 8-10)  
**Статус:** ✅ MVP Реализован  
**Дата создания:** 2026-01-31  
**Дата завершения MVP:** 2026-01-31

---

## 1. Обзор

### 1.1 Deliverable

Система прогнозирования спроса с рекомендациями по дозаказу товаров до момента их истощения.

### 1.2 User Story

```
Как менеджер склада,
я хочу видеть прогноз запасов на 7-30 дней вперёд,
получать рекомендации когда и сколько заказать,
чтобы избежать stockout и минимизировать затоваривание.
```

### 1.3 Архитектура

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Predictive Analytics Flow                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 Transaction History                                                      │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────┐     ┌─────────────────────────────────────────┐   │
│  │ ConsumptionService  │────▶│ ForecastService                         │   │
│  │ (агрегация данных)  │     │ ┌─────────────────────────────────────┐ │   │
│  └─────────────────────┘     │ │ MVP: Simple Moving Average (SMA)   │ │   │
│                              │ │ v2:  Prophet (Python microservice) │ │   │
│                              │ │ v3:  AutoML (optional)             │ │   │
│                              │ └─────────────────────────────────────┘ │   │
│                              └───────────────┬─────────────────────────┘   │
│                                              │                             │
│                 ┌────────────────────────────┼────────────────────┐        │
│                 ▼                            ▼                    ▼        │
│        ┌─────────────────┐       ┌─────────────────┐    ┌──────────────┐  │
│        │ ReorderService  │       │ Forecast API    │    │ 📈 Charts    │  │
│        │ (рекомендации)  │       │ (tRPC router)   │    │ (Recharts)   │  │
│        └────────┬────────┘       └─────────────────┘    └──────────────┘  │
│                 │                                                         │
│                 ▼                                                         │
│        ┌─────────────────┐                                               │
│        │ 📧 Proactive    │                                               │
│        │    Alerts       │                                               │
│        └─────────────────┘                                               │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Ключевые метрики прогноза

| Метрика | Описание | Формула |
|---------|----------|---------|
| **MAPE** | Mean Absolute Percentage Error | Σ\|actual-forecast\|/actual / n |
| **Days to Stockout** | Дней до нулевого остатка | current_qty / avg_daily_consumption |
| **Reorder Point** | Точка заказа | lead_time_days × avg_daily + safety_stock |
| **Safety Stock** | Страховой запас | z_score × σ × √lead_time |

---

## 2. Tech Stack

| Компонент | Библиотека | Версия | Описание |
|-----------|------------|--------|----------|
| **MVP Forecast** | Custom SMA | - | Simple Moving Average (JavaScript) |
| **Exponential Smoothing** | Custom EMA | - | Weighted recent data more |
| **Prophet** | `prophet` | ^1.x | Facebook's forecasting (Python) |
| **Charts** | `recharts` | ^2.x | Forecast visualization |
| **Date Utils** | `date-fns` | ^3.x | Date calculations |

### 2.1 Почему такой подход

**Поэтапная реализация:**

1. **MVP (Week 1):** Simple Moving Average
   - Быстро реализовать
   - Понятно бизнесу
   - Достаточно для товаров со стабильным спросом

2. **v2 (Week 2-3):** Prophet Microservice
   - Обрабатывает сезонность
   - Holidays (праздники)
   - Тренды и аномалии

3. **v3 (Future):** AutoML
   - Для enterprise клиентов
   - Автоматический выбор модели

---

## 3. Задачи

### 3.1 Блок 1: Data Aggregation Layer (Day 1-2)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 1.1 | ConsumptionService | `src/server/services/consumption-service.ts` | ✅ |
| 1.2 | Prisma: DailyConsumption model | `prisma/schema.prisma` | ✅ |
| 1.3 | Consumption aggregation job | `scripts/aggregate-consumption.ts` | ✅ |
| 1.4 | tRPC: getConsumptionHistory | `src/server/api/routers/forecast.ts` | ✅ |
| 1.5 | Unit-тесты ConsumptionService | `src/__tests__/unit/consumption.test.ts` | ⬜ |

**Prisma Schema дополнения:**

```prisma
// ============================================
// Phase 4: Дневное потребление (агрегация)
// ============================================
model DailyConsumption {
  id          Int      @id @default(autoincrement())
  sku         String   @db.VarChar(50)
  warehouse   String   @db.VarChar(50)
  date        DateTime @db.Date
  consumed    Int      // Количество отгруженного/потреблённого
  received    Int      @default(0) // Количество поступившего
  netChange   Int      @map("net_change") // consumed - received
  avgPrice    Decimal? @map("avg_price") @db.Decimal(10, 2)
  
  @@unique([sku, warehouse, date])
  @@index([sku])
  @@index([warehouse])
  @@index([date])
  @@map("daily_consumption")
}

// ============================================
// Phase 4: Прогнозы
// ============================================
model Forecast {
  id            Int       @id @default(autoincrement())
  sku           String    @db.VarChar(50)
  warehouse     String    @db.VarChar(50)
  forecastDate  DateTime  @map("forecast_date") @db.Date
  predictedQty  Int       @map("predicted_qty")
  confidenceLow Int?      @map("confidence_low")
  confidenceHigh Int?     @map("confidence_high")
  model         String    @db.VarChar(20) // "sma", "ema", "prophet"
  mape          Decimal?  @db.Decimal(5, 2) // Model accuracy
  createdAt     DateTime  @default(now()) @map("created_at")
  
  @@unique([sku, warehouse, forecastDate, model])
  @@index([sku])
  @@index([forecastDate])
  @@map("forecasts")
}

// ============================================
// Phase 4: Рекомендации по дозаказу
// ============================================
model ReorderRecommendation {
  id              Int       @id @default(autoincrement())
  sku             String    @db.VarChar(50)
  warehouse       String    @db.VarChar(50)
  currentQty      Int       @map("current_qty")
  reorderPoint    Int       @map("reorder_point")
  recommendedQty  Int       @map("recommended_qty")
  daysToStockout  Int       @map("days_to_stockout")
  urgency         String    @db.VarChar(20) // "critical", "warning", "normal"
  status          String    @default("pending") @db.VarChar(20) // "pending", "approved", "ordered"
  expiresAt       DateTime  @map("expires_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  
  @@index([sku])
  @@index([urgency])
  @@index([status])
  @@map("reorder_recommendations")
}
```

---

### 3.2 Блок 2: MVP Forecasting (SMA/EMA) (Day 3-5)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 2.1 | ForecastService (SMA) | `src/server/services/forecast-service.ts` | ✅ |
| 2.2 | EMA implementation | `src/server/services/forecast-service.ts` | ✅ |
| 2.3 | Seasonality detection | `src/server/services/forecast-service.ts` | ✅ |
| 2.4 | tRPC: getForecast | `src/server/api/routers/forecast.ts` | ✅ |
| 2.5 | Unit-тесты ForecastService | `src/__tests__/unit/forecast.test.ts` | ✅ |

**ForecastService API:**

```typescript
// src/server/services/forecast-service.ts

export interface ForecastInput {
  sku: string;
  warehouse: string;
  historyDays: number;     // Сколько дней истории использовать (30-90)
  forecastDays: number;    // На сколько дней прогноз (7-30)
  model: "sma" | "ema" | "prophet";
}

export interface ForecastResult {
  sku: string;
  warehouse: string;
  currentQty: number;
  forecasts: Array<{
    date: Date;
    predictedQty: number;
    confidenceLow?: number;
    confidenceHigh?: number;
  }>;
  daysToStockout: number;
  avgDailyConsumption: number;
  trend: "increasing" | "stable" | "decreasing";
  seasonality: boolean;
  mape?: number;           // Точность модели (если есть исторические прогнозы)
}

export class ForecastService {
  /**
   * Simple Moving Average
   * Среднее за последние N дней
   */
  calculateSMA(data: number[], window: number): number;

  /**
   * Exponential Moving Average
   * Взвешенное среднее (недавние данные важнее)
   */
  calculateEMA(data: number[], smoothing: number): number;

  /**
   * Главный метод прогнозирования
   */
  async forecast(input: ForecastInput): Promise<ForecastResult>;

  /**
   * Определить тренд (растёт/падает/стабильно)
   */
  detectTrend(data: number[]): "increasing" | "stable" | "decreasing";

  /**
   * Обнаружить сезонность
   */
  detectSeasonality(data: number[]): boolean;
}
```

**Алгоритмы:**

```typescript
// Simple Moving Average
function simpleMovingAverage(data: number[], window: number): number {
  // Защита от пустого массива
  if (data.length === 0) return 0;
  
  if (data.length < window) return data.reduce((a, b) => a + b, 0) / data.length;
  const slice = data.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// Exponential Moving Average
function exponentialMovingAverage(data: number[], smoothing = 0.3): number {
  // Защита от пустого массива
  if (data.length === 0) return 0;
  
  return data.reduce((ema, value, index) => {
    if (index === 0) return value;
    return value * smoothing + ema * (1 - smoothing);
  }, data[0]!);
}

// Days to stockout
function daysToStockout(currentQty: number, avgDailyConsumption: number): number {
  if (avgDailyConsumption <= 0) return Infinity;
  return Math.floor(currentQty / avgDailyConsumption);
}

// Trend detection (linear regression slope)
function detectTrend(data: number[]): "increasing" | "stable" | "decreasing" {
  const n = data.length;
  
  // Минимум 2 точки для определения тренда
  if (n < 2) return "stable";
  
  const sumX = (n * (n - 1)) / 2;
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const denominator = n * sumX2 - sumX * sumX;
  
  // Защита от деления на ноль (не должно произойти при n >= 2)
  if (denominator === 0) return "stable";
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  
  const threshold = 0.1; // 10% change per period
  if (slope > threshold) return "increasing";
  if (slope < -threshold) return "decreasing";
  return "stable";
}
```

---

### 3.3 Блок 3: Reorder Recommendations (Day 6-7)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 3.1 | ReorderService | `src/server/services/reorder-service.ts` | ✅ |
| 3.2 | Lead time configuration | `src/server/services/reorder-service.ts` | ✅ |
| 3.3 | Safety stock calculation | `src/server/services/reorder-service.ts` | ✅ |
| 3.4 | tRPC: getReorderRecommendations | `src/server/api/routers/forecast.ts` | ✅ |
| 3.5 | Recommendation approval flow | `src/server/api/routers/forecast.ts` | ✅ |
| 3.6 | Unit-тесты ReorderService | `src/__tests__/unit/reorder.test.ts` | ✅ |

**ReorderService API:**

```typescript
// src/server/services/reorder-service.ts

export interface ReorderConfig {
  leadTimeDays: number;      // Время доставки от поставщика (default: 7)
  serviceLevel: number;      // Желаемый уровень сервиса 0.90-0.99 (default: 0.95)
  reviewPeriodDays: number;  // Период пересчёта (default: 1)
  minOrderQty?: number;      // Минимальный заказ
  maxOrderQty?: number;      // Максимальный заказ
}

export interface ReorderRecommendation {
  sku: string;
  warehouse: string;
  productName: string;
  currentQty: number;
  reorderPoint: number;
  recommendedQty: number;
  optimalOrderQty: number;   // Economic Order Quantity
  daysToStockout: number;
  urgency: "critical" | "warning" | "normal";
  estimatedCost?: number;
  supplier?: string;
  reasoning: string;         // Объяснение рекомендации
}

export class ReorderService {
  /**
   * Рассчитать точку заказа (Reorder Point)
   * ROP = (avg_daily × lead_time) + safety_stock
   */
  calculateReorderPoint(
    avgDailyConsumption: number,
    leadTimeDays: number,
    safetyStock: number
  ): number;

  /**
   * Рассчитать страховой запас
   * Safety Stock = Z × σ × √(lead_time)
   * Z = 1.65 для 95% service level
   */
  calculateSafetyStock(
    stdDevConsumption: number,
    leadTimeDays: number,
    serviceLevel: number
  ): number;

  /**
   * Рассчитать оптимальный объём заказа (EOQ)
   * EOQ = √(2 × D × S / H)
   * D = annual demand, S = order cost, H = holding cost
   */
  calculateEOQ(
    annualDemand: number,
    orderCost: number,
    holdingCostPerUnit: number
  ): number;

  /**
   * Получить все рекомендации
   */
  async getRecommendations(warehouse?: string): Promise<ReorderRecommendation[]>;

  /**
   * Определить срочность
   */
  determineUrgency(daysToStockout: number, leadTimeDays: number): "critical" | "warning" | "normal";
}
```

**Urgency levels:**

| Уровень | Условие | Действие |
|---------|---------|----------|
| 🔴 **critical** | daysToStockout ≤ leadTime | Срочный заказ, email alert |
| 🟡 **warning** | daysToStockout ≤ leadTime × 1.5 | Рекомендация заказать |
| 🟢 **normal** | daysToStockout > leadTime × 1.5 | Плановый заказ |

---

### 3.4 Блок 4: Forecast UI (Day 8-10)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 4.1 | Forecast Page | `src/app/forecast/page.tsx` | ✅ |
| 4.2 | ForecastChart component | `src/app/_components/forecast/ForecastChart.tsx` | ✅ |
| 4.3 | ReorderTable component | `src/app/_components/forecast/ReorderTable.tsx` | ✅ |
| 4.4 | ProductForecastCard | `src/app/_components/forecast/ProductForecastCard.tsx` | ✅ |
| 4.5 | TrendIndicator | `src/app/_components/forecast/TrendIndicator.tsx` | ✅ |
| 4.6 | ForecastSettings | `src/app/settings/forecast/page.tsx` | ⬜ |
| 4.7 | Dashboard integration | `src/app/_components/dashboard/ForecastWidget.tsx` | ✅ |
| 4.8 | Index exports | `src/app/_components/forecast/index.ts` | ✅ |

**Forecast Page Layout:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  📈 Прогноз запасов                      [Период: 14 дней ▼] [Склад ▼]    │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │  🔴 Критичные (3)        🟡 Внимание (8)        🟢 Норма (45)          ││
│  └────────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────────┤
│  📦 Рекомендации к заказу                                    [Export CSV] │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ SKU       │ Товар            │ Остаток │ До 0 │ Заказать │ Статус │  │
│  ├───────────┼──────────────────┼─────────┼──────┼──────────┼────────┤  │
│  │ 🔴 SKU-001│ Болт М8x30       │    15   │ 3 дн │   100    │ [Заказ]│  │
│  │ 🔴 SKU-045│ Гайка М10        │     8   │ 2 дн │    50    │ [Заказ]│  │
│  │ 🟡 SKU-012│ Шайба 12мм       │    45   │ 9 дн │   200    │ [Заказ]│  │
│  └─────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  📈 Прогноз по товару                                  [SKU: SKU-001 ▼]   │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │      100 ┤                                                             ││
│  │       80 ┤     ████                                                    ││
│  │       60 ┤ ████████████                                                ││
│  │       40 ┤             ▒▒▒▒▒▒▒▒ (прогноз)                              ││
│  │       20 ┤                     ▒▒▒▒▒▒▒▒                                ││
│  │        0 ┤─────────────────────────────▒▒ ← точка дозаказа             ││
│  │          └───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬    ││
│  │             -7d -6d -5d -4d -3d -2d -1d  0  +1d +2d +3d +4d +5d +6d    ││
│  │                      история          │      прогноз                   ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                            │
│  📊 Статистика                                                             │
│  ├─ Средний расход: 12 шт/день                                            │
│  ├─ Тренд: ↗️ Растущий (+15% за месяц)                                     │
│  ├─ Точность прогноза (MAPE): 8.5%                                        │
│  └─ Рекомендуемый страховой запас: 25 шт                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

**ForecastChart Component:**

```typescript
// src/app/_components/forecast/ForecastChart.tsx

import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, Area } from "recharts";

interface ForecastChartProps {
  data: Array<{
    date: string;
    actual?: number;          // Фактические данные (история)
    forecast?: number;        // Прогноз
    confidenceLow?: number;   // Нижняя граница доверительного интервала
    confidenceHigh?: number;  // Верхняя граница
  }>;
  reorderPoint: number;
  currentQty: number;
}

export function ForecastChart({ data, reorderPoint, currentQty }: ForecastChartProps) {
  return (
    <LineChart data={data}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      
      {/* Доверительный интервал */}
      <Area
        type="monotone"
        dataKey="confidenceHigh"
        stroke="none"
        fill="#8884d8"
        fillOpacity={0.1}
      />
      
      {/* Историческая линия */}
      <Line
        type="monotone"
        dataKey="actual"
        stroke="#2563eb"
        strokeWidth={2}
        dot={false}
      />
      
      {/* Прогнозная линия (пунктир) */}
      <Line
        type="monotone"
        dataKey="forecast"
        stroke="#8884d8"
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={false}
      />
      
      {/* Точка дозаказа */}
      <ReferenceLine
        y={reorderPoint}
        stroke="#f59e0b"
        strokeDasharray="3 3"
        label="Точка заказа"
      />
    </LineChart>
  );
}
```

---

### 3.5 Блок 5: Prophet Microservice (Day 11-14)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 5.1 | Python microservice setup | `services/prophet/` | ⬜ |
| 5.2 | FastAPI endpoint | `services/prophet/main.py` | ⬜ |
| 5.3 | Prophet model wrapper | `services/prophet/forecast.py` | ⬜ |
| 5.4 | Docker setup | `services/prophet/Dockerfile` | ⬜ |
| 5.5 | Integration with Node.js | `src/server/services/prophet-client.ts` | ⬜ |
| 5.6 | Model accuracy tracking | `services/prophet/evaluation.py` | ⬜ |

**Prophet Microservice Structure:**

```
services/
└── prophet/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py              # FastAPI endpoints
    ├── forecast.py          # Prophet wrapper
    ├── evaluation.py        # MAPE calculation
    └── config.py
```

**FastAPI Endpoint:**

```python
# services/prophet/main.py

from fastapi import FastAPI
from prophet import Prophet
from pydantic import BaseModel
from datetime import datetime
import pandas as pd

app = FastAPI()

class ForecastRequest(BaseModel):
    sku: str
    warehouse: str
    history: list[dict]  # [{ "date": "2026-01-01", "qty": 100 }, ...]
    periods: int = 14
    include_holidays: bool = True

class ForecastResponse(BaseModel):
    sku: str
    warehouse: str
    forecasts: list[dict]
    trend: str
    seasonality: dict
    mape: float | None

@app.post("/forecast")
async def predict(request: ForecastRequest) -> ForecastResponse:
    # Подготовка данных для Prophet
    df = pd.DataFrame(request.history)
    df.columns = ["ds", "y"]
    df["ds"] = pd.to_datetime(df["ds"])
    
    # Создание и обучение модели
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
    )
    
    if request.include_holidays:
        # Добавить российские праздники
        model.add_country_holidays(country_name="RU")
    
    model.fit(df)
    
    # Прогноз
    future = model.make_future_dataframe(periods=request.periods)
    forecast = model.predict(future)
    
    # Форматирование результата
    forecasts = []
    for _, row in forecast.tail(request.periods).iterrows():
        forecasts.append({
            "date": row["ds"].strftime("%Y-%m-%d"),
            "predictedQty": max(0, int(row["yhat"])),
            "confidenceLow": max(0, int(row["yhat_lower"])),
            "confidenceHigh": max(0, int(row["yhat_upper"])),
        })
    
    return ForecastResponse(
        sku=request.sku,
        warehouse=request.warehouse,
        forecasts=forecasts,
        trend=detect_trend(df["y"].values),
        seasonality={
            "weekly": model.weekly_seasonality,
            "yearly": model.yearly_seasonality,
        },
        mape=None,  # Рассчитывается позже при наличии актуальных данных
    )
```

**Docker Setup:**

```dockerfile
# services/prophet/Dockerfile

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

```txt
# services/prophet/requirements.txt
fastapi==0.109.0
uvicorn==0.27.0
prophet==1.1.5
pandas==2.2.0
numpy==1.26.3
```

**Node.js Client:**

```typescript
// src/server/services/prophet-client.ts

import { env } from "~/env";

const PROPHET_URL = env.PROPHET_SERVICE_URL || "http://localhost:8001";

export interface ProphetForecastInput {
  sku: string;
  warehouse: string;
  history: Array<{ date: string; qty: number }>;
  periods?: number;
  includeHolidays?: boolean;
}

export async function getProphetForecast(input: ProphetForecastInput) {
  const response = await fetch(`${PROPHET_URL}/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sku: input.sku,
      warehouse: input.warehouse,
      history: input.history,
      periods: input.periods ?? 14,
      include_holidays: input.includeHolidays ?? true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Prophet service error: ${response.statusText}`);
  }

  return response.json();
}
```

---

### 3.6 Блок 6: Proactive Alerts (Day 15)

| ID | Задача | Файл | Статус |
|----|--------|------|--------|
| 6.1 | Forecast-based alerts | `src/server/services/alert-service.ts` | ⬜ |
| 6.2 | Daily reorder digest email | `src/server/services/notification-service.ts` | ⬜ |
| 6.3 | Scheduled forecast job | `scripts/forecast-worker.ts` | ✅ |
| 6.4 | Alert rule: "days_to_stockout" | Extend AlertRule model | ⬜ |

**Новый тип алерта:**

```prisma
// Расширение AlertRule для прогнозных алертов
model AlertRule {
  // ... existing fields ...
  
  // Новое поле для условия прогноза
  forecastCondition String? @map("forecast_condition") @db.VarChar(30)
  // "days_to_stockout_below", "trend_increasing", "trend_decreasing"
  
  forecastThreshold Int? @map("forecast_threshold")
  // Для days_to_stockout: количество дней
}
```

**Daily Digest Email Template:**

```
📦 Ежедневный отчёт по заказам | AI Stock Keeper
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 КРИТИЧНО (заказать сегодня):
┌─────────────────────────────────────────────┐
│ SKU-001  Болт М8x30     │ До 0: 2 дня │ 100 │
│ SKU-045  Гайка М10      │ До 0: 3 дня │  50 │
└─────────────────────────────────────────────┘

🟡 ВНИМАНИЕ (заказать на этой неделе):
┌─────────────────────────────────────────────┐
│ SKU-012  Шайба 12мм     │ До 0: 8 дней │ 200│
│ SKU-033  Винт 6x20      │ До 0: 9 дней │ 150│
└─────────────────────────────────────────────┘

📊 Общая сумма рекомендаций: ₽45,600

[Открыть Dashboard] [Экспорт в Excel]
```

---

### 3.7 Блок 7: Backend API (Day 11-14)

| ID | Endpoint | Описание | Статус |
|----|----------|----------|--------|
| 7.1 | `forecast.getForProduct` | Прогноз для одного товара | ✅ |
| 7.2 | `forecast.getBatch` | Прогнозы для списка товаров | ✅ |
| 7.3 | `forecast.getRecommendations` | Рекомендации по дозаказу | ✅ |
| 7.4 | `forecast.approveRecommendation` | Подтвердить рекомендацию | ✅ |
| 7.5 | `forecast.getConsumptionTrend` | Тренд потребления | ✅ |
| 7.6 | `forecast.getAccuracy` | Точность прогнозов (MAPE) | ✅ |
| 7.7 | `forecast.getSettings` | Настройки прогнозирования | ⬜ |
| 7.8 | `forecast.updateSettings` | Обновить настройки | ⬜ |

**tRPC Router:**

```typescript
// src/server/api/routers/forecast.ts

export const forecastRouter = createTRPCRouter({
  // Прогноз для одного товара
  getForProduct: publicProcedure
    .input(z.object({
      sku: z.string(),
      warehouse: z.string(),
      days: z.number().min(7).max(90).default(14),
      model: z.enum(["sma", "ema", "prophet"]).default("sma"),
    }))
    .query(async ({ input }) => {
      const forecast = await forecastService.forecast(input);
      return forecast;
    }),

  // Все рекомендации
  getRecommendations: publicProcedure
    .input(z.object({
      warehouse: z.string().optional(),
      urgency: z.enum(["critical", "warning", "normal"]).optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return reorderService.getRecommendations(input);
    }),

  // Подтвердить рекомендацию
  approveRecommendation: publicProcedure
    .input(z.object({
      id: z.number(),
      orderQty: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return reorderService.approve(input.id, input.orderQty);
    }),

  // Тренд потребления
  getConsumptionTrend: publicProcedure
    .input(z.object({
      sku: z.string(),
      warehouse: z.string(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      return consumptionService.getTrend(input);
    }),

  // Точность прогнозов
  getAccuracy: publicProcedure
    .input(z.object({
      model: z.enum(["sma", "ema", "prophet"]).optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      return forecastService.getAccuracy(input);
    }),
});
```

---

### 3.8 Блок 8: Тестирование (Day 15)

| ID | Задача | Тип | Статус |
|----|--------|-----|--------|
| 8.1 | Unit-тесты ForecastService | Jest | ✅ (22 тестов) |
| 8.2 | Unit-тесты ReorderService | Jest | ✅ (13 тестов) |
| 8.3 | Unit-тесты ConsumptionService | Jest | ⬜ |
| 8.4 | Integration тест forecast flow | Jest | ⬜ |
| 8.5 | Prophet microservice tests | pytest | ⬜ |
| 8.6 | A/B тест: SMA vs EMA vs Prophet | Manual | ⬜ |
| 8.7 | Forecast accuracy benchmark | Manual | ⬜ |

**Test Cases:**

```typescript
// src/__tests__/unit/forecast.test.ts

describe("ForecastService", () => {
  describe("SMA", () => {
    it("should calculate correct moving average", () => {
      const data = [10, 20, 30, 40, 50];
      const sma = forecastService.calculateSMA(data, 3);
      expect(sma).toBe(40); // (30 + 40 + 50) / 3
    });

    it("should handle window larger than data", () => {
      const data = [10, 20];
      const sma = forecastService.calculateSMA(data, 5);
      expect(sma).toBe(15); // (10 + 20) / 2
    });
  });

  describe("EMA", () => {
    it("should weight recent data more", () => {
      const data = [10, 10, 10, 100]; // Spike at end
      const ema = forecastService.calculateEMA(data, 0.5);
      expect(ema).toBeGreaterThan(30); // Should be pulled toward 100
    });
  });

  describe("Trend Detection", () => {
    it("should detect increasing trend", () => {
      const data = [10, 15, 20, 25, 30];
      expect(forecastService.detectTrend(data)).toBe("increasing");
    });

    it("should detect decreasing trend", () => {
      const data = [30, 25, 20, 15, 10];
      expect(forecastService.detectTrend(data)).toBe("decreasing");
    });

    it("should detect stable trend", () => {
      const data = [20, 21, 19, 20, 21];
      expect(forecastService.detectTrend(data)).toBe("stable");
    });

    it("should return stable for empty array", () => {
      expect(forecastService.detectTrend([])).toBe("stable");
    });

    it("should return stable for single data point", () => {
      expect(forecastService.detectTrend([100])).toBe("stable");
    });

    it("should handle two data points", () => {
      expect(forecastService.detectTrend([10, 20])).toBe("increasing");
      expect(forecastService.detectTrend([20, 10])).toBe("decreasing");
    });
  });

  describe("Days to Stockout", () => {
    it("should calculate correctly", () => {
      expect(forecastService.daysToStockout(100, 10)).toBe(10);
      expect(forecastService.daysToStockout(50, 7)).toBe(7);
    });

    it("should return Infinity for zero consumption", () => {
      expect(forecastService.daysToStockout(100, 0)).toBe(Infinity);
    });
  });
});
```

---

## 4. Environment Variables

```env
# Prophet Microservice
PROPHET_SERVICE_URL=http://localhost:8001

# Forecast defaults
FORECAST_DEFAULT_HISTORY_DAYS=60
FORECAST_DEFAULT_PERIODS=14
FORECAST_DEFAULT_MODEL=sma

# Reorder defaults
REORDER_DEFAULT_LEAD_TIME_DAYS=7
REORDER_DEFAULT_SERVICE_LEVEL=0.95
REORDER_MIN_ORDER_QTY=10
```

---

## 5. Таймлайн

```
Week 1 (Days 1-5) - MVP Forecasting
├── Day 1: ConsumptionService, Prisma models
├── Day 2: Data aggregation job
├── Day 3: ForecastService (SMA)
├── Day 4: ForecastService (EMA), trend detection
└── Day 5: tRPC endpoints, unit tests

Week 2 (Days 6-10) - Reorder & UI
├── Day 6: ReorderService
├── Day 7: Safety stock, EOQ calculations
├── Day 8: Forecast page UI
├── Day 9: ForecastChart, ReorderTable
└── Day 10: Dashboard integration, settings

Week 3 (Days 11-15) - Prophet & Polish
├── Day 11: Prophet microservice setup
├── Day 12: FastAPI endpoints
├── Day 13: Node.js integration
├── Day 14: Proactive alerts, daily digest
└── Day 15: Testing, documentation
```

---

## 6. Файловая структура

```
src/
├── app/
│   ├── forecast/
│   │   └── page.tsx                    # Страница прогнозов
│   ├── settings/
│   │   └── forecast/
│   │       └── page.tsx                # Настройки прогнозирования
│   └── _components/
│       └── forecast/
│           ├── index.ts
│           ├── ForecastChart.tsx       # График прогноза
│           ├── ReorderTable.tsx        # Таблица рекомендаций
│           ├── ProductForecastCard.tsx # Карточка товара
│           ├── TrendIndicator.tsx      # Индикатор тренда
│           └── AccuracyBadge.tsx       # Точность модели
├── server/
│   ├── services/
│   │   ├── consumption-service.ts      # Агрегация потребления
│   │   ├── forecast-service.ts         # SMA, EMA, интеграция
│   │   ├── reorder-service.ts          # Рекомендации
│   │   └── prophet-client.ts           # Клиент Prophet API
│   └── api/
│       └── routers/
│           └── forecast.ts             # tRPC router
├── __tests__/
│   └── unit/
│       ├── consumption.test.ts
│       ├── forecast.test.ts
│       └── reorder.test.ts
└── scripts/
    ├── aggregate-consumption.ts        # Cron job
    └── forecast-worker.ts              # Background worker

services/
└── prophet/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py
    ├── forecast.py
    └── config.py
```

---

## 7. Критерии успеха

| Метрика | Цель | Измерение |
|---------|------|-----------|
| **MAPE (SMA)** | < 20% | Средняя ошибка прогноза на 7 дней |
| **MAPE (Prophet)** | < 12% | То же с Prophet |
| **Stockout Reduction** | -50% | Сравнение до/после |
| **Recommendation Accuracy** | > 80% | % принятых рекомендаций |
| **Forecast Page Load** | < 2 сек | First Contentful Paint |
| **Prophet Latency** | < 5 сек | Время ответа microservice |

---

## 8. Риски и митигации

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Недостаток исторических данных | Высокая | Высокое | Fallback на SMA с коротким окном |
| Prophet слишком медленный | Средняя | Среднее | Кеширование, batch processing |
| Неточные прогнозы для new products | Высокая | Среднее | Использовать категорию-аналог |
| Сезонность не учтена | Средняя | Среднее | Prophet с holidays |
| Пользователи игнорируют рекомендации | Средняя | Среднее | Email digests, urgency levels |

---

## 9. Зависимости от предыдущих фаз

| Компонент | Использование в Phase 4 |
|-----------|-------------------------|
| `Transaction` model | Источник данных потребления |
| `Inventory` model | Текущие остатки |
| `AlertService` | Расширение для forecast alerts |
| `NotificationService` | Daily digest emails |
| `InventoryCache` | Real-time данные |
| `Dashboard` | ForecastWidget интеграция |

---

## 10. Следующие шаги

После завершения Phase 4:
- [ ] **Phase 5:** Picking Optimization (TSP solver)
- [ ] **Phase 6:** Multi-Warehouse Sync
- [ ] **Future:** AutoML для enterprise
- [ ] **Future:** Supplier API integration

---

**Документ создан:** 2026-01-31  
**Последнее обновление:** 2026-01-31  
**Статус:** 📋 Планирование  
**Автор:** AI Stock Keeper Team
