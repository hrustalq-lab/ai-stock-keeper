/**
 * Скрипт агрегации дневного потребления
 * Phase 4: Predictive Analytics
 * 
 * Запуск: tsx scripts/aggregate-consumption.ts
 * Cron: 0 1 * * * (каждый день в 01:00)
 */

import "dotenv/config";
import { consumptionService } from "../src/server/services/consumption-service";
import { subDays, format } from "date-fns";

async function main() {
  const args = process.argv.slice(2);
  
  // Параметры
  const backfillDays = args.includes("--backfill")
    ? parseInt(args[args.indexOf("--backfill") + 1] ?? "30", 10)
    : 1;

  console.log("🔄 Агрегация потребления...");
  console.log(`📅 Период: ${backfillDays} дней`);

  const endDate = subDays(new Date(), 1); // Вчера
  const startDate = subDays(endDate, backfillDays - 1);

  console.log(`   С ${format(startDate, "yyyy-MM-dd")} по ${format(endDate, "yyyy-MM-dd")}`);

  try {
    const count = await consumptionService.aggregateRange(startDate, endDate);
    console.log(`✅ Агрегировано ${count} дней`);
  } catch (error) {
    console.error("❌ Ошибка агрегации:", error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
