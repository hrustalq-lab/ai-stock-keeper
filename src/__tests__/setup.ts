/**
 * Jest Setup File
 * Выполняется перед каждым тестом
 */

import { jest, afterAll } from "@jest/globals";

// Мокаем переменные окружения для тестов
// @ts-expect-error - NODE_ENV можно переопределять в тестовом окружении
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.ONE_C_BASE_URL = "http://localhost:3001/api/1c";
process.env.ONE_C_USERNAME = "admin";
process.env.ONE_C_PASSWORD = "test_password";
process.env.ONE_C_WAREHOUSE_ID = "warehouse_test";
process.env.ONE_C_WEBHOOK_SECRET = "test_webhook_secret_123";

// Увеличиваем таймаут для async операций
jest.setTimeout(10000);

// Глобальный cleanup после всех тестов
afterAll(async (): Promise<void> => { /* empty */ });
