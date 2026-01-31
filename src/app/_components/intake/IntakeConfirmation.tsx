"use client";

/**
 * Данные для подтверждения
 */
export interface ConfirmationData {
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  documentId?: string;
}

/**
 * Пропсы компонента IntakeConfirmation
 */
interface IntakeConfirmationProps {
  data: ConfirmationData;
  status: "success" | "error" | "pending";
  errorMessage?: string;
  onNewIntake: () => void;
  onViewHistory: () => void;
  className?: string;
}

/**
 * Компонент подтверждения успешной приёмки
 */
export function IntakeConfirmation({
  data,
  status,
  errorMessage,
  onNewIntake,
  onViewHistory,
  className = "",
}: IntakeConfirmationProps) {
  // Успешная приёмка
  if (status === "success") {
    return (
      <div className={`text-center ${className}`}>
        {/* Иконка успеха */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Заголовок */}
        <h2 className="mb-2 text-2xl font-bold text-white">
          Приёмка создана!
        </h2>
        <p className="mb-6 text-slate-400">
          Товар успешно добавлен в систему
        </p>

        {/* Детали */}
        <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-900/50 p-6 text-left">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Артикул</span>
              <code className="rounded bg-slate-800 px-2 py-1 font-mono text-cyan-400">
                {data.sku}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Название</span>
              <span className="text-white">{data.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Количество</span>
              <span className="font-semibold text-emerald-400">
                +{data.quantity} шт
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Склад</span>
              <span className="text-white">{data.warehouse}</span>
            </div>
            {data.documentId && (
              <div className="flex items-center justify-between border-t border-slate-700 pt-3">
                <span className="text-slate-500">Документ 1C</span>
                <code className="rounded bg-slate-800 px-2 py-1 font-mono text-xs text-slate-400">
                  {data.documentId}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            onClick={onViewHistory}
            className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-6 py-3 font-medium text-slate-300 transition hover:bg-slate-700"
          >
            История приёмок
          </button>
          <button
            onClick={onNewIntake}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/40"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
      </div>
    );
  }

  // Ошибка
  if (status === "error") {
    return (
      <div className={`text-center ${className}`}>
        {/* Иконка ошибки */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/30">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        {/* Заголовок */}
        <h2 className="mb-2 text-2xl font-bold text-white">
          Ошибка приёмки
        </h2>
        <p className="mb-6 text-red-400">
          {errorMessage ?? "Не удалось создать приёмку"}
        </p>

        {/* Детали */}
        <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-left">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Артикул</span>
              <code className="rounded bg-slate-800 px-2 py-1 font-mono text-cyan-400">
                {data.sku}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Количество</span>
              <span className="text-white">{data.quantity} шт</span>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            onClick={onViewHistory}
            className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-6 py-3 font-medium text-slate-300 transition hover:bg-slate-700"
          >
            Отмена
          </button>
          <button
            onClick={onNewIntake}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-red-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/25 transition hover:shadow-red-500/40"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  // Загрузка (pending)
  return (
    <div className={`text-center ${className}`}>
      {/* Спиннер */}
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
      </div>

      {/* Заголовок */}
      <h2 className="mb-2 text-2xl font-bold text-white">
        Создание приёмки...
      </h2>
      <p className="mb-6 text-slate-400">
        Отправка данных в 1C
      </p>

      {/* Детали */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 text-left">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Артикул</span>
            <code className="rounded bg-slate-800 px-2 py-1 font-mono text-cyan-400">
              {data.sku}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Количество</span>
            <span className="text-white">{data.quantity} шт</span>
          </div>
        </div>
      </div>
    </div>
  );
}
