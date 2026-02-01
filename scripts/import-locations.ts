/**
 * Скрипт импорта локаций склада
 * Phase 5: Picking Optimization
 *
 * Использование:
 *   npx ts-node scripts/import-locations.ts --warehouse MSK-01 --zones A,B,C --aisles 10 --shelves 5
 *   npx ts-node scripts/import-locations.ts --warehouse MSK-01 --csv locations.csv
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();

interface LocationInput {
  warehouse: string;
  locationCode: string;
  zone: string;
  aisle: number;
  shelf: number;
  position?: number;
  coordX?: number;
  coordY?: number;
  maxCapacity?: number;
  locationType?: string;
}

/**
 * Генерация кода локации
 */
function generateLocationCode(zone: string, aisle: number, shelf: number): string {
  return `${zone}-${String(aisle).padStart(2, "0")}-${String(shelf).padStart(2, "0")}`;
}

/**
 * Генерация сетки локаций
 */
function generateGrid(
  warehouse: string,
  zones: string[],
  aislesPerZone: number,
  shelvesPerAisle: number
): LocationInput[] {
  const locations: LocationInput[] = [];

  for (const zone of zones) {
    for (let aisle = 1; aisle <= aislesPerZone; aisle++) {
      for (let shelf = 1; shelf <= shelvesPerAisle; shelf++) {
        locations.push({
          warehouse,
          locationCode: generateLocationCode(zone, aisle, shelf),
          zone,
          aisle,
          shelf,
          position: 1,
          locationType: "shelf",
        });
      }
    }
  }

  return locations;
}

/**
 * Парсинг CSV файла
 * Ожидаемый формат: locationCode,zone,aisle,shelf,coordX,coordY,maxCapacity,locationType
 */
function parseCSV(filePath: string, warehouse: string): LocationInput[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const locations: LocationInput[] = [];

  // Пропускаем заголовок
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const parts = line.split(",");
    const [locationCode, zone, aisleStr, shelfStr, coordXStr, coordYStr, capacityStr, locationType] = parts;

    if (!locationCode || !zone || !aisleStr || !shelfStr) {
      console.warn(`Пропуск строки ${i + 1}: недостаточно данных`);
      continue;
    }

    locations.push({
      warehouse,
      locationCode: locationCode.trim(),
      zone: zone.trim(),
      aisle: parseInt(aisleStr.trim(), 10),
      shelf: parseInt(shelfStr.trim(), 10),
      coordX: coordXStr ? parseFloat(coordXStr.trim()) : undefined,
      coordY: coordYStr ? parseFloat(coordYStr.trim()) : undefined,
      maxCapacity: capacityStr ? parseInt(capacityStr.trim(), 10) : undefined,
      locationType: locationType?.trim() ?? "shelf",
    });
  }

  return locations;
}

/**
 * Импорт локаций в базу данных
 */
async function importLocations(locations: LocationInput[]): Promise<number> {
  const result = await db.warehouseLocation.createMany({
    data: locations.map((loc) => ({
      warehouse: loc.warehouse,
      locationCode: loc.locationCode,
      zone: loc.zone,
      aisle: loc.aisle,
      shelf: loc.shelf,
      position: loc.position ?? 1,
      coordX: loc.coordX,
      coordY: loc.coordY,
      maxCapacity: loc.maxCapacity,
      locationType: loc.locationType ?? "shelf",
      isActive: true,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);

  // Парсинг аргументов
  let warehouse: string | undefined;
  let zones: string[] = [];
  let aisles = 10;
  let shelves = 5;
  let csvPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--warehouse":
        warehouse = args[++i];
        break;
      case "--zones":
        zones = (args[++i] ?? "").split(",").filter(Boolean);
        break;
      case "--aisles":
        aisles = parseInt(args[++i] ?? "10", 10);
        break;
      case "--shelves":
        shelves = parseInt(args[++i] ?? "5", 10);
        break;
      case "--csv":
        csvPath = args[++i];
        break;
    }
  }

  if (!warehouse) {
    console.error("Ошибка: укажите --warehouse");
    console.log("\nИспользование:");
    console.log("  Генерация сетки:");
    console.log("    npx ts-node scripts/import-locations.ts --warehouse MSK-01 --zones A,B,C --aisles 10 --shelves 5");
    console.log("\n  Импорт из CSV:");
    console.log("    npx ts-node scripts/import-locations.ts --warehouse MSK-01 --csv locations.csv");
    console.log("\n  CSV формат (с заголовком):");
    console.log("    locationCode,zone,aisle,shelf,coordX,coordY,maxCapacity,locationType");
    process.exit(1);
  }

  let locations: LocationInput[];

  if (csvPath) {
    // Импорт из CSV
    const fullPath = path.isAbsolute(csvPath) ? csvPath : path.join(process.cwd(), csvPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Файл не найден: ${fullPath}`);
      process.exit(1);
    }
    console.log(`📁 Импорт из CSV: ${fullPath}`);
    locations = parseCSV(fullPath, warehouse);
  } else {
    // Генерация сетки
    if (zones.length === 0) {
      zones = ["A", "B", "C"]; // Дефолтные зоны
    }
    console.log(`🔲 Генерация сетки: ${zones.join(", ")} × ${aisles} рядов × ${shelves} полок`);
    locations = generateGrid(warehouse, zones, aisles, shelves);
  }

  console.log(`📦 Склад: ${warehouse}`);
  console.log(`📍 Локаций к импорту: ${locations.length}`);

  try {
    const count = await importLocations(locations);
    console.log(`✅ Импортировано: ${count} локаций`);

    // Показываем статистику
    const stats = await db.warehouseLocation.groupBy({
      by: ["zone"],
      where: { warehouse },
      _count: { id: true },
    });

    console.log("\n📊 Статистика по зонам:");
    for (const stat of stats) {
      console.log(`   ${stat.zone}: ${stat._count.id} локаций`);
    }
  } catch (error) {
    console.error("❌ Ошибка импорта:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

void main();
