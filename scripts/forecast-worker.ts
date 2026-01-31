/**
 * Forecast Worker - фоновая генерация прогнозов и рекомендаций
 * Phase 4: Predictive Analytics
 * 
 * Запуск: tsx scripts/forecast-worker.ts
 * Cron: 0 2 * * * (каждый день в 02:00, после агрегации)
 */

import "dotenv/config";
import { db } from "../src/server/db";
import { forecastService } from "../src/server/services/forecast-service";
import { reorderService } from "../src/server/services/reorder-service";
import { notificationService } from "../src/server/services/notification-service";
import { format } from "date-fns";

interface ForecastStats {
  processed: number;
  critical: number;
  warning: number;
  errors: number;
}

async function runForecastWorker(): Promise<ForecastStats> {
  const stats: ForecastStats = {
    processed: 0,
    critical: 0,
    warning: 0,
    errors: 0,
  };

  console.log("🔮 Запуск Forecast Worker...");
  console.log(`📅 Дата: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`);

  // 1. Получаем все товары с остатками
  const inventoryItems = await db.inventory.findMany({
    where: { quantity: { gt: 0 } },
    orderBy: { quantity: "asc" },
  });

  console.log(`📦 Товаров для обработки: ${inventoryItems.length}`);

  // 2. Генерируем прогнозы и сохраняем
  for (const item of inventoryItems) {
    try {
      // Генерируем прогноз
      const forecast = await forecastService.forecast({
        sku: item.sku,
        warehouse: item.warehouse,
        forecastDays: 14,
        model: "sma",
      });

      // Сохраняем прогноз
      await forecastService.saveForecast(forecast);

      // Получаем рекомендацию
      const recommendation = await reorderService.getRecommendationForProduct(
        item.sku,
        item.warehouse
      );

      if (recommendation) {
        // Сохраняем рекомендацию если нужен заказ
        if (recommendation.urgency !== "normal" || 
            recommendation.currentQty <= recommendation.reorderPoint) {
          await reorderService.saveRecommendation(recommendation);

          if (recommendation.urgency === "critical") {
            stats.critical++;
          } else if (recommendation.urgency === "warning") {
            stats.warning++;
          }
        }
      }

      stats.processed++;

      // Логируем прогресс каждые 50 товаров
      if (stats.processed % 50 === 0) {
        console.log(`   Обработано: ${stats.processed}/${inventoryItems.length}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка для ${item.sku}:`, error);
      stats.errors++;
    }
  }

  // 3. Очищаем устаревшие рекомендации
  const cleanedCount = await reorderService.cleanupExpired();
  console.log(`🧹 Очищено устаревших рекомендаций: ${cleanedCount}`);

  return stats;
}

async function sendDailyDigest(stats: ForecastStats): Promise<void> {
  // Получаем критичные и warning рекомендации
  const criticalRecs = await reorderService.getRecommendations({
    urgency: "critical",
    limit: 10,
  });

  const warningRecs = await reorderService.getRecommendations({
    urgency: "warning",
    limit: 10,
  });

  if (criticalRecs.length === 0 && warningRecs.length === 0) {
    console.log("📧 Нет критичных рекомендаций - дайджест не отправляется");
    return;
  }

  // Формируем HTML для письма
  const criticalHtml = criticalRecs
    .map(
      (r) =>
        `<tr style="background-color: #fef2f2;">
          <td style="padding: 8px; border-bottom: 1px solid #fecaca;">${r.sku}</td>
          <td style="padding: 8px; border-bottom: 1px solid #fecaca;">${r.productName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #fecaca; text-align: right;">${r.currentQty}</td>
          <td style="padding: 8px; border-bottom: 1px solid #fecaca; text-align: right;">${r.daysToStockout} дн</td>
          <td style="padding: 8px; border-bottom: 1px solid #fecaca; text-align: right; font-weight: bold;">${r.recommendedQty}</td>
        </tr>`
    )
    .join("");

  const warningHtml = warningRecs
    .map(
      (r) =>
        `<tr style="background-color: #fffbeb;">
          <td style="padding: 8px; border-bottom: 1px solid #fde68a;">${r.sku}</td>
          <td style="padding: 8px; border-bottom: 1px solid #fde68a;">${r.productName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #fde68a; text-align: right;">${r.currentQty}</td>
          <td style="padding: 8px; border-bottom: 1px solid #fde68a; text-align: right;">${r.daysToStockout} дн</td>
          <td style="padding: 8px; border-bottom: 1px solid #fde68a; text-align: right; font-weight: bold;">${r.recommendedQty}</td>
        </tr>`
    )
    .join("");

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e293b;">📦 Ежедневный отчёт по заказам</h1>
      <p style="color: #64748b;">AI Stock Keeper | ${format(new Date(), "dd.MM.yyyy")}</p>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0; color: #475569;">Сводка:</h3>
        <p style="margin: 0; color: #64748b;">
          🔴 Критично: <strong style="color: #dc2626;">${stats.critical}</strong> · 
          🟡 Внимание: <strong style="color: #d97706;">${stats.warning}</strong> · 
          ✅ Обработано: <strong>${stats.processed}</strong>
        </p>
      </div>

      ${
        criticalRecs.length > 0
          ? `
        <h2 style="color: #dc2626;">🔴 Критичные (заказать сегодня)</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background-color: #fee2e2;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fecaca;">SKU</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fecaca;">Товар</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fecaca;">Остаток</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fecaca;">До 0</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fecaca;">Заказать</th>
            </tr>
          </thead>
          <tbody>
            ${criticalHtml}
          </tbody>
        </table>
      `
          : ""
      }

      ${
        warningRecs.length > 0
          ? `
        <h2 style="color: #d97706;">🟡 Требуют внимания</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background-color: #fef3c7;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fde68a;">SKU</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fde68a;">Товар</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fde68a;">Остаток</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fde68a;">До 0</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fde68a;">Заказать</th>
            </tr>
          </thead>
          <tbody>
            ${warningHtml}
          </tbody>
        </table>
      `
          : ""
      }

      <div style="text-align: center; margin-top: 24px;">
        <a href="${process.env.APP_URL ?? "http://localhost:3000"}/forecast" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Открыть Dashboard
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
        Это автоматическое уведомление от AI Stock Keeper
      </p>
    </div>
  `;

  // Отправляем (если настроен email)
  try {
    // TODO: Получить email получателей из настроек
    // await notificationService.sendEmail(...)
    console.log("📧 Дайджест подготовлен (отправка требует настройки RESEND_API_KEY)");
  } catch (error) {
    console.error("❌ Ошибка отправки дайджеста:", error);
  }
}

async function main() {
  try {
    const stats = await runForecastWorker();

    console.log("\n📊 Итоги:");
    console.log(`   ✅ Обработано: ${stats.processed}`);
    console.log(`   🔴 Критично: ${stats.critical}`);
    console.log(`   🟡 Внимание: ${stats.warning}`);
    console.log(`   ❌ Ошибок: ${stats.errors}`);

    // Отправляем дайджест если есть критичные рекомендации
    if (stats.critical > 0 || stats.warning > 0) {
      await sendDailyDigest(stats);
    }

    console.log("\n✅ Forecast Worker завершён успешно");
  } catch (error) {
    console.error("❌ Критическая ошибка Forecast Worker:", error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
