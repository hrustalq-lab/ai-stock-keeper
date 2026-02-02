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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-3 text-3xl">📦</div>
          <div className="text-sm text-muted-foreground">Загрузка...</div>
        </div>
      </div>
    );
  }

  // Not found
  if (!list) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-3 text-3xl">❌</div>
          <div className="text-sm text-muted-foreground">Лист не найден</div>
          <button
            onClick={() => router.push("/picking")}
            className="mt-3 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground"
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
    <div className="min-h-screen bg-background pb-20">
      {/* Шапка - compact */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/95 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/picking")}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            ←
          </button>
          <div className="text-center">
            <div className="font-mono text-xs text-foreground">
              {list.listNumber}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {list.pickingType === "batch" && "Batch"}
              {list.pickingType === "wave" && "Wave"}
              {list.pickingType === "single" && "Одиночный"}
              {" • "}
              {list.warehouse}
            </div>
          </div>
          <div className="w-8" />
        </div>
      </header>

      <main className="px-3 py-3">
        {/* Прогресс */}
        {progress && (
          <div className="mb-3">
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
          <div className="mb-3">
            <button
              onClick={handleStart}
              disabled={startMutation.isPending}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {startMutation.isPending ? "Запуск..." : "▶ Начать сборку"}
            </button>
          </div>
        )}

        {/* Список позиций */}
        {inProgress && (
          <div className="space-y-3">
            {/* Активная позиция */}
            {items[activeItemIndex]?.status === "pending" && (
              <div className="mb-4">
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                  📍 Следующая
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
            <details className="rounded-lg border border-border/50 bg-card">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground">
                📋 Все позиции ({items.length})
              </summary>
              <div className="space-y-2 p-3 pt-0">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.status === "pending") {
                        setActiveItemIndex(index);
                      }
                    }}
                    className={`cursor-pointer rounded-md border p-2 transition-colors ${
                      item.status === "picked"
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : item.status === "shortage"
                          ? "border-destructive/30 bg-destructive/5"
                          : item.status === "skipped"
                            ? "border-amber-500/30 bg-amber-500/5"
                            : index === activeItemIndex
                              ? "border-primary bg-primary/5"
                              : "border-border/50 bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                          {item.sequenceNum}
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {item.productName}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {item.locationCode}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
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
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
            <div className="mb-1.5 text-2xl">✅</div>
            <div className="text-sm font-semibold text-emerald-600">
              Сборка завершена
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Время: {list.actualMins} мин
            </div>
          </div>
        )}
      </main>

      {/* Нижняя панель */}
      {inProgress && allCompleted && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 p-3 backdrop-blur-sm pb-safe">
          <button
            onClick={handleComplete}
            disabled={completeMutation.isPending}
            className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {completeMutation.isPending ? "Завершение..." : "🏁 Завершить"}
          </button>
        </div>
      )}
    </div>
  );
}
