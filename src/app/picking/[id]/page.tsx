"use client";

/**
 * Страница сборки заказа (Mobile-optimized)
 * /picking/[id]
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { PickingItemCard, PickingProgress } from "~/app/_components/picking";

export default function PickingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = Number(params.id);

  const [workerId] = useState("worker-1"); // TODO: Получить из сессии
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsedMins, setElapsedMins] = useState(0);

  // Таймер для отображения времени
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMins(Math.floor((Date.now() - startTime) / 1000 / 60));
    }, 10000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Получаем данные листа
  const {
    data: list,
    isLoading,
    refetch,
  } = api.picking.getById.useQuery({ id: listId });

  // Получаем прогресс
  const { data: progress, refetch: refetchProgress } =
    api.picking.getProgress.useQuery({ listId });

  // Мутации
  const startMutation = api.picking.start.useMutation({
    onSuccess: () => void refetch(),
  });

  const confirmMutation = api.picking.confirmItem.useMutation({
    onSuccess: () => {
      void refetch();
      void refetchProgress();
      // Переходим к следующей позиции
      const items = list?.items ?? [];
      const nextPending = items.findIndex(
        (item, idx) => idx > activeItemIndex && item.status === "pending"
      );
      if (nextPending !== -1) {
        setActiveItemIndex(nextPending);
      }
    },
  });

  const reportIssueMutation = api.picking.reportIssue.useMutation({
    onSuccess: () => {
      void refetch();
      void refetchProgress();
    },
  });

  const completeMutation = api.picking.complete.useMutation({
    onSuccess: () => {
      alert("Сборка завершена!");
      router.push("/picking");
    },
  });

  // Обработчики
  const handleStart = () => {
    startMutation.mutate({ listId, workerId });
  };

  const handleConfirm = (itemId: number, qty: number, barcode?: string) => {
    confirmMutation.mutate({
      itemId,
      pickedQty: qty,
      barcodeScan: barcode,
      confirmedBy: workerId,
    });
  };

  const handleReportIssue = (
    itemId: number,
    issue: "not_found" | "wrong_location" | "damaged" | "shortage",
    note?: string
  ) => {
    reportIssueMutation.mutate({
      itemId,
      issueType: issue,
      note,
      reportedBy: workerId,
    });
  };

  const handleComplete = () => {
    if (confirm("Завершить сборку?")) {
      completeMutation.mutate({ listId, workerId });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="text-center">
          <div className="mb-4 text-4xl">📦</div>
          <div className="text-zinc-400">Загрузка...</div>
        </div>
      </div>
    );
  }

  // Not found
  if (!list) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="text-center">
          <div className="mb-4 text-4xl">❌</div>
          <div className="text-zinc-400">Лист сборки не найден</div>
          <button
            onClick={() => router.push("/picking")}
            className="mt-4 rounded-lg bg-zinc-700 px-4 py-2 text-white"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  const items = list.items ?? [];
  const allCompleted = items.every((i) => i.status !== "pending");
  const canStart = list.status === "created" || list.status === "assigned";
  const inProgress = list.status === "in_progress";

  return (
    <div className="min-h-screen bg-zinc-900 pb-24">
      {/* Шапка */}
      <header className="sticky top-0 z-10 border-b border-zinc-700/50 bg-zinc-800/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/picking")}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            ←
          </button>
          <div className="text-center">
            <div className="font-mono text-sm text-zinc-400">
              {list.listNumber}
            </div>
            <div className="text-xs text-zinc-500">
              {list.pickingType === "batch" && "Batch"}
              {list.pickingType === "wave" && "Wave"}
              {list.pickingType === "single" && "Одиночный"}
              {" • "}
              {list.warehouse}
            </div>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Прогресс */}
        {progress && (
          <div className="mb-4">
            <PickingProgress
              total={progress.total}
              completed={progress.completed}
              remaining={progress.remaining}
              percentage={progress.percentage}
              estimatedMins={list.estimatedMins}
              actualMins={inProgress ? elapsedMins : list.actualMins ?? undefined}
            />
          </div>
        )}

        {/* Кнопка старта */}
        {canStart && (
          <div className="mb-4">
            <button
              onClick={handleStart}
              disabled={startMutation.isPending}
              className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {startMutation.isPending ? "Запуск..." : "▶ Начать сборку"}
            </button>
          </div>
        )}

        {/* Список позиций */}
        {inProgress && (
          <div className="space-y-4">
            {/* Активная позиция */}
            {items[activeItemIndex]?.status === "pending" && (
              <div className="mb-6">
                <div className="mb-2 text-sm font-medium text-zinc-400">
                  📍 Следующая позиция
                </div>
                <PickingItemCard
                  item={items[activeItemIndex]}
                  isActive={true}
                  onConfirm={handleConfirm}
                  onReportIssue={handleReportIssue}
                />
              </div>
            )}

            {/* Остальные позиции (свёрнуто) */}
            <details className="rounded-xl border border-zinc-700/50 bg-zinc-800/30">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300">
                📋 Все позиции ({items.length})
              </summary>
              <div className="space-y-3 p-4 pt-0">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.status === "pending") {
                        setActiveItemIndex(index);
                      }
                    }}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      item.status === "picked"
                        ? "border-green-500/30 bg-green-500/10"
                        : item.status === "shortage"
                          ? "border-red-500/30 bg-red-500/10"
                          : item.status === "skipped"
                            ? "border-amber-500/30 bg-amber-500/10"
                            : index === activeItemIndex
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-zinc-700/50 bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700/50 text-xs font-bold text-white">
                          {item.sequenceNum}
                        </span>
                        <span className="font-medium text-white">
                          {item.productName}
                        </span>
                      </div>
                      <span className="font-mono text-sm text-zinc-400">
                        {item.locationCode}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-zinc-400">
                      <span>{item.sku}</span>
                      <span>
                        {item.status === "picked"
                          ? `✅ ${item.pickedQty}/${item.requiredQty}`
                          : item.status === "shortage"
                            ? `⚠️ ${item.pickedQty}/${item.requiredQty}`
                            : item.status === "skipped"
                              ? `⏭ Пропущено`
                              : `${item.requiredQty} шт`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* Completed state */}
        {list.status === "completed" && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center">
            <div className="mb-2 text-4xl">✅</div>
            <div className="text-lg font-bold text-green-400">
              Сборка завершена
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              Время: {list.actualMins} мин
            </div>
          </div>
        )}
      </main>

      {/* Нижняя панель */}
      {inProgress && allCompleted && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-700/50 bg-zinc-800/95 p-4 backdrop-blur-sm">
          <button
            onClick={handleComplete}
            disabled={completeMutation.isPending}
            className="w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
          >
            {completeMutation.isPending ? "Завершение..." : "🏁 Завершить сборку"}
          </button>
        </div>
      )}
    </div>
  );
}
