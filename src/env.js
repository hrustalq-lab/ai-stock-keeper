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
    
    // Phase 4: Forecast
    PROPHET_SERVICE_URL: z.string().url().optional(),
    FORECAST_DEFAULT_HISTORY_DAYS: z.coerce.number().default(60),
    FORECAST_DEFAULT_PERIODS: z.coerce.number().default(14),
    REORDER_DEFAULT_LEAD_TIME_DAYS: z.coerce.number().default(7),
    REORDER_DEFAULT_SERVICE_LEVEL: z.coerce.number().default(0.95),
    
    // Phase 5: Picking Optimization
    ROUTE_OPTIMIZATION_ALGORITHM: z.enum(["nearest_neighbor", "zone_based"]).default("nearest_neighbor"),
    WAREHOUSE_WALKING_SPEED_MPS: z.coerce.number().default(1.4),
    WAREHOUSE_PICK_TIME_SECONDS: z.coerce.number().default(15),
    ONE_C_AUTO_CREATE_SHIPMENT: z.enum(["true", "false"]).default("true"),
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
    PROPHET_SERVICE_URL: process.env.PROPHET_SERVICE_URL,
    FORECAST_DEFAULT_HISTORY_DAYS: process.env.FORECAST_DEFAULT_HISTORY_DAYS,
    FORECAST_DEFAULT_PERIODS: process.env.FORECAST_DEFAULT_PERIODS,
    REORDER_DEFAULT_LEAD_TIME_DAYS: process.env.REORDER_DEFAULT_LEAD_TIME_DAYS,
    REORDER_DEFAULT_SERVICE_LEVEL: process.env.REORDER_DEFAULT_SERVICE_LEVEL,
    // Phase 5
    ROUTE_OPTIMIZATION_ALGORITHM: process.env.ROUTE_OPTIMIZATION_ALGORITHM,
    WAREHOUSE_WALKING_SPEED_MPS: process.env.WAREHOUSE_WALKING_SPEED_MPS,
    WAREHOUSE_PICK_TIME_SECONDS: process.env.WAREHOUSE_PICK_TIME_SECONDS,
    ONE_C_AUTO_CREATE_SHIPMENT: process.env.ONE_C_AUTO_CREATE_SHIPMENT,
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
