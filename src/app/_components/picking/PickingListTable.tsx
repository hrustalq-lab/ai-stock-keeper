"use client";

/**
 * Таблица листов сборки
 */

import type { PickingList } from "@prisma/client";

interface PickingListTableProps {
  lists: PickingList[];
  onView: (listId: number) => void;
  onAssign?: (listId: number) => void;
  onCancel?: (listId: number) => void;
  isLoading?: boolean;
}

const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
  created: { label: "Создан", color: "bg-blue-500/20 text-blue-400", icon: "🔵" },
  assigned: { label: "Назначен", color: "bg-amber-500/20 text-amber-400", icon: "🟡" },
  in_progress: { label: "Сборка", color: "bg-purple-500/20 text-purple-400", icon: "🟣" },
  completed: { label: "Завершён", color: "bg-green-500/20 text-green-400", icon: "🟢" },
  cancelled: { label: "Отменён", color: "bg-zinc-500/20 text-zinc-400", icon: "⚪" },
};

const priorityLabels: Record<number, { label: string; color: string }> = {
  0: { label: "Низкий", color: "text-zinc-400" },
  1: { label: "Норм", color: "text-white" },
  2: { label: "Высокий", color: "text-amber-400" },
  3: { label: "Срочно", color: "text-red-400" },
};

const typeLabels: Record<string, string> = {
  single: "Одиночный",
  batch: "Batch",
  wave: "Wave",
};

export function PickingListTable({
  lists,
  onView,
  onAssign,
  onCancel,
  isLoading,
}: PickingListTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-700/50" />
          ))}
        </div>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-8 text-center">
        <div className="text-4xl">📋</div>
        <p className="mt-2 text-zinc-400">Нет листов сборки</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/30">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-700/50 text-left text-xs uppercase tracking-wider text-zinc-400">
            <th className="px-4 py-3">№ Листа</th>
            <th className="px-4 py-3">Тип</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Приоритет</th>
            <th className="px-4 py-3">Работник</th>
            <th className="px-4 py-3">Время</th>
            <th className="px-4 py-3">Действия</th>
          </tr>
        </thead>
        <tbody>
          {lists.map((list) => {
            const status = statusLabels[list.status] ?? statusLabels.created;
            const priority = priorityLabels[list.priority] ?? priorityLabels[1];
            const type = typeLabels[list.pickingType] ?? list.pickingType;

            return (
              <tr
                key={list.id}
                className="border-b border-zinc-700/30 transition-colors hover:bg-zinc-700/20"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-white">
                    {list.listNumber}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-300">{type}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status?.color}`}
                  >
                    <span>{status?.icon}</span>
                    {status?.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${priority?.color}`}>
                    {priority?.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-300">
                    {list.assignedTo ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-400">
                    {list.estimatedMins ? `~${list.estimatedMins} мин` : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(list.id)}
                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                      title="Просмотр"
                    >
                      👁
                    </button>
                    {list.status === "created" && onAssign && (
                      <button
                        onClick={() => onAssign(list.id)}
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                        title="Назначить"
                      >
                        👤
                      </button>
                    )}
                    {(list.status === "created" || list.status === "assigned") &&
                      onCancel && (
                        <button
                          onClick={() => onCancel(list.id)}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                          title="Отменить"
                        >
                          🗑
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
