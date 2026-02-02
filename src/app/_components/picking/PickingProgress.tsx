"use client";

/**
 * Прогресс сборки
 * Updated: Compact, restrained colors
 */

interface PickingProgressProps {
  total: number;
  completed: number;
  remaining: number;
  percentage: number;
  estimatedMins?: number | null;
  actualMins?: number;
}

export function PickingProgress({
  total,
  completed,
  remaining,
  percentage,
  estimatedMins,
  actualMins,
}: PickingProgressProps) {
  // Цвет прогресс-бара в зависимости от процента
  const getProgressColor = () => {
    if (percentage >= 100) return "bg-emerald-500";
    if (percentage >= 75) return "bg-primary";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-violet-500";
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card p-3">
      {/* Прогресс бар */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Прогресс</span>
          <span className="font-semibold text-foreground">{percentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted/50">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-semibold text-foreground">{completed}</div>
          <div className="text-[10px] text-muted-foreground">Собрано</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-amber-600">{remaining}</div>
          <div className="text-[10px] text-muted-foreground">Осталось</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-muted-foreground">{total}</div>
          <div className="text-[10px] text-muted-foreground">Всего</div>
        </div>
      </div>

      {/* Время */}
      {(estimatedMins != null || actualMins != null) && (
        <div className="mt-2 flex items-center justify-center gap-3 border-t border-border/50 pt-2 text-[10px]">
          {estimatedMins && (
            <div className="text-muted-foreground">
              ⏱ Оценка: <span className="font-medium text-foreground">{estimatedMins}м</span>
            </div>
          )}
          {actualMins && (
            <div className="text-muted-foreground">
              ⏳ Прошло: <span className="font-medium text-foreground">{actualMins}м</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
