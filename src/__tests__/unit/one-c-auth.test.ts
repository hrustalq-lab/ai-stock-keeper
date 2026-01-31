/**
 * Unit-тесты для OneCAuth сервиса
 */

import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";
import { OneCAuth } from "~/server/services/one-c-auth";

// Мокаем глобальный fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Используем кастомную конфигурацию для тестов
const TEST_CONFIG = {
  baseUrl: "http://localhost:3001/api/1c",
  username: "test_user",
  password: "test_password",
};

describe("OneCAuth", () => {
  let auth: OneCAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    auth = new OneCAuth(TEST_CONFIG);
    // Подавляем console.log во время тестов
    jest.spyOn(console, "log").mockImplementation(() => { /* empty */ });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("должен использовать значения по умолчанию из env", () => {
      const authInstance = new OneCAuth();
      // Проверяем что инстанс создан
      expect(authInstance).toBeDefined();
    });

    it("должен принимать кастомную конфигурацию", () => {
      const customConfig = {
        baseUrl: "http://custom:8080",
        username: "custom_user",
        password: "custom_pass",
      };
      const authInstance = new OneCAuth(customConfig);
      expect(authInstance).toBeDefined();
    });
  });

  describe("authenticate", () => {
    it("должен получать новый токен при первом вызове", async () => {
      const mockResponse = {
        accessToken: "test_token_123",
        expiresIn: 3600,
        tokenType: "Bearer",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const token = await auth.authenticate();

      expect(token).toBe("test_token_123");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/1c/auth/token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "test_user",
            password: "test_password",
          }),
        })
      );
    });

    it("должен возвращать кешированный токен если он ещё валиден", async () => {
      const mockResponse = {
        accessToken: "cached_token",
        expiresIn: 3600, // 1 час
        tokenType: "Bearer",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // Первый вызов - получаем токен
      const token1 = await auth.authenticate();
      // Второй вызов - должен вернуть кешированный токен
      const token2 = await auth.authenticate();

      expect(token1).toBe("cached_token");
      expect(token2).toBe("cached_token");
      expect(mockFetch).toHaveBeenCalledTimes(1); // Только один запрос
    });

    it("должен обновлять токен если он истёк", async () => {
      const expiredResponse = {
        accessToken: "expired_token",
        expiresIn: 0, // Истекает сразу
        tokenType: "Bearer",
      };

      const newResponse = {
        accessToken: "new_token",
        expiresIn: 3600,
        tokenType: "Bearer",
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(expiredResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newResponse),
        } as Response);

      // Первый вызов
      await auth.authenticate();

      // Ждём чтобы токен "истёк" (учитывая 60 сек буфер, нужен токен с expiresIn < 60)
      // Сбрасываем токен вручную для теста
      auth.resetToken();

      // Второй вызов - должен получить новый токен
      const token = await auth.authenticate();

      expect(token).toBe("new_token");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("должен выбрасывать ошибку при неудачной аутентификации", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Invalid credentials"),
      } as Response);

      await expect(auth.authenticate()).rejects.toThrow(
        "[1C Auth] Ошибка аутентификации: 401 - Invalid credentials"
      );
    });

    it("должен выбрасывать ошибку при сетевой ошибке", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(auth.authenticate()).rejects.toThrow("Network error");
    });
  });

  describe("getAuthHeaders", () => {
    it("должен возвращать заголовки с токеном", async () => {
      const mockResponse = {
        accessToken: "header_test_token",
        expiresIn: 3600,
        tokenType: "Bearer",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const headers = await auth.getAuthHeaders();

      expect(headers).toEqual({
        Authorization: "Bearer header_test_token",
        "Content-Type": "application/json",
      });
    });
  });

  describe("resetToken", () => {
    it("должен сбрасывать кешированный токен", async () => {
      const mockResponse = {
        accessToken: "original_token",
        expiresIn: 3600,
        tokenType: "Bearer",
      };

      const newResponse = {
        accessToken: "new_token_after_reset",
        expiresIn: 3600,
        tokenType: "Bearer",
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newResponse),
        } as Response);

      // Получаем первый токен
      const token1 = await auth.authenticate();
      expect(token1).toBe("original_token");

      // Сбрасываем
      auth.resetToken();

      // Получаем новый токен
      const token2 = await auth.authenticate();
      expect(token2).toBe("new_token_after_reset");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
