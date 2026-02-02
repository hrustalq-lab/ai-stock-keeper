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
import { Card, CardContent } from "~/components/ui/card";
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
 * Issue #1, #4, #5: Compact cards, reduced spacing, information density
 */
export default function DashboardPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>();

  return (
    <>
      {/* Header */}
      <PageHeader
        title="Дашборд"
        description="Обзор состояния инвентаря"
        actions={
          <div className="flex items-center gap-2">
            <ConnectionStatus />
            <WarehouseSelector
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
            />
            <Button size="sm" variant="outline" className="hidden sm:flex">
              <RefreshCw className="mr-1.5 size-3.5" />
              Обновить
            </Button>
            <Button size="icon" variant="outline" className="size-8 sm:hidden">
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        }
      />

      {/* Main Content - Issue #4: Compact layout */}
      <main className="flex flex-1 flex-col gap-3 p-3 md:gap-4 md:p-4">
        {/* Quick Actions - Issue #1, #5: Compact cards with icon+title inline and badge */}
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          <Link href="/intake" className="block">
            <Card className="group h-full cursor-pointer border-border/50 transition-colors hover:border-primary/40 hover:bg-accent/30">
              <CardContent className="flex items-center gap-3 py-2.5">
                <div className="shrink-0 rounded-md bg-primary/10 p-1.5">
                  <PackagePlus className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Приёмка</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    Сканируйте штрих-код...
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/picking" className="block">
            <Card className="group h-full cursor-pointer border-border/50 transition-colors hover:border-primary/40 hover:bg-accent/30">
              <CardContent className="flex items-center gap-3 py-2.5">
                <div className="shrink-0 rounded-md bg-primary/10 p-1.5">
                  <ClipboardList className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Сборка</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">5</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    Управление листами сборки
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/forecast" className="block sm:col-span-2 lg:col-span-1">
            <Card className="group h-full cursor-pointer border-border/50 transition-colors hover:border-primary/40 hover:bg-accent/30">
              <CardContent className="flex items-center gap-3 py-2.5">
                <div className="shrink-0 rounded-md bg-primary/10 p-1.5">
                  <TrendingUp className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Прогноз</span>
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">3 критичных</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    AI-рекомендации по дозаказу
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Overview Cards */}
        <section>
          <InventoryOverview warehouse={selectedWarehouse} />
        </section>

        {/* Main Grid - Issue #4: Reduced gaps */}
        <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
          {/* Left Column - Chart + Activity */}
          <div className="space-y-3 lg:col-span-2 lg:space-y-4">
            <StockLevelChart warehouse={selectedWarehouse} days={7} />
            <RecentActivityFeed warehouse={selectedWarehouse} limit={10} />
          </div>

          {/* Right Column - Widgets */}
          <div className="space-y-3 lg:space-y-4">
            <LowStockWidget warehouse={selectedWarehouse} limit={5} />
            <ForecastWidget warehouse={selectedWarehouse} limit={3} />
            <AlertsWidget limit={5} />
          </div>
        </div>
      </main>
    </>
  );
}
