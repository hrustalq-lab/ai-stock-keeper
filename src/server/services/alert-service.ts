/**
 * Сервис алертов (Phase 3)
 * Проверяет правила и отправляет уведомления при изменении остатков
 */

import { db } from "~/server/db";
import {
  notificationService,
  type NotificationResult,
} from "./notification-service";
import type { AlertRule } from "@prisma/client";

/**
 * Результат проверки правила
 */
export interface AlertCheckResult {
  triggered: boolean;
  rule: AlertRule;
  currentValue: number;
  reason?: string;
}

export class AlertService {
  /**
   * Проверить все активные правила для товара
   * Вызывается при каждом обновлении инвентаря
   */
  async checkAlerts(
    sku: string,
    warehouse: string,
    newQuantity: number,
    productName?: string
  ): Promise<void> {
    // Получаем активные правила для этого SKU/склада
    const rules = await this.getMatchingRules(sku, warehouse);

    if (rules.length === 0) {
      return;
    }

    console.log(
      `[AlertService] Проверка ${rules.length} правил для ${sku} (${newQuantity} шт)`
    );

    for (const rule of rules) {
      const result = this.checkRule(rule, newQuantity);

      if (result.triggered && !this.isInCooldown(rule)) {
        await this.sendNotification(rule, sku, warehouse, newQuantity, productName);
      }
    }
  }

  /**
   * Получить правила, применимые к SKU/складу
   */
  private async getMatchingRules(
    sku: string,
    warehouse: string
  ): Promise<AlertRule[]> {
    return db.alertRule.findMany({
      where: {
        isActive: true,
        OR: [
          // Правило для конкретного SKU и склада
          { sku, warehouse },
          // Правило для конкретного SKU, любой склад
          { sku, warehouse: null },
          // Правило для всех товаров на складе
          { sku: null, warehouse },
          // Глобальное правило
          { sku: null, warehouse: null },
        ],
      },
    });
  }

  /**
   * Проверить одно правило
   */
  checkRule(rule: AlertRule, quantity: number): AlertCheckResult {
    let triggered = false;
    let reason = "";

    switch (rule.condition) {
      case "below":
        triggered = quantity < rule.threshold;
        reason = `${quantity} < ${rule.threshold}`;
        break;
      case "above":
        triggered = quantity > rule.threshold;
        reason = `${quantity} > ${rule.threshold}`;
        break;
      case "equals":
        triggered = quantity === rule.threshold;
        reason = `${quantity} === ${rule.threshold}`;
        break;
    }

    return {
      triggered,
      rule,
      currentValue: quantity,
      reason,
    };
  }

  /**
   * Проверить, находится ли правило в cooldown периоде
   */
  isInCooldown(rule: AlertRule): boolean {
    if (!rule.lastTriggeredAt) {
      return false;
    }

    const cooldownMs = rule.cooldownMins * 60 * 1000;
    const elapsed = Date.now() - rule.lastTriggeredAt.getTime();

    return elapsed < cooldownMs;
  }

  /**
   * Отправить уведомление и записать в историю
   */
  private async sendNotification(
    rule: AlertRule,
    sku: string,
    warehouse: string,
    newQuantity: number,
    productName?: string
  ): Promise<void> {
    let result: NotificationResult;

    // Отправляем уведомление в зависимости от канала
    switch (rule.channel) {
      case "email":
        result = await notificationService.sendEmailAlert({
          to: rule.recipient,
          sku,
          productName: productName ?? sku,
          currentQuantity: newQuantity,
          threshold: rule.threshold,
          warehouse,
          condition: rule.condition as "below" | "above" | "equals",
        });
        break;

      case "webhook":
        result = await notificationService.sendWebhook(rule.recipient, {
          type: "stock_alert",
          rule: {
            id: rule.id,
            name: rule.name,
            condition: rule.condition,
            threshold: rule.threshold,
          },
          product: {
            sku,
            name: productName,
            quantity: newQuantity,
            warehouse,
          },
        });
        break;

      default:
        console.warn(`[AlertService] Неизвестный канал: ${rule.channel}`);
        return;
    }

    // Записываем в историю
    await this.logAlert(rule, sku, warehouse, newQuantity, productName, result);

    // Обновляем время последнего срабатывания
    if (result.success) {
      await db.alertRule.update({
        where: { id: rule.id },
        data: { lastTriggeredAt: new Date() },
      });
    }
  }

  /**
   * Записать алерт в историю
   */
  private async logAlert(
    rule: AlertRule,
    sku: string,
    warehouse: string,
    newQuantity: number,
    productName: string | undefined,
    result: NotificationResult
  ): Promise<void> {
    try {
      await db.alertHistory.create({
        data: {
          ruleId: rule.id,
          ruleName: rule.name,
          sku,
          productName,
          warehouse,
          oldValue: rule.threshold, // Сохраняем threshold как "старое" значение для контекста
          newValue: newQuantity,
          threshold: rule.threshold,
          channel: rule.channel,
          status: result.success ? "sent" : "failed",
          errorMessage: result.error,
        },
      });

      console.log(
        `[AlertService] Алерт записан: ${rule.name} → ${result.success ? "sent" : "failed"}`
      );
    } catch (error) {
      console.error("[AlertService] Ошибка записи истории:", error);
    }
  }

  /**
   * Получить историю алертов
   */
  async getHistory(params: {
    limit?: number;
    offset?: number;
    ruleId?: number;
    sku?: string;
  }) {
    return db.alertHistory.findMany({
      where: {
        ...(params.ruleId && { ruleId: params.ruleId }),
        ...(params.sku && { sku: params.sku }),
      },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
    });
  }

  /**
   * Тестовая отправка алерта (для проверки настроек)
   */
  async testAlert(ruleId: number): Promise<NotificationResult> {
    const rule = await db.alertRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      return { success: false, error: "Правило не найдено" };
    }

    // Отправляем тестовое уведомление
    switch (rule.channel) {
      case "email":
        return notificationService.sendEmailAlert({
          to: rule.recipient,
          sku: rule.sku ?? "TEST-SKU",
          productName: "Тестовый товар",
          currentQuantity: 5,
          threshold: rule.threshold,
          warehouse: rule.warehouse ?? "TEST-WAREHOUSE",
          condition: rule.condition as "below" | "above" | "equals",
        });

      case "webhook":
        return notificationService.sendWebhook(rule.recipient, {
          type: "test_alert",
          message: "Это тестовое уведомление от AI Stock Keeper",
          rule: {
            id: rule.id,
            name: rule.name,
          },
        });

      default:
        return { success: false, error: `Неизвестный канал: ${rule.channel}` };
    }
  }
}

// Синглтон
export const alertService = new AlertService();
