/**
 * RouteOptimizationService - оптимизация маршрутов сборки
 * Phase 5: Picking Optimization
 *
 * Алгоритмы:
 * - Nearest-Neighbor (жадный, O(n²), ~90% от оптимума)
 * - Zone-based (сортировка по зонам + NN внутри)
 */

// ============================================
// Типы
// ============================================

export interface Location {
  code: string;
  zone: string;
  aisle: number;
  shelf: number;
  coordX?: number | null;
  coordY?: number | null;
}

export interface PickItem {
  sku: string;
  productName: string;
  quantity: number;
  location: Location;
}

export interface OptimizedRoute {
  items: PickItem[];        // Отсортированные по маршруту
  totalDistance: number;    // Общее расстояние (метры)
  estimatedMins: number;    // Оценка времени (минуты)
  algorithm: string;        // "nearest_neighbor" | "zone_based"
}

export interface OptimizationConfig {
  algorithm?: "nearest_neighbor" | "zone_based";
  startLocation?: Location;  // Начальная точка (вход на склад)
  endLocation?: Location;    // Конечная точка (зона упаковки)
  walkingSpeedMps?: number;  // Скорость ходьбы м/сек (default: 1.4)
  pickTimeSeconds?: number;  // Время на один pick (default: 15)
}

// ============================================
// Константы по умолчанию
// ============================================

const DEFAULT_WALKING_SPEED_MPS = 1.4;  // м/сек (средняя скорость ходьбы)
const DEFAULT_PICK_TIME_SECONDS = 15;   // секунд на взятие одного товара

// Расстояния для Manhattan distance (примерные)
const ZONE_DISTANCE_METERS = 10;   // между зонами
const AISLE_DISTANCE_METERS = 3;   // между рядами
const SHELF_DISTANCE_METERS = 0.5; // между полками

// ============================================
// Сервис
// ============================================

class RouteOptimizationService {
  /**
   * Оптимизировать маршрут сборки
   */
  optimize(items: PickItem[], config?: OptimizationConfig): OptimizedRoute {
    if (items.length === 0) {
      return {
        items: [],
        totalDistance: 0,
        estimatedMins: 0,
        algorithm: config?.algorithm ?? "nearest_neighbor",
      };
    }

    const algorithm = config?.algorithm ?? this.getDefaultAlgorithm();
    let sortedItems: PickItem[];

    switch (algorithm) {
      case "zone_based":
        sortedItems = this.zoneBased(items, config?.startLocation);
        break;
      case "nearest_neighbor":
      default:
        sortedItems = this.nearestNeighbor(items, config?.startLocation);
        break;
    }

    // Рассчитать общее расстояние
    const totalDistance = this.calculateTotalDistance(
      sortedItems,
      config?.startLocation,
      config?.endLocation
    );

    // Оценить время
    const estimatedMins = this.estimatePickingTime(
      { items: sortedItems, totalDistance, estimatedMins: 0, algorithm },
      config
    );

    return {
      items: sortedItems,
      totalDistance,
      estimatedMins,
      algorithm,
    };
  }

  /**
   * Nearest-Neighbor алгоритм (MVP)
   * Жадный: всегда идём к ближайшей следующей точке
   * O(n²) сложность, ~90% от оптимума для TSP
   */
  nearestNeighbor(items: PickItem[], start?: Location): PickItem[] {
    if (items.length <= 1) return [...items];

    const result: PickItem[] = [];
    const remaining = [...items];

    // Определяем начальную точку
    let current: Location = start ?? remaining[0]!.location;

    while (remaining.length > 0) {
      // Найти ближайший элемент к текущей позиции
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = this.calculateDistance(current, remaining[i]!.location);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      // Добавить в результат и удалить из remaining
      const nearest = remaining.splice(nearestIdx, 1)[0]!;
      result.push(nearest);
      current = nearest.location;
    }

    return result;
  }

  /**
   * Zone-based оптимизация
   * Сначала сортируем по зонам (A → B → C),
   * затем внутри зоны применяем nearest-neighbor
   */
  zoneBased(items: PickItem[], start?: Location): PickItem[] {
    if (items.length <= 1) return [...items];

    // Группируем по зонам
    const byZone = items.reduce(
      (acc, item) => {
        const zone = item.location.zone;
        acc[zone] ??= [];
        acc[zone].push(item);
        return acc;
      },
      {} as Record<string, PickItem[]>
    );

    // Сортируем зоны (A, B, C...)
    const sortedZones = Object.keys(byZone).sort();

    // Определяем порядок обхода зон на основе начальной точки
    if (start) {
      const startZoneIdx = sortedZones.indexOf(start.zone);
      if (startZoneIdx > 0) {
        // Начинаем с зоны старта
        const before = sortedZones.slice(0, startZoneIdx);
        const after = sortedZones.slice(startZoneIdx);
        sortedZones.length = 0;
        sortedZones.push(...after, ...before);
      }
    }

    // Применяем NN внутри каждой зоны
    const result: PickItem[] = [];
    let currentPos: Location | undefined = start;

    for (const zone of sortedZones) {
      const zoneItems = byZone[zone]!;
      const optimized = this.nearestNeighbor(zoneItems, currentPos);
      result.push(...optimized);

      // Обновляем текущую позицию для следующей зоны
      if (optimized.length > 0) {
        currentPos = optimized[optimized.length - 1]!.location;
      }
    }

    return result;
  }

  /**
   * Рассчитать расстояние между двумя локациями
   * Использует Euclidean если есть координаты, иначе Manhattan
   */
  calculateDistance(from: Location, to: Location): number {
    // Если есть координаты - Euclidean distance
    if (
      from.coordX != null &&
      from.coordY != null &&
      to.coordX != null &&
      to.coordY != null
    ) {
      const dx = to.coordX - from.coordX;
      const dy = to.coordY - from.coordY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    // Manhattan distance на основе зон/рядов/полок
    const zoneDist =
      Math.abs(from.zone.charCodeAt(0) - to.zone.charCodeAt(0)) *
      ZONE_DISTANCE_METERS;
    const aisleDist = Math.abs(from.aisle - to.aisle) * AISLE_DISTANCE_METERS;
    const shelfDist = Math.abs(from.shelf - to.shelf) * SHELF_DISTANCE_METERS;

    return zoneDist + aisleDist + shelfDist;
  }

  /**
   * Рассчитать общее расстояние маршрута
   */
  calculateTotalDistance(
    items: PickItem[],
    start?: Location,
    end?: Location
  ): number {
    if (items.length === 0) return 0;

    let total = 0;

    // Расстояние от старта до первого элемента
    if (start) {
      total += this.calculateDistance(start, items[0]!.location);
    }

    // Расстояния между элементами
    for (let i = 0; i < items.length - 1; i++) {
      total += this.calculateDistance(
        items[i]!.location,
        items[i + 1]!.location
      );
    }

    // Расстояние от последнего элемента до конца
    if (end && items.length > 0) {
      total += this.calculateDistance(items[items.length - 1]!.location, end);
    }

    return Math.round(total * 100) / 100; // Округление до см
  }

  /**
   * Построить матрицу расстояний
   */
  buildDistanceMatrix(locations: Location[]): number[][] {
    const n = locations.length;
    const matrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0) as number[]);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this.calculateDistance(locations[i]!, locations[j]!);
        matrix[i]![j] = dist;
        matrix[j]![i] = dist;
      }
    }

    return matrix;
  }

  /**
   * Оценить время сборки в минутах
   */
  estimatePickingTime(
    route: OptimizedRoute,
    config?: OptimizationConfig
  ): number {
    const walkingSpeed = config?.walkingSpeedMps ?? this.getWalkingSpeed();
    const pickTime = config?.pickTimeSeconds ?? this.getPickTimeSeconds();

    // Время на ходьбу (секунды)
    const walkingSeconds = route.totalDistance / walkingSpeed;

    // Время на сборку (секунды) - считаем уникальные локации
    const uniqueLocations = new Set(route.items.map((i) => i.location.code)).size;
    const pickingSeconds = uniqueLocations * pickTime;

    // Общее время в минутах
    const totalMinutes = (walkingSeconds + pickingSeconds) / 60;

    return Math.round(totalMinutes * 10) / 10; // Округление до 0.1 мин
  }

  /**
   * Получить алгоритм по умолчанию из env
   */
  private getDefaultAlgorithm(): "nearest_neighbor" | "zone_based" {
    const envAlgorithm = process.env.ROUTE_OPTIMIZATION_ALGORITHM;
    if (envAlgorithm === "zone_based") return "zone_based";
    return "nearest_neighbor";
  }

  /**
   * Получить скорость ходьбы из env
   */
  private getWalkingSpeed(): number {
    const envSpeed = process.env.WAREHOUSE_WALKING_SPEED_MPS;
    if (envSpeed) {
      const parsed = parseFloat(envSpeed);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return DEFAULT_WALKING_SPEED_MPS;
  }

  /**
   * Получить время на pick из env
   */
  private getPickTimeSeconds(): number {
    const envTime = process.env.WAREHOUSE_PICK_TIME_SECONDS;
    if (envTime) {
      const parsed = parseInt(envTime, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return DEFAULT_PICK_TIME_SECONDS;
  }
}

// Singleton экземпляр
export const routeOptimizationService = new RouteOptimizationService();
