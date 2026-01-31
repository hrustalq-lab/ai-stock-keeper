/**
 * Unit-тесты для валидации webhook подписей
 */

import { describe, it, expect } from "@jest/globals";
import {
  createWebhookSignature,
  validateWebhookSignature,
  formatSignatureHeader,
} from "~/server/lib/webhook-signature";

describe("webhook-signature", () => {
  const SECRET = "test_webhook_secret_123";

  describe("createWebhookSignature", () => {
    it("должен создавать HMAC-SHA256 подпись", () => {
      const payload = '{"event":"goods.updated","data":{}}';
      const signature = createWebhookSignature(payload, SECRET);

      expect(signature).toBeDefined();
      expect(signature).toHaveLength(64); // SHA256 hex = 64 символа
      expect(signature).toMatch(/^[a-f0-9]+$/); // Только hex символы
    });

    it("должен создавать разные подписи для разных payload", () => {
      const sig1 = createWebhookSignature("payload1", SECRET);
      const sig2 = createWebhookSignature("payload2", SECRET);

      expect(sig1).not.toBe(sig2);
    });

    it("должен создавать разные подписи для разных секретов", () => {
      const payload = "same_payload";
      const sig1 = createWebhookSignature(payload, "secret1");
      const sig2 = createWebhookSignature(payload, "secret2");

      expect(sig1).not.toBe(sig2);
    });

    it("должен создавать одинаковые подписи для одинаковых входных данных", () => {
      const payload = '{"test":"data"}';
      const sig1 = createWebhookSignature(payload, SECRET);
      const sig2 = createWebhookSignature(payload, SECRET);

      expect(sig1).toBe(sig2);
    });
  });

  describe("validateWebhookSignature", () => {
    it("должен валидировать корректную подпись", () => {
      const payload = '{"event":"goods.updated"}';
      const hash = createWebhookSignature(payload, SECRET);
      const signature = `sha256=${hash}`;

      const isValid = validateWebhookSignature(signature, payload, SECRET);

      expect(isValid).toBe(true);
    });

    it("должен отклонять некорректную подпись", () => {
      const payload = '{"event":"goods.updated"}';
      const signature = "sha256=invalid_hash_value";

      const isValid = validateWebhookSignature(signature, payload, SECRET);

      expect(isValid).toBe(false);
    });

    it("должен отклонять null подпись", () => {
      const payload = '{"event":"goods.updated"}';

      const isValid = validateWebhookSignature(null, payload, SECRET);

      expect(isValid).toBe(false);
    });

    it("должен отклонять подпись без префикса sha256=", () => {
      const payload = '{"event":"goods.updated"}';
      const hash = createWebhookSignature(payload, SECRET);
      const signature = hash; // Без sha256= префикса

      const isValid = validateWebhookSignature(signature, payload, SECRET);

      expect(isValid).toBe(false);
    });

    it("должен отклонять подпись с неверным алгоритмом", () => {
      const payload = '{"event":"goods.updated"}';
      const hash = createWebhookSignature(payload, SECRET);
      const signature = `md5=${hash}`; // Неверный алгоритм

      const isValid = validateWebhookSignature(signature, payload, SECRET);

      expect(isValid).toBe(false);
    });

    it("должен отклонять подпись если payload изменён", () => {
      const originalPayload = '{"event":"goods.updated"}';
      const hash = createWebhookSignature(originalPayload, SECRET);
      const signature = `sha256=${hash}`;

      const modifiedPayload = '{"event":"goods.deleted"}';
      const isValid = validateWebhookSignature(signature, modifiedPayload, SECRET);

      expect(isValid).toBe(false);
    });

    it("должен отклонять подпись с неверным секретом", () => {
      const payload = '{"event":"goods.updated"}';
      const hash = createWebhookSignature(payload, "correct_secret");
      const signature = `sha256=${hash}`;

      const isValid = validateWebhookSignature(signature, payload, "wrong_secret");

      expect(isValid).toBe(false);
    });

    it("должен отклонять пустую подпись", () => {
      const payload = '{"event":"goods.updated"}';

      const isValid = validateWebhookSignature("", payload, SECRET);

      expect(isValid).toBe(false);
    });

    it("должен отклонять подпись только с sha256=", () => {
      const payload = '{"event":"goods.updated"}';

      const isValid = validateWebhookSignature("sha256=", payload, SECRET);

      expect(isValid).toBe(false);
    });
  });

  describe("formatSignatureHeader", () => {
    it("должен форматировать hash в заголовок", () => {
      const hash = "abc123def456";
      const header = formatSignatureHeader(hash);

      expect(header).toBe("sha256=abc123def456");
    });
  });

  describe("интеграционный тест подписи", () => {
    it("должен корректно создавать и валидировать подпись", () => {
      const payload = JSON.stringify({
        event: "goods.updated",
        timestamp: "2026-01-31T12:00:00Z",
        data: {
          sku: "SKU-001",
          name: "Болт М8x30",
          quantity: 100,
          warehouse: "warehouse_main",
        },
      });

      // Создаём подпись
      const hash = createWebhookSignature(payload, SECRET);
      const header = formatSignatureHeader(hash);

      // Валидируем
      const isValid = validateWebhookSignature(header, payload, SECRET);

      expect(isValid).toBe(true);
    });
  });
});
