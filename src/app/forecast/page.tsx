"use client";

/**
 * Страница прогнозирования - Phase 4
 * /forecast
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ForecastChart,
  ReorderTable,
  TrendIndicator,
} from "~/app/_components/forecast";
import { 
  TrendingUp, 
  Download, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  Info,
  Warehouse
} from "lucide-react";

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
    <>
      <PageHeader
        title="Прогноз запасов"
        description="Рекомендации по дозаказу на основе AI-анализа потребления"
        breadcrumbs={[{ label: "Прогноз" }]}
        actions={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Склад */}
            <Select
              value={selectedWarehouse}
              onValueChange={setSelectedWarehouse}
            >
              <SelectTrigger className="w-auto min-w-[90px] sm:w-[140px]">
                <Warehouse className="mr-1.5 size-3.5 shrink-0 text-muted-foreground sm:mr-2 sm:size-4" />
                <SelectValue placeholder="Склад" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все склады</SelectItem>
                {warehouses?.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Период прогноза */}
            <Select
              value={String(forecastDays)}
              onValueChange={(val) => setForecastDays(Number(val))}
            >
              <SelectTrigger className="w-[80px] sm:w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="14">14 дней</SelectItem>
                <SelectItem value="30">30 дней</SelectItem>
              </SelectContent>
            </Select>

            {/* Модель - скрываем на мобильных */}
            <Select
              value={model}
              onValueChange={(val) => setModel(val as ForecastModel)}
            >
              <SelectTrigger className="hidden w-[140px] sm:flex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sma">SMA (простое среднее)</SelectItem>
                <SelectItem value="ema">EMA (экспоненциальное)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <main className="flex-1 p-4 md:p-6">
        {/* Сводка по срочности */}
        <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-4">
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center gap-1 p-2 sm:flex-row sm:gap-4 sm:p-4">
              <div className="rounded-lg bg-destructive/10 p-2 sm:p-3">
                <AlertCircle className="size-4 text-destructive sm:size-6" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-destructive sm:text-2xl">
                  {summary?.critical ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground sm:text-sm">Критичных</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-amber-500/30">
            <CardContent className="flex flex-col items-center gap-1 p-2 sm:flex-row sm:gap-4 sm:p-4">
              <div className="rounded-lg bg-amber-500/10 p-2 sm:p-3">
                <AlertTriangle className="size-4 text-amber-500 sm:size-6" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-amber-500 sm:text-2xl">
                  {summary?.warning ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground sm:text-sm">Внимание</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-emerald-500/30">
            <CardContent className="flex flex-col items-center gap-1 p-2 sm:flex-row sm:gap-4 sm:p-4">
              <div className="rounded-lg bg-emerald-500/10 p-2 sm:p-3">
                <CheckCircle className="size-4 text-emerald-500 sm:size-6" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-emerald-500 sm:text-2xl">
                  {summary?.normal ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground sm:text-sm">В норме</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Основной контент */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Левая колонка: таблица рекомендаций */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="size-5 text-primary" />
                    Рекомендации к заказу
                  </CardTitle>
                  <CardDescription>
                    Товары, требующие пополнения запасов
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 size-4" />
                  Экспорт CSV
                </Button>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Список для выбора товара */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Выберите товар для детального прогноза</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {recommendations?.slice(0, 6).map((r) => (
                    <Button
                      key={`${r.sku}-${r.warehouse}`}
                      variant={selectedSku === r.sku ? "default" : "outline"}
                      className="h-auto flex-col items-start gap-1 p-3"
                      onClick={() => setSelectedSku(r.sku)}
                    >
                      <span className="truncate text-sm font-medium">
                        {r.productName}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.sku}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Правая колонка: график */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-primary" />
                  Прогноз по товару
                </CardTitle>
                {chartData && (
                  <TrendIndicator trend={chartData.trend} size="sm" />
                )}
              </CardHeader>
              <CardContent>
                {selectedSku && chartData ? (
                  <>
                    <ForecastChart
                      data={chartData.chartData}
                      reorderPoint={chartData.reorderPoint}
                      currentQty={chartData.currentQty}
                      height={280}
                    />

                    {/* Статистика под графиком */}
                    <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Текущий остаток</p>
                        <p className="text-lg font-semibold">
                          {chartData.currentQty}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">До нуля</p>
                        <p
                          className={`text-lg font-semibold ${
                            chartData.daysToStockout <= 7
                              ? "text-destructive"
                              : chartData.daysToStockout <= 14
                              ? "text-amber-500"
                              : "text-emerald-500"
                          }`}
                        >
                          {chartData.daysToStockout === 999
                            ? "∞"
                            : `${chartData.daysToStockout} дн`}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Расход/день</p>
                        <p className="text-lg font-semibold">
                          {chartData.avgDailyConsumption.toFixed(1)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Точка заказа</p>
                        <p className="text-lg font-semibold text-amber-500">
                          {chartData.reorderPoint}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-[280px] flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="mb-2 size-10" />
                    <p>
                      {loadingChart
                        ? "Загрузка..."
                        : "Выберите товар для просмотра прогноза"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Информация о модели */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Info className="size-4" />
                  О модели прогнозирования
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {model === "sma" && (
                    <>
                      <strong className="text-foreground">Simple Moving Average (SMA)</strong> — простое скользящее
                      среднее за последние 7 дней. Подходит для товаров со стабильным
                      спросом.
                    </>
                  )}
                  {model === "ema" && (
                    <>
                      <strong className="text-foreground">Exponential Moving Average (EMA)</strong> — экспоненциальное
                      среднее, где недавние данные имеют больший вес. Лучше реагирует на
                      изменения тренда.
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
