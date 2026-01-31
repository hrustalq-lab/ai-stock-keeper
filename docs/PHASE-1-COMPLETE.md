# Phase 1: Core Architecture - ЗАВЕРШЕНО ✅

**Дата завершения:** 2026-01-31  
**Статус:** Готово к тестированию

---

## 📦 Что было создано

### 1. Инфраструктура

| Компонент | Описание | Файл |
|-----------|----------|------|
| Docker Compose | PostgreSQL 16 + Redis 7 | `docker-compose.yml` |
| Prisma Schema | 5 моделей данных | `prisma/schema.prisma` |
| Environment | Валидация переменных | `src/env.js`, `.env.example` |

### 2. Сервисы

| Сервис | Описание | Файл |
|--------|----------|------|
| OneCAuth | Аутентификация 1C (токены) | `src/server/services/one-c-auth.ts` |
| OneCClient | HTTP-клиент для 1C API | `src/server/services/one-c-client.ts` |
| InventoryCache | Двухуровневый кеш (Redis + PostgreSQL) | `src/server/services/inventory-cache.ts` |
| Redis | Подключение к Redis | `src/server/lib/redis.ts` |
| Database | Prisma Client singleton | `src/server/db/index.ts` |

### 3. API Endpoints

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/webhooks/one-c` | POST | Приём событий от 1C |
| `/api/webhooks/one-c` | GET | Health check |
| `/trpc/inventory.getAll` | Query | Все товары |
| `/trpc/inventory.getBySku` | Query | Товар по SKU |
| `/trpc/inventory.getBySkus` | Query | Товары по списку SKU |
| `/trpc/inventory.getLowStock` | Query | Товары с низким остатком |
| `/trpc/inventory.createGoodsReceipt` | Mutation | Создать приходную накладную |
| `/trpc/inventory.createShipment` | Mutation | Создать отгрузку |
| `/trpc/inventory.createTransfer` | Mutation | Создать перемещение |
| `/trpc/inventory.getSyncStatus` | Query | Статус синхронизации |
| `/trpc/inventory.getTransactions` | Query | История транзакций |

### 4. Mock 1C Server

Для разработки создан mock-сервер, эмулирующий API 1C:

```bash
npm run mock:1c
```

**Endpoints:**
- `POST /auth/token` - аутентификация
- `GET /goods` - список товаров
- `GET /goods/:sku` - товар по SKU
- `POST /documents/goods-receipt` - приходная накладная
- `POST /documents/shipment` - отгрузка
- `POST /documents/transfer` - перемещение

---

## 🚀 Как запустить

### 1. Запустить Docker контейнеры

```bash
# Запустить PostgreSQL и Redis
npm run docker:up

# Проверить статус
docker ps
```

### 2. Настроить базу данных

```bash
# Применить схему к БД
npm run db:push

# Или создать миграцию
npm run db:migrate
```

### 3. Запустить Mock 1C Server

```bash
# В отдельном терминале
npm run mock:1c
```

### 4. Запустить приложение

```bash
npm run dev
```

### 5. Выполнить начальную синхронизацию

```bash
npm run sync:initial
```

---

## 🧪 Тестирование

### Проверка подключения к 1C

```bash
# Health check
curl http://localhost:3001/api/1c/health

# Получить токен
curl -X POST http://localhost:3001/api/1c/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"dev_password"}'
```

### Проверка API

```bash
# Получить все товары (через tRPC)
curl "http://localhost:3000/api/trpc/inventory.getAll"

# Создать приходную накладную
curl -X POST "http://localhost:3000/api/trpc/inventory.createGoodsReceipt" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"sku":"SKU-001","quantity":100}],"warehouse":"warehouse_main"}'
```

### Проверка Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/one-c \
  -H "Content-Type: application/json" \
  -d '{
    "event": "goods.updated",
    "timestamp": "2026-01-31T12:00:00Z",
    "data": {
      "sku": "SKU-001",
      "name": "Болт М8x30",
      "quantity": 1600,
      "warehouse": "warehouse_main"
    }
  }'
```

---

## 📁 Структура файлов

```
src/
├── app/
│   └── api/
│       └── webhooks/
│           └── one-c/
│               └── route.ts          # Webhook endpoint
├── server/
│   ├── api/
│   │   └── routers/
│   │       └── inventory.ts          # tRPC роутер
│   ├── db/
│   │   └── index.ts                  # Prisma Client
│   ├── lib/
│   │   └── redis.ts                  # Redis Client
│   ├── services/
│   │   ├── one-c-auth.ts             # 1C аутентификация
│   │   ├── one-c-client.ts           # 1C HTTP клиент
│   │   └── inventory-cache.ts        # Кеш инвентаря
│   └── workers/
│       └── webhook-processor.ts      # Обработчик webhook
├── env.js                            # Валидация env

mock-1c/
└── server.ts                         # Mock 1C Server

scripts/
└── sync-initial.ts                   # Начальная синхронизация

prisma/
└── schema.prisma                     # Схема БД

docker-compose.yml                    # PostgreSQL + Redis
```

---

## ⚠️ Известные ограничения

1. **Mock 1C Server** - только для разработки, не для production
2. **Webhook подпись** - валидация подписи закомментирована (TODO)
3. **Bull Queue** - воркер не запускается автоматически (нужен отдельный процесс)

---

## 📋 Следующие шаги (Phase 2)

- [ ] Интеграция OCR (Tesseract.js) для сканирования накладных
- [ ] Fuzzy matching товаров (Fuse.js)
- [ ] UI компонент для приёмки товаров
- [ ] End-to-end тестирование

---

## 🔧 NPM Scripts

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск Next.js в dev режиме |
| `npm run docker:up` | Запуск PostgreSQL + Redis |
| `npm run docker:down` | Остановка контейнеров |
| `npm run db:generate` | Генерация Prisma Client |
| `npm run db:push` | Применить схему к БД |
| `npm run db:migrate` | Создать миграцию |
| `npm run db:studio` | Открыть Prisma Studio |
| `npm run mock:1c` | Запуск Mock 1C Server |
| `npm run sync:initial` | Начальная синхронизация |
