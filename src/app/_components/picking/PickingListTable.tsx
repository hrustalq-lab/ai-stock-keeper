"use client";

/**
 * Таблица листов сборки
 * Updated: Compact layout, restrained colors
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
  created: { label: "Создан", color: "bg-chart-1/10 text-chart-1", icon: "🔵" }, // cyan
  assigned: { label: "Назначен", color: "bg-chart-3/10 text-chart-3", icon: "🟡" }, // amber
  in_progress: { label: "Сборка", color: "bg-chart-4/10 text-chart-4", icon: "🟣" }, // violet
  completed: { label: "Готов", color: "bg-chart-2/10 text-chart-2", icon: "🟢" }, // emerald
  cancelled: { label: "Отмена", color: "bg-muted text-muted-foreground", icon: "⚪" },
};

const priorityLabels: Record<number, { label: string; color: string }> = {
  0: { label: "Низк.", color: "text-muted-foreground" },
  1: { label: "Норм", color: "text-foreground" },
  2: { label: "Выс.", color: "text-chart-3" }, // amber
  3: { label: "Срочно", color: "text-destructive" },
};

const typeLabels: Record<string, string> = {
  single: "Один",
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
      <div className="rounded-lg border border-border/50 bg-card p-3">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-6 text-center">
        <div className="text-2xl">📋</div>
        <p className="mt-1.5 text-xs text-muted-foreground">Нет листов</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-2.5 py-2">№</th>
            <th className="px-2.5 py-2">Тип</th>
            <th className="px-2.5 py-2">Статус</th>
            <th className="px-2.5 py-2">Приор.</th>
            <th className="hidden px-2.5 py-2 sm:table-cell">Работ.</th>
            <th className="hidden px-2.5 py-2 sm:table-cell">Время</th>
            <th className="px-2.5 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {lists.map((list) => {
            const status = statusLabels[list.status] ?? statusLabels.created;
            const priority = priorityLabels[list.priority] ?? priorityLabels[1];
            const type = typeLabels[list.pickingType] ?? list.pickingType;

            return (
              <tr
                key={list.id}
                className="transition-colors hover:bg-accent/30"
              >
                <td className="px-2.5 py-2">
                  <span className="font-mono text-xs font-medium text-foreground">
                    {list.listNumber}
                  </span>
                </td>
                <td className="px-2.5 py-2">
                  <span className="text-xs text-muted-foreground">{type}</span>
                </td>
                <td className="px-2.5 py-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${status?.color}`}
                  >
                    <span className="text-[8px]">{status?.icon}</span>
                    {status?.label}
                  </span>
                </td>
                <td className="px-2.5 py-2">
                  <span className={`text-xs font-medium ${priority?.color}`}>
                    {priority?.label}
                  </span>
                </td>
                <td className="hidden px-2.5 py-2 sm:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {list.assignedTo ?? "—"}
                  </span>
                </td>
                <td className="hidden px-2.5 py-2 sm:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {list.estimatedMins ? `~${list.estimatedMins}м` : "—"}
                  </span>
                </td>
                <td className="px-2.5 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onView(list.id)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="Просмотр"
                    >
                      👁
                    </button>
                    {list.status === "created" && onAssign && (
                      <button
                        onClick={() => onAssign(list.id)}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Назначить"
                      >
                        👤
                      </button>
                    )}
                    {(list.status === "created" || list.status === "assigned") &&
                      onCancel && (
                        <button
                          onClick={() => onCancel(list.id)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
