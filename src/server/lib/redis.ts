import Redis from "ioredis";
import { env } from "~/env";

// Глобальный инстанс Redis для предотвращения множественных подключений в dev
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// Подключение к Redis при первом использовании
redis.on("error", (err) => {
  console.error("[Redis] Ошибка подключения:", err.message);
});

redis.on("connect", () => {
  console.log("[Redis] Подключено успешно");
});
