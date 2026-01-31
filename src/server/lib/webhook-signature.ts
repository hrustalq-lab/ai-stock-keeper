/**
 * Утилиты для валидации webhook подписей
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Создаёт HMAC-SHA256 подпись для payload
 */
export function createWebhookSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Проверяет подпись webhook запроса
 * Формат заголовка: X-1C-Signature: sha256=<hex_signature>
 *
 * @param signature - значение заголовка X-1C-Signature
 * @param rawBody - сырой body запроса
 * @param secret - секретный ключ
 * @returns true если подпись валидна
 */
export function validateWebhookSignature(
  signature: string | null,
  rawBody: string,
  secret: string
): boolean {
  if (!signature) return false;

  // Ожидаем формат: sha256=<hex>
  const parts = signature.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    return false;
  }

  const receivedHash = parts[1];
  if (!receivedHash) return false;

  // Вычисляем HMAC-SHA256
  const expectedHash = createWebhookSignature(rawBody, secret);

  // Используем timing-safe сравнение для защиты от timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(receivedHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    // Если длины буферов разные, timingSafeEqual выбросит исключение
    return false;
  }
}

/**
 * Форматирует подпись для заголовка X-1C-Signature
 */
export function formatSignatureHeader(hash: string): string {
  return `sha256=${hash}`;
}
