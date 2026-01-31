import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Серверные переменные окружения
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    
    // База данных
    DATABASE_URL: z.string().url(),
    
    // Redis
    REDIS_URL: z.string().url(),
    
    // 1C Configuration
    ONE_C_BASE_URL: z.string().url(),
    ONE_C_USERNAME: z.string().min(1),
    ONE_C_PASSWORD: z.string().min(1),
    ONE_C_WAREHOUSE_ID: z.string().min(1),
    
    // Bull Queue
    BULL_QUEUE_NAME: z.string().default("1c-sync-queue"),
    
    // Webhook Security
    ONE_C_WEBHOOK_SECRET: z.string().min(16).optional(),
    
    // Email (Resend) - Phase 3
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().default("alerts@localhost"),
    
    // Alert defaults
    ALERT_DEFAULT_COOLDOWN_MINS: z.coerce.number().default(60),
  },

  /**
   * Клиентские переменные окружения (префикс NEXT_PUBLIC_)
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * Runtime переменные
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    ONE_C_BASE_URL: process.env.ONE_C_BASE_URL,
    ONE_C_USERNAME: process.env.ONE_C_USERNAME,
    ONE_C_PASSWORD: process.env.ONE_C_PASSWORD,
    ONE_C_WAREHOUSE_ID: process.env.ONE_C_WAREHOUSE_ID,
    BULL_QUEUE_NAME: process.env.BULL_QUEUE_NAME,
    ONE_C_WEBHOOK_SECRET: process.env.ONE_C_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    ALERT_DEFAULT_COOLDOWN_MINS: process.env.ALERT_DEFAULT_COOLDOWN_MINS,
  },

  /**
   * Пропустить валидацию при сборке Docker
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Пустые строки = undefined
   */
  emptyStringAsUndefined: true,
});
