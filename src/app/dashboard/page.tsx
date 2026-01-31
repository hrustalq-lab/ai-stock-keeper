"use client";

/**
 * Dashboard Page (Phase 3)
 * Real-time инвентаризация с графиками и алертами
 */

import { useState } from "react";
import {
  InventoryOverview,
  LowStockWidget,
  RecentActivityFeed,
  StockLevelChart,
  AlertsWidget,
  WarehouseSelector,
  ConnectionStatus,
} from "~/app/_components/dashboard";

export default function DashboardPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>();

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h1 className="text-xl font-bold text-white">AI Stock Keeper</h1>
          </div>

          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <WarehouseSelector
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
            />
            <nav className="flex items-center gap-2">
              <a
                href="/intake"
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                Приёмка
              </a>
              <a
                href="/settings/alerts"
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                ⚙️ Настройки
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Overview Cards */}
        <section className="mb-6">
          <InventoryOverview warehouse={selectedWarehouse} />
        </section>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Chart + Activity */}
          <div className="space-y-6 lg:col-span-2">
            <StockLevelChart warehouse={selectedWarehouse} days={7} />
            <RecentActivityFeed warehouse={selectedWarehouse} limit={10} />
          </div>

          {/* Right Column - Widgets */}
          <div className="space-y-6">
            <LowStockWidget warehouse={selectedWarehouse} limit={5} />
            <AlertsWidget limit={5} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
        <p>AI Stock Keeper • Phase 3 Dashboard</p>
      </footer>
    </div>
  );
}
