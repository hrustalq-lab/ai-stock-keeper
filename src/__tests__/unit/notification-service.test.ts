/**
 * Unit-тесты для NotificationService
 * Тестируем webhook и утилитарные методы (email тестируется через mock без Resend)
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

// Мокаем глобальный fetch (используем any для упрощения типизации mock Response)
const mockFetch = jest.fn<any>();
global.fetch = mockFetch;

// Мокаем env
jest.mock("~/env", () => ({
  env: {
    RESEND_API_KEY: undefined, // без Resend для упрощения тестов
    RESEND_FROM_EMAIL: "noreply@test.com",
  },
}));

import { NotificationService, type EmailAlertParams } from "~/server/services/notification-service";

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("sendEmailAlert (mock mode без Resend)", () => {
    const defaultParams: EmailAlertParams = {
      to: "recipient@example.com",
      sku: "SKU-001",
      productName: "Test Product",
      currentQuantity: 5,
      threshold: 10,
      warehouse: "WH-MAIN",
      condition: "below",
    };

    it("должен возвращать mock результат без RESEND_API_KEY", async () => {
      const result = await service.sendEmailAlert(defaultParams);

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock-/);
    });

    it("должен обрабатывать condition below", async () => {
      const result = await service.sendEmailAlert({
        ...defaultParams,
        condition: "below",
      });

      expect(result.success).toBe(true);
    });

    it("должен обрабатывать condition above", async () => {
      const result = await service.sendEmailAlert({
        ...defaultParams,
        condition: "above",
      });

      expect(result.success).toBe(true);
    });

    it("должен обрабатывать condition equals", async () => {
      const result = await service.sendEmailAlert({
        ...defaultParams,
        condition: "equals",
      });

      expect(result.success).toBe(true);
    });

    it("должен работать без productName", async () => {
      const result = await service.sendEmailAlert({
        ...defaultParams,
        productName: "",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendWebhook", () => {
    const webhookUrl = "https://example.com/webhook";
    const payload = { type: "test", data: { value: 123 } };

    it("должен отправлять POST запрос", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      const result = await service.sendWebhook(webhookUrl, payload);

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^webhook-/);
      expect(mockFetch).toHaveBeenCalledWith(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"type":"test"'),
      });
    });

    it("должен добавлять timestamp и source", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await service.sendWebhook(webhookUrl, payload);

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0] as [string, { body: string }])[1].body
      );
      expect(callBody.timestamp).toBeDefined();
      expect(callBody.source).toBe("ai-stock-keeper");
    });

    it("должен сохранять исходные данные payload", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await service.sendWebhook(webhookUrl, payload);

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0] as [string, { body: string }])[1].body
      );
      expect(callBody.type).toBe("test");
      expect(callBody.data.value).toBe(123);
    });

    it("должен обрабатывать HTTP ошибку", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await service.sendWebhook(webhookUrl, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("HTTP 500: Internal Server Error");
    });

    it("должен обрабатывать HTTP 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await service.sendWebhook(webhookUrl, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("HTTP 404: Not Found");
    });

    it("должен обрабатывать сетевую ошибку", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await service.sendWebhook(webhookUrl, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection refused");
    });

    it("должен обрабатывать timeout ошибку", async () => {
      mockFetch.mockRejectedValue(new Error("Timeout"));

      const result = await service.sendWebhook(webhookUrl, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timeout");
    });

    it("должен обрабатывать неизвестную ошибку", async () => {
      mockFetch.mockRejectedValue("Unknown error");

      const result = await service.sendWebhook(webhookUrl, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("должен обрабатывать null ошибку", async () => {
      mockFetch.mockRejectedValue(null);

      const result = await service.sendWebhook(webhookUrl, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("должен отправлять пустой payload", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await service.sendWebhook(webhookUrl, {});

      expect(result.success).toBe(true);
      const callBody = JSON.parse(
        (mockFetch.mock.calls[0] as [string, { body: string }])[1].body
      );
      expect(callBody.timestamp).toBeDefined();
      expect(callBody.source).toBe("ai-stock-keeper");
    });

    it("должен отправлять сложный вложенный payload", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const complexPayload = {
        event: "stock_alert",
        data: {
          items: [
            { sku: "A", qty: 5 },
            { sku: "B", qty: 10 },
          ],
          meta: {
            warehouse: "WH-1",
            zone: "A",
          },
        },
      };

      await service.sendWebhook(webhookUrl, complexPayload);

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0] as [string, { body: string }])[1].body
      );
      expect(callBody.event).toBe("stock_alert");
      expect(callBody.data.items).toHaveLength(2);
      expect(callBody.data.meta.warehouse).toBe("WH-1");
    });
  });

  describe("getConditionText (через sendEmailAlert mock)", () => {
    // Тестируем косвенно через mock email вывод
    it("должен обрабатывать все типы условий", async () => {
      const conditions: Array<"below" | "above" | "equals"> = ["below", "above", "equals"];

      for (const condition of conditions) {
        const result = await service.sendEmailAlert({
          to: "test@example.com",
          sku: "TEST",
          productName: "Test",
          currentQuantity: 5,
          threshold: 10,
          warehouse: "WH",
          condition,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Инициализация сервиса", () => {
    it("должен создаваться без ошибок", () => {
      const newService = new NotificationService();
      expect(newService).toBeInstanceOf(NotificationService);
    });
  });
});
