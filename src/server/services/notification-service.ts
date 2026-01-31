/**
 * Сервис уведомлений (Phase 3)
 * Поддерживает email (Resend) и webhook каналы
 */

import { Resend } from "resend";
import { env } from "~/env";

/**
 * Параметры email алерта
 */
export interface EmailAlertParams {
  to: string;
  sku: string;
  productName: string;
  currentQuantity: number;
  threshold: number;
  warehouse: string;
  condition: "below" | "above" | "equals";
}

/**
 * Результат отправки уведомления
 */
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class NotificationService {
  private resend: Resend | null = null;

  constructor() {
    // Resend инициализируется только если есть API key
    if (env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY);
    } else {
      console.warn(
        "[NotificationService] RESEND_API_KEY не задан, email уведомления отключены"
      );
    }
  }

  /**
   * Отправить email алерт о низком/высоком остатке
   */
  async sendEmailAlert(params: EmailAlertParams): Promise<NotificationResult> {
    if (!this.resend) {
      console.log("[NotificationService] Mock email (Resend не настроен):", params);
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
      };
    }

    try {
      const conditionText = this.getConditionText(params.condition);
      const subject = this.getSubject(params);

      const result = await this.resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: params.to,
        subject,
        html: this.buildEmailHtml(params, conditionText),
      });

      if (result.error) {
        console.error("[NotificationService] Resend error:", result.error);
        return {
          success: false,
          error: result.error.message,
        };
      }

      console.log(`[NotificationService] Email отправлен: ${result.data?.id}`);
      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[NotificationService] Email error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Отправить webhook уведомление
   */
  async sendWebhook(
    url: string,
    payload: Record<string, unknown>
  ): Promise<NotificationResult> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          source: "ai-stock-keeper",
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      console.log(`[NotificationService] Webhook отправлен: ${url}`);
      return {
        success: true,
        messageId: `webhook-${Date.now()}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[NotificationService] Webhook error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Получить текст условия
   */
  private getConditionText(condition: "below" | "above" | "equals"): string {
    switch (condition) {
      case "below":
        return "опустился ниже";
      case "above":
        return "превысил";
      case "equals":
        return "достиг";
    }
  }

  /**
   * Сформировать тему письма
   */
  private getSubject(params: EmailAlertParams): string {
    const emoji = params.condition === "below" ? "⚠️" : "📊";
    return `${emoji} Алерт: ${params.productName || params.sku} — ${params.currentQuantity} шт (склад: ${params.warehouse})`;
  }

  /**
   * Сформировать HTML письма
   */
  private buildEmailHtml(
    params: EmailAlertParams,
    conditionText: string
  ): string {
    const alertColor = params.condition === "below" ? "#dc2626" : "#2563eb";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: ${alertColor}; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">📦 AI Stock Keeper</h1>
      <p style="margin: 8px 0 0; opacity: 0.9;">Уведомление об остатке</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 24px;">
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px; color: #1f2937; font-size: 18px;">
          ${params.productName || params.sku}
        </h2>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          SKU: <strong>${params.sku}</strong>
        </p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">Текущий остаток</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <strong style="color: ${alertColor}; font-size: 18px;">${params.currentQuantity} шт</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">Пороговое значение</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <strong>${params.threshold} шт</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">Склад</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <strong>${params.warehouse}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;">
            <span style="color: #6b7280;">Условие</span>
          </td>
          <td style="padding: 12px 0; text-align: right;">
            <span style="background: ${alertColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${conditionText} ${params.threshold}
            </span>
          </td>
        </tr>
      </table>
      
      <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
        Остаток товара <strong>${conditionText}</strong> установленный порог.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        Это автоматическое уведомление от AI Stock Keeper
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

// Синглтон
export const notificationService = new NotificationService();
