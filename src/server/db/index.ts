import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "~/env";

// Создаём пул подключений PostgreSQL
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

// Создаём адаптер Prisma для PostgreSQL
const adapter = new PrismaPg(pool);

// Глобальный инстанс Prisma для предотвращения множественных подключений в dev
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Экспортируем типы для удобства
export type { Inventory, Transaction, Document1C, AuditLog, SyncQueue } from "@prisma/client";
