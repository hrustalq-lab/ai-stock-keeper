import { env } from "~/env";

/**
 * Конфигурация 1C API
 */
interface OneCConfig {
  baseUrl: string;
  username: string;
  password: string;
}

/**
 * Ответ аутентификации 1C
 */
interface AuthResponse {
  accessToken: string;
  expiresIn: number; // секунды
  tokenType: string;
}

/**
 * Сервис аутентификации 1C
 * Управляет токенами доступа и их обновлением
 */
export class OneCAuth {
  private config: OneCConfig;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config?: Partial<OneCConfig>) {
    this.config = {
      baseUrl: config?.baseUrl ?? env.ONE_C_BASE_URL,
      username: config?.username ?? env.ONE_C_USERNAME,
      password: config?.password ?? env.ONE_C_PASSWORD,
    };
  }

  /**
   * Получить действующий токен доступа
   * Автоматически обновляет токен при истечении
   */
  async authenticate(): Promise<string> {
    // Проверяем валидность текущего токена (с запасом 60 сек)
    if (this.accessToken && this.tokenExpiry) {
      const bufferTime = 60 * 1000; // 60 секунд запаса
      if (new Date().getTime() + bufferTime < this.tokenExpiry.getTime()) {
        return this.accessToken;
      }
    }

    // Получаем новый токен
    const response = await fetch(`${this.config.baseUrl}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[1C Auth] Ошибка аутентификации: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as AuthResponse;
    
    this.accessToken = data.accessToken;
    this.tokenExpiry = new Date(Date.now() + data.expiresIn * 1000);

    console.log("[1C Auth] Токен получен, истекает:", this.tokenExpiry.toISOString());

    return this.accessToken;
  }

  /**
   * Получить заголовки авторизации для запросов к 1C API
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.authenticate();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Сбросить токен (для принудительной повторной аутентификации)
   */
  resetToken(): void {
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
  }
}

// Синглтон для использования во всем приложении
export const oneCAuth = new OneCAuth();
