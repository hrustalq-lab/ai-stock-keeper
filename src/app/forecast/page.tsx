"use client";

/**
 * Страница прогнозирования - Phase 4
 * /forecast
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
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

      <main className="flex-1 p-3 md:p-4">
        {/* Сводка по срочности - compact */}
        <div className="mb-3 grid grid-cols-3 gap-2 sm:mb-4 sm:gap-3">
          <Card className="border-border/50 border-l-2 border-l-destructive">
            <CardContent className="flex items-center gap-2 p-2 sm:gap-3 sm:p-3">
              <div className="rounded-md bg-destructive/10 p-1.5">
                <AlertCircle className="size-4 text-destructive" />
              </div>
              <div>
                <p className="text-base font-semibold text-destructive sm:text-lg">
                  {summary?.critical ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Критичных</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 border-l-2 border-l-amber-500">
            <CardContent className="flex items-center gap-2 p-2 sm:gap-3 sm:p-3">
              <div className="rounded-md bg-amber-500/10 p-1.5">
                <AlertTriangle className="size-4 text-amber-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-amber-600 sm:text-lg">
                  {summary?.warning ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Внимание</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 border-l-2 border-l-emerald-500">
            <CardContent className="flex items-center gap-2 p-2 sm:gap-3 sm:p-3">
              <div className="rounded-md bg-emerald-500/10 p-1.5">
                <CheckCircle className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-emerald-600 sm:text-lg">
                  {summary?.normal ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">В норме</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Основной контент */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {/* Левая колонка: таблица рекомендаций */}
          <div className="space-y-3 sm:space-y-4">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <TrendingUp className="size-4 text-primary" />
                    Рекомендации
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Товары для пополнения
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Download className="mr-1 size-3" />
                  CSV
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
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Выберите товар для прогноза</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
                  {recommendations?.slice(0, 6).map((r) => (
                    <Button
                      key={`${r.sku}-${r.warehouse}`}
                      variant={selectedSku === r.sku ? "default" : "outline"}
                      className="h-auto flex-col items-start gap-0.5 px-2 py-1.5"
                      onClick={() => setSelectedSku(r.sku)}
                    >
                      <span className="w-full truncate text-xs font-medium">
                        {r.productName}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {r.sku}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Правая колонка: график */}
          <div className="space-y-3 sm:space-y-4">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <BarChart3 className="size-4 text-primary" />
                  Прогноз
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
                      height={200}
                    />

                    {/* Статистика под графиком - compact */}
                    <div className="mt-2 grid grid-cols-4 gap-2 border-t pt-2">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Остаток</p>
                        <p className="text-sm font-semibold">
                          {chartData.currentQty}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">До 0</p>
                        <p
                          className={`text-sm font-semibold ${
                            chartData.daysToStockout <= 7
                              ? "text-destructive"
                              : chartData.daysToStockout <= 14
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {chartData.daysToStockout === 999
                            ? "∞"
                            : `${chartData.daysToStockout}д`}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Расх/д</p>
                        <p className="text-sm font-semibold">
                          {chartData.avgDailyConsumption.toFixed(1)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Заказ</p>
                        <p className="text-sm font-semibold text-amber-600">
                          {chartData.reorderPoint}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-[200px] flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="mb-1.5 size-8" />
                    <p className="text-xs">
                      {loadingChart
                        ? "Загрузка..."
                        : "Выберите товар"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Информация о модели - compact */}
            <Card className="border-border/50">
              <CardHeader className="pb-1.5">
                <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="size-3" />
                  О модели
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {model === "sma" && (
                    <>
                      <strong className="text-foreground">SMA</strong> — скользящее среднее за 7 дней
                    </>
                  )}
                  {model === "ema" && (
                    <>
                      <strong className="text-foreground">EMA</strong> — экспоненциальное среднее
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
