"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

/**
 * Доступные склады (TODO: получать из API)
 */
const WAREHOUSES = [
  { id: "", name: "Все склады" },
  { id: "warehouse_main", name: "Основной склад" },
  { id: "warehouse_reserve", name: "Резервный склад" },
  { id: "warehouse_retail", name: "Розничный склад" },
];

/**
 * Периоды для фильтра
 */
const PERIODS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 90, label: "90 дней" },
  { days: 365, label: "Год" },
];

/**
 * Страница истории приёмок
 */
export default function IntakeHistoryPage() {
  const router = useRouter();

  // Фильтры
  const [warehouse, setWarehouse] = useState("");
  const [periodDays, setPeriodDays] = useState(30);

  // Пагинация
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // Вычисляем даты фильтра (мемоизация для стабильного query key)
  const fromDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - periodDays);
    return date;
  }, [periodDays]);

  // API запросы
  const historyQuery = api.intake.getHistory.useQuery({
    warehouse: warehouse || undefined,
    fromDate,
    limit,
    offset,
  });

  const statsQuery = api.intake.getStats.useQuery({
    warehouse: warehouse || undefined,
    days: periodDays,
  });

  // Навигация
  const handleNewIntake = useCallback(() => {
    router.push("/intake");
  }, [router]);

  const handleNextPage = useCallback(() => {
    setOffset((prev) => prev + limit);
  }, []);

  const handlePrevPage = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - limit));
  }, []);

  const handleWarehouseChange = useCallback((value: string) => {
    setWarehouse(value);
    setOffset(0);
  }, []);

  const handlePeriodChange = useCallback((days: number) => {
    setPeriodDays(days);
    setOffset(0);
  }, []);

  // Форматирование даты
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Получение цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewIntake}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-500">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">История приёмок</h1>
              <p className="text-xs text-slate-500">AI Stock Keeper</p>
            </div>
          </div>

          <button
            onClick={handleNewIntake}
            className="flex items-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Новая приёмка
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Статистика */}
        {statsQuery.data?.success && statsQuery.data.data && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-500">Приёмок за период</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {statsQuery.data.data.receiptsCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-500">Принято товаров</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                +{statsQuery.data.data.totalItemsReceived}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-500">Уникальных SKU</p>
              <p className="mt-1 text-2xl font-bold text-cyan-400">
                {statsQuery.data.data.uniqueSkusReceived}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-500">Последняя приёмка</p>
              <p className="mt-1 text-lg font-medium text-slate-300">
                {statsQuery.data.data.lastReceiptDate
                  ? formatDate(new Date(statsQuery.data.data.lastReceiptDate))
                  : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Фильтры */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          {/* Склад */}
          <div>
            <label className="mb-1 block text-xs text-slate-500">Склад</label>
            <select
              value={warehouse}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              {WAREHOUSES.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          {/* Период */}
          <div>
            <label className="mb-1 block text-xs text-slate-500">Период</label>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => handlePeriodChange(p.days)}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    periodDays === p.days
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Таблица */}
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50">
          {/* Заголовок */}
          <div className="grid grid-cols-12 gap-4 border-b border-slate-700 bg-slate-800/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
            <div className="col-span-2">Документ</div>
            <div className="col-span-3">Дата</div>
            <div className="col-span-2">Склад</div>
            <div className="col-span-2 text-right">Позиций</div>
            <div className="col-span-2 text-right">Количество</div>
            <div className="col-span-1 text-center">Статус</div>
          </div>

          {/* Загрузка */}
          {historyQuery.isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            </div>
          )}

          {/* Ошибка */}
          {historyQuery.error && (
            <div className="px-4 py-8 text-center text-red-400">
              Ошибка загрузки: {historyQuery.error.message}
            </div>
          )}

          {/* Пустой список */}
          {historyQuery.data?.success &&
            historyQuery.data.data.receipts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <svg
                  className="mb-3 h-12 w-12 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-slate-500">Нет приёмок за выбранный период</p>
                <button
                  onClick={handleNewIntake}
                  className="mt-4 rounded-lg bg-cyan-500/20 px-4 py-2 text-cyan-400 transition hover:bg-cyan-500/30"
                >
                  Создать первую приёмку
                </button>
              </div>
            )}

          {/* Список */}
          {historyQuery.data?.success &&
            historyQuery.data.data.receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="grid grid-cols-12 gap-4 border-b border-slate-800 px-4 py-4 transition hover:bg-slate-800/30"
              >
                <div className="col-span-2">
                  <code className="rounded bg-slate-800 px-2 py-1 font-mono text-sm text-cyan-400">
                    {receipt.docNumber ?? `#${receipt.id}`}
                  </code>
                </div>
                <div className="col-span-3 text-sm text-slate-300">
                  {receipt.docDate ? formatDate(receipt.docDate) : "—"}
                </div>
                <div className="col-span-2 text-sm text-slate-400">
                  {receipt.warehouse === "warehouse_main"
                    ? "Основной"
                    : receipt.warehouse === "warehouse_reserve"
                      ? "Резервный"
                      : receipt.warehouse === "warehouse_retail"
                        ? "Розничный"
                        : receipt.warehouse}
                </div>
                <div className="col-span-2 text-right font-mono text-sm text-slate-300">
                  {receipt.itemsCount}
                </div>
                <div className="col-span-2 text-right font-mono text-sm font-medium text-emerald-400">
                  +{receipt.totalQuantity}
                </div>
                <div className="col-span-1 text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs ${getStatusColor(receipt.status ?? "pending")}`}
                  >
                    {receipt.status === "completed"
                      ? "✓"
                      : receipt.status === "pending"
                        ? "⏳"
                        : "✗"}
                  </span>
                </div>
              </div>
            ))}
        </div>

        {/* Пагинация */}
        {historyQuery.data?.success && historyQuery.data.data.totalCount > limit && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Показано {offset + 1} -{" "}
              {Math.min(offset + limit, historyQuery.data.data.totalCount)} из{" "}
              {historyQuery.data.data.totalCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={offset === 0}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Назад
              </button>
              <button
                onClick={handleNextPage}
                disabled={!historyQuery.data.data.hasMore}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Вперёд →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
