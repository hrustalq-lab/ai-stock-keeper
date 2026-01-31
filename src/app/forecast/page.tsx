"use client";

/**
 * Страница прогнозирования - Phase 4
 * /forecast
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  ForecastChart,
  ReorderTable,
  TrendIndicator,
} from "~/app/_components/forecast";

type ForecastModel = "sma" | "ema" | "prophet";

export default function ForecastPage() {
  // Состояние фильтров
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [forecastDays, setForecastDays] = useState(14);
  const [model, setModel] = useState<ForecastModel>("sma");
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  // Получаем список складов
  const { data: warehouses } = api.inventory.getWarehouses.useQuery();

  // Получаем рекомендации
  // warehouse: "all" означает все склады (поддержка в бэкенде)
  const { data: recommendations, isLoading: loadingRecs } =
    api.forecast.getRecommendations.useQuery({
      warehouse: selectedWarehouse === "all" ? undefined : selectedWarehouse,
      limit: 50,
    });

  // Получаем сводку
  const { data: summary } = api.forecast.getRecommendationsSummary.useQuery({
    warehouse: selectedWarehouse === "all" ? undefined : selectedWarehouse,
  });

  // Получаем данные для графика выбранного товара
  const { data: chartData, isLoading: loadingChart } =
    api.forecast.getChartData.useQuery(
      {
        sku: selectedSku ?? "",
        warehouse: selectedWarehouse === "all" ? undefined : selectedWarehouse,
        historyDays: 30,
        forecastDays,
        model,
      },
      { enabled: !!selectedSku }
    );

  // Обработчик клика на "Заказать"
  const handleOrderClick = (sku: string, warehouse: string, qty: number) => {
    // TODO: Интеграция с формой заказа или 1C
    alert(`Заказ: ${sku} - ${qty} шт на склад ${warehouse}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Шапка */}
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                📈 Прогноз запасов
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Рекомендации по дозаказу на основе анализа потребления
              </p>
            </div>

            {/* Фильтры */}
            <div className="flex items-center gap-4">
              {/* Склад */}
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Все склады</option>
                {warehouses?.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>

              {/* Период прогноза */}
              <select
                value={forecastDays}
                onChange={(e) => setForecastDays(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value={7}>7 дней</option>
                <option value={14}>14 дней</option>
                <option value={30}>30 дней</option>
              </select>

              {/* Модель */}
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as ForecastModel)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="sma">SMA (простое среднее)</option>
                <option value="ema">EMA (экспоненциальное)</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Сводка по срочности */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔴</span>
              <div>
                <p className="text-2xl font-bold text-red-700">
                  {summary?.critical ?? 0}
                </p>
                <p className="text-sm text-red-600">Критичных</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🟡</span>
              <div>
                <p className="text-2xl font-bold text-amber-700">
                  {summary?.warning ?? 0}
                </p>
                <p className="text-sm text-amber-600">Требуют внимания</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🟢</span>
              <div>
                <p className="text-2xl font-bold text-emerald-700">
                  {summary?.normal ?? 0}
                </p>
                <p className="text-sm text-emerald-600">В норме</p>
              </div>
            </div>
          </div>
        </div>

        {/* Основной контент */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Левая колонка: таблица рекомендаций */}
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                📦 Рекомендации к заказу
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                Экспорт CSV
              </button>
            </div>
            <ReorderTable
              items={
                recommendations?.map((r) => ({
                  sku: r.sku,
                  productName: r.productName,
                  warehouse: r.warehouse,
                  currentQty: r.currentQty,
                  daysToStockout: r.daysToStockout,
                  recommendedQty: r.recommendedQty,
                  urgency: r.urgency,
                  reasoning: r.reasoning,
                  supplier: r.supplier,
                })) ?? []
              }
              onOrderClick={handleOrderClick}
              isLoading={loadingRecs}
            />

            {/* Список для выбора товара */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium text-slate-600">
                Выберите товар для детального прогноза:
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {recommendations?.slice(0, 6).map((r) => (
                  <button
                    key={`${r.sku}-${r.warehouse}`}
                    onClick={() => setSelectedSku(r.sku)}
                    className={`rounded-lg border p-2 text-left text-sm transition-all ${
                      selectedSku === r.sku
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <p className="truncate font-medium text-slate-700">
                      {r.productName}
                    </p>
                    <p className="font-mono text-xs text-slate-400">{r.sku}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Правая колонка: график */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  📊 Прогноз по товару
                </h2>
                {chartData && (
                  <TrendIndicator trend={chartData.trend} size="sm" />
                )}
              </div>

              {selectedSku && chartData ? (
                <>
                  <ForecastChart
                    data={chartData.chartData}
                    reorderPoint={chartData.reorderPoint}
                    currentQty={chartData.currentQty}
                    height={280}
                  />

                  {/* Статистика под графиком */}
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Текущий остаток</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {chartData.currentQty}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">До нуля</p>
                      <p
                        className={`text-lg font-semibold ${
                          chartData.daysToStockout <= 7
                            ? "text-red-600"
                            : chartData.daysToStockout <= 14
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {chartData.daysToStockout === 999
                          ? "∞"
                          : `${chartData.daysToStockout} дн`}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Расход/день</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {chartData.avgDailyConsumption.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Точка заказа</p>
                      <p className="text-lg font-semibold text-amber-600">
                        {chartData.reorderPoint}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-[280px] flex-col items-center justify-center text-slate-400">
                  <span className="text-4xl">📊</span>
                  <p className="mt-2">
                    {loadingChart
                      ? "Загрузка..."
                      : "Выберите товар для просмотра прогноза"}
                  </p>
                </div>
              )}
            </div>

            {/* Информация о модели */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-medium text-slate-700">
                ℹ️ О модели прогнозирования
              </h3>
              <p className="text-xs text-slate-500">
                {model === "sma" && (
                  <>
                    <strong>Simple Moving Average (SMA)</strong> — простое скользящее
                    среднее за последние 7 дней. Подходит для товаров со стабильным
                    спросом.
                  </>
                )}
                {model === "ema" && (
                  <>
                    <strong>Exponential Moving Average (EMA)</strong> — экспоненциальное
                    среднее, где недавние данные имеют больший вес. Лучше реагирует на
                    изменения тренда.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
