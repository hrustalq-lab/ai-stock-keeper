"use client";

/**
 * Карточка позиции сборки (Mobile-friendly)
 */

import { useState } from "react";
import type { PickingItem } from "@prisma/client";

interface PickingItemCardProps {
  item: PickingItem;
  isActive: boolean;
  onConfirm: (itemId: number, qty: number, barcode?: string) => void;
  onReportIssue: (
    itemId: number,
    issue: "not_found" | "wrong_location" | "damaged" | "shortage",
    note?: string
  ) => void;
}

const statusStyles: Record<string, { bg: string; border: string; icon: string }> = {
  pending: { bg: "bg-zinc-800/50", border: "border-zinc-700/50", icon: "⏳" },
  picked: { bg: "bg-green-500/10", border: "border-green-500/30", icon: "✅" },
  skipped: { bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "⏭" },
  shortage: { bg: "bg-red-500/10", border: "border-red-500/30", icon: "⚠️" },
};

export function PickingItemCard({
  item,
  isActive,
  onConfirm,
  onReportIssue,
}: PickingItemCardProps) {
  const [pickedQty, setPickedQty] = useState(item.requiredQty);
  const [showIssueMenu, setShowIssueMenu] = useState(false);
  const [issueNote, setIssueNote] = useState("");

  const style = statusStyles[item.status] ?? statusStyles.pending;
  const isCompleted = item.status !== "pending";

  const handleConfirm = () => {
    onConfirm(item.id, pickedQty);
  };

  const handleIssue = (
    type: "not_found" | "wrong_location" | "damaged" | "shortage"
  ) => {
    onReportIssue(item.id, type, issueNote || undefined);
    setShowIssueMenu(false);
    setIssueNote("");
  };

  return (
    <div
      className={`rounded-xl border transition-all ${style?.bg} ${style?.border} ${
        isActive && !isCompleted
          ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-900"
          : ""
      } ${isCompleted ? "opacity-60" : ""}`}
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between border-b border-zinc-700/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700/50 text-sm font-bold text-white">
            {item.sequenceNum}
          </span>
          <span className="font-mono text-xs text-zinc-400">{item.sku}</span>
        </div>
        <span className="text-lg">{style?.icon}</span>
      </div>

      {/* Контент */}
      <div className="p-4">
        <h3 className="mb-3 text-lg font-semibold text-white">
          {item.productName}
        </h3>

        {/* Локация и количество */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-700/30 p-3">
            <div className="mb-1 text-xs text-zinc-400">📍 Локация</div>
            <div className="font-mono text-xl font-bold text-white">
              {item.locationCode}
            </div>
            <div className="text-xs text-zinc-500">Зона {item.zone}</div>
          </div>
          <div className="rounded-lg bg-zinc-700/30 p-3">
            <div className="mb-1 text-xs text-zinc-400">📦 Количество</div>
            <div className="font-mono text-xl font-bold text-white">
              {item.requiredQty} шт
            </div>
            {item.pickedQty > 0 && (
              <div className="text-xs text-green-400">
                Собрано: {item.pickedQty}
              </div>
            )}
          </div>
        </div>

        {/* Действия (только для активной незавершённой позиции) */}
        {isActive && !isCompleted && (
          <div className="space-y-3">
            {/* Ввод количества */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPickedQty(Math.max(0, pickedQty - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50 text-lg font-bold text-white transition-colors hover:bg-zinc-600"
              >
                −
              </button>
              <input
                type="number"
                value={pickedQty}
                onChange={(e) =>
                  setPickedQty(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="h-10 w-20 rounded-lg border border-zinc-600 bg-zinc-700/50 text-center font-mono text-lg text-white focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={() => setPickedQty(pickedQty + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50 text-lg font-bold text-white transition-colors hover:bg-zinc-600"
              >
                +
              </button>
              <button
                onClick={() => setPickedQty(item.requiredQty)}
                className="ml-auto rounded-lg bg-zinc-700/50 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-600"
              >
                Все ({item.requiredQty})
              </button>
            </div>

            {/* Кнопки */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-lg bg-green-600 py-3 font-semibold text-white transition-colors hover:bg-green-500"
              >
                ✓ Подтвердить
              </button>
              <button
                onClick={() => setShowIssueMenu(!showIssueMenu)}
                className="rounded-lg bg-zinc-700 px-4 py-3 text-zinc-300 transition-colors hover:bg-zinc-600"
              >
                ⚠️
              </button>
            </div>

            {/* Меню проблем */}
            {showIssueMenu && (
              <div className="space-y-2 rounded-lg bg-zinc-700/50 p-3">
                <div className="mb-2 text-xs font-medium text-zinc-400">
                  Сообщить о проблеме:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleIssue("not_found")}
                    className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/30"
                  >
                    🔍 Не найден
                  </button>
                  <button
                    onClick={() => handleIssue("wrong_location")}
                    className="rounded-lg bg-amber-500/20 px-3 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/30"
                  >
                    📍 Не на месте
                  </button>
                  <button
                    onClick={() => handleIssue("damaged")}
                    className="rounded-lg bg-orange-500/20 px-3 py-2 text-sm text-orange-300 transition-colors hover:bg-orange-500/30"
                  >
                    💔 Повреждён
                  </button>
                  <button
                    onClick={() => handleIssue("shortage")}
                    className="rounded-lg bg-purple-500/20 px-3 py-2 text-sm text-purple-300 transition-colors hover:bg-purple-500/30"
                  >
                    📉 Недостача
                  </button>
                </div>
                <input
                  type="text"
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  placeholder="Комментарий (опционально)"
                  className="mt-2 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Информация о завершении */}
        {isCompleted && (
          <div className="rounded-lg bg-zinc-700/20 p-3 text-center">
            <span className="text-sm text-zinc-400">
              {item.status === "picked" && (
                <>✅ Собрано: {item.pickedQty} шт</>
              )}
              {item.status === "shortage" && (
                <>⚠️ Недостача: {item.requiredQty - item.pickedQty} шт</>
              )}
              {item.status === "skipped" && (
                <>⏭ Пропущено: {item.issueType}</>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
