"use client";

/**
 * Карточка позиции сборки (Mobile-friendly)
 * Updated: Compact, restrained colors
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
  pending: { bg: "bg-secondary/30", border: "border-border/50", icon: "⏳" },
  picked: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", icon: "✅" },
  skipped: { bg: "bg-amber-500/5", border: "border-amber-500/20", icon: "⏭" },
  shortage: { bg: "bg-destructive/5", border: "border-destructive/20", icon: "⚠️" },
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
      className={`rounded-lg border transition-all ${style?.bg} ${style?.border} ${
        isActive && !isCompleted
          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
          : ""
      } ${isCompleted ? "opacity-60" : ""}`}
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
            {item.sequenceNum}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{item.sku}</span>
        </div>
        <span className="text-base">{style?.icon}</span>
      </div>

      {/* Контент */}
      <div className="p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          {item.productName}
        </h3>

        {/* Локация и количество */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <div className="text-[10px] text-muted-foreground">📍 Локация</div>
            <div className="font-mono text-base font-bold text-foreground">
              {item.locationCode}
            </div>
            <div className="text-[10px] text-muted-foreground">Зона {item.zone}</div>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <div className="text-[10px] text-muted-foreground">📦 Кол-во</div>
            <div className="font-mono text-base font-bold text-foreground">
              {item.requiredQty} шт
            </div>
            {item.pickedQty > 0 && (
              <div className="text-[10px] text-emerald-600">
                Собрано: {item.pickedQty}
              </div>
            )}
          </div>
        </div>

        {/* Действия (только для активной незавершённой позиции) */}
        {isActive && !isCompleted && (
          <div className="space-y-2">
            {/* Ввод количества */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPickedQty(Math.max(0, pickedQty - 1))}
                className="flex size-8 items-center justify-center rounded-md bg-secondary text-base font-bold text-foreground transition-colors hover:bg-secondary/80"
              >
                −
              </button>
              <input
                type="number"
                value={pickedQty}
                onChange={(e) =>
                  setPickedQty(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="h-8 w-14 rounded-md border border-border bg-input text-center font-mono text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => setPickedQty(pickedQty + 1)}
                className="flex size-8 items-center justify-center rounded-md bg-secondary text-base font-bold text-foreground transition-colors hover:bg-secondary/80"
              >
                +
              </button>
              <button
                onClick={() => setPickedQty(item.requiredQty)}
                className="ml-auto rounded-md bg-secondary px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-secondary/80"
              >
                Все ({item.requiredQty})
              </button>
            </div>

            {/* Кнопки */}
            <div className="flex gap-1.5">
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-md bg-emerald-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                ✓ Подтвердить
              </button>
              <button
                onClick={() => setShowIssueMenu(!showIssueMenu)}
                className="rounded-md bg-secondary px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary/80"
              >
                ⚠️
              </button>
            </div>

            {/* Меню проблем */}
            {showIssueMenu && (
              <div className="space-y-1.5 rounded-md bg-muted/50 p-2">
                <div className="text-[10px] font-medium text-muted-foreground">
                  Сообщить о проблеме:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleIssue("not_found")}
                    className="rounded-md bg-destructive/10 px-2 py-1.5 text-[10px] text-destructive transition-colors hover:bg-destructive/20"
                  >
                    🔍 Не найден
                  </button>
                  <button
                    onClick={() => handleIssue("wrong_location")}
                    className="rounded-md bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-600 transition-colors hover:bg-amber-500/20"
                  >
                    📍 Не на месте
                  </button>
                  <button
                    onClick={() => handleIssue("damaged")}
                    className="rounded-md bg-orange-500/10 px-2 py-1.5 text-[10px] text-orange-600 transition-colors hover:bg-orange-500/20"
                  >
                    💔 Повреждён
                  </button>
                  <button
                    onClick={() => handleIssue("shortage")}
                    className="rounded-md bg-violet-500/10 px-2 py-1.5 text-[10px] text-violet-600 transition-colors hover:bg-violet-500/20"
                  >
                    📉 Недостача
                  </button>
                </div>
                <input
                  type="text"
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  placeholder="Комментарий"
                  className="mt-1 w-full rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Информация о завершении */}
        {isCompleted && (
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <span className="text-xs text-muted-foreground">
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
