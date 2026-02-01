"use client";

/**
 * Прогресс сборки
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
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-purple-500";
  };

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
      {/* Прогресс бар */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-zinc-400">Прогресс сборки</span>
          <span className="font-bold text-white">{percentage}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-zinc-700/50">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-bold text-white">{completed}</div>
          <div className="text-xs text-zinc-400">Собрано</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-amber-400">{remaining}</div>
          <div className="text-xs text-zinc-400">Осталось</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-zinc-300">{total}</div>
          <div className="text-xs text-zinc-400">Всего</div>
        </div>
      </div>

      {/* Время */}
      {(estimatedMins != null || actualMins != null) && (
        <div className="mt-4 flex items-center justify-center gap-4 border-t border-zinc-700/50 pt-4 text-sm">
          {estimatedMins && (
            <div className="text-zinc-400">
              ⏱ Оценка: <span className="text-white">{estimatedMins} мин</span>
            </div>
          )}
          {actualMins && (
            <div className="text-zinc-400">
              ⏳ Прошло: <span className="text-white">{actualMins} мин</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
