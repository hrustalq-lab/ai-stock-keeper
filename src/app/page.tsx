"use client";

import { useState } from "react";
import { PageHeader } from "~/components/page-header";
import {
  InventoryOverview,
  LowStockWidget,
  RecentActivityFeed,
  StockLevelChart,
  AlertsWidget,
  WarehouseSelector,
  ConnectionStatus,
} from "~/app/_components/dashboard";
import { ForecastWidget } from "~/app/_components/dashboard/ForecastWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import Link from "next/link";
import {
  PackagePlus,
  ClipboardList,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

/**
 * Главная страница - Dashboard
 * Real-time обзор инвентаризации с виджетами и графиками
 */
export default function DashboardPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>();

  return (
    <>
      {/* Header */}
      <PageHeader
        title="Дашборд"
        description="Обзор состояния инвентаря в реальном времени"
        actions={
          <div className="flex items-center gap-2">
            <ConnectionStatus />
            <WarehouseSelector
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
            />
            <Button size="sm" variant="outline" className="hidden sm:flex">
              <RefreshCw className="mr-2 size-4" />
              Обновить
            </Button>
            <Button size="icon" variant="outline" className="sm:hidden">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {/* Quick Actions */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <Link href="/intake" className="block">
            <Card className="group h-full cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:glow-primary">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Быстрая приёмка
                </CardTitle>
                <div className="shrink-0 rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                  <PackagePlus className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm">
                  Сканируйте штрих-код или загрузите фото для быстрой приёмки товаров
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/picking" className="block">
            <Card className="group h-full cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:glow-primary">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <CardTitle className="text-sm font-medium">
                    Сборка заказов
                  </CardTitle>
                  <Badge variant="secondary" className="w-fit text-xs">5 активных</Badge>
                </div>
                <div className="shrink-0 rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                  <ClipboardList className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm">
                  Управление листами сборки с оптимизацией маршрутов
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/forecast" className="block sm:col-span-2 lg:col-span-1">
            <Card className="group h-full cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:glow-primary">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <CardTitle className="text-sm font-medium">
                    Прогноз запасов
                  </CardTitle>
                  <Badge variant="destructive" className="w-fit text-xs">3 критичных</Badge>
                </div>
                <div className="shrink-0 rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                  <TrendingUp className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm">
                  AI-прогнозирование и рекомендации по дозаказу
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Overview Cards */}
        <section>
          <InventoryOverview warehouse={selectedWarehouse} />
        </section>

        {/* Main Grid */}
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          {/* Left Column - Chart + Activity */}
          <div className="space-y-4 lg:col-span-2 lg:space-y-6">
            <StockLevelChart warehouse={selectedWarehouse} days={7} />
            <RecentActivityFeed warehouse={selectedWarehouse} limit={10} />
          </div>

          {/* Right Column - Widgets */}
          <div className="space-y-4 lg:space-y-6">
            <LowStockWidget warehouse={selectedWarehouse} limit={5} />
            <ForecastWidget warehouse={selectedWarehouse} limit={3} />
            <AlertsWidget limit={5} />
          </div>
        </div>
      </main>
    </>
  );
}
