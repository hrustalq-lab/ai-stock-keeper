/**
 * Скрипт начальной синхронизации с 1C
 * Загружает все товары из 1C в локальную базу данных
 * 
 * Запуск: npx tsx scripts/sync-initial.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Конфигурация
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres_dev_password@localhost:5432/ai_stock_keeper";
const ONE_C_BASE_URL = process.env.ONE_C_BASE_URL ?? "http://localhost:3001/api/1c";
const ONE_C_USERNAME = process.env.ONE_C_USERNAME ?? "admin";
const ONE_C_PASSWORD = process.env.ONE_C_PASSWORD ?? "dev_password";

// Создаём подключение к PostgreSQL
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

interface OneCGoods {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  reorderPoint: number;
  supplier?: string;
  lastUpdated: string;
}

async function getAuthToken(): Promise<string> {
  console.log("🔐 Получение токена авторизации...");
  
  const response = await fetch(`${ONE_C_BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: ONE_C_USERNAME,
      password: ONE_C_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ошибка авторизации: ${response.status}`);
  }

  const data = (await response.json()) as { accessToken: string };
  console.log("✅ Токен получен");
  return data.accessToken;
}

async function fetchGoods(token: string): Promise<OneCGoods[]> {
  console.log("📦 Загрузка товаров из 1C...");
  
  const response = await fetch(`${ONE_C_BASE_URL}/goods?limit=1000`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки товаров: ${response.status}`);
  }

  const goods = (await response.json()) as OneCGoods[];
  console.log(`✅ Загружено ${goods.length} товаров`);
  return goods;
}

async function syncToDatabase(goods: OneCGoods[]): Promise<void> {
  console.log("💾 Синхронизация с базой данных...");
  
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const item of goods) {
    try {
      const existing = await db.inventory.findFirst({
        where: { sku: item.sku, warehouse: item.warehouse },
      });

      if (existing) {
        await db.inventory.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            quantity: item.quantity,
            reorderPoint: item.reorderPoint,
            supplier: item.supplier,
            syncedAt: new Date(),
            last1CUpdate: new Date(item.lastUpdated),
          },
        });
        updated++;
      } else {
        await db.inventory.create({
          data: {
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            warehouse: item.warehouse,
            reorderPoint: item.reorderPoint,
            supplier: item.supplier,
            syncedAt: new Date(),
            last1CUpdate: new Date(item.lastUpdated),
          },
        });
        created++;
      }
    } catch (error) {
      console.error(`❌ Ошибка для SKU ${item.sku}:`, error);
      errors++;
    }
  }

  console.log(`
📊 Результаты синхронизации:
   ✅ Создано: ${created}
   🔄 Обновлено: ${updated}
   ❌ Ошибок: ${errors}
  `);
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════╗
║       🔄 Начальная синхронизация с 1C                  ║
╠════════════════════════════════════════════════════════╣
║  1C URL: ${ONE_C_BASE_URL.padEnd(42)}║
╚════════════════════════════════════════════════════════╝
  `);

  try {
    // Проверяем подключение к БД
    await db.$connect();
    console.log("✅ Подключение к PostgreSQL установлено");

    // Получаем токен
    const token = await getAuthToken();

    // Загружаем товары
    const goods = await fetchGoods(token);

    // Синхронизируем
    await syncToDatabase(goods);

    // Логируем в аудит
    await db.auditLog.create({
      data: {
        action: "initial_sync_completed",
        tableName: "inventory",
        newValue: { itemsCount: goods.length, timestamp: new Date().toISOString() },
      },
    });

    console.log("🎉 Синхронизация завершена успешно!");
  } catch (error) {
    console.error("💥 Ошибка синхронизации:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

void main();
