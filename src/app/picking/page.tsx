"use client";

/**
 * Страница управления сборкой - Phase 5
 * /picking
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  PickingListTable,
  PickingStatsWidget,
  CreatePickingListForm,
} from "~/app/_components/picking";

type TabType = "active" | "completed" | "all";
type StatusFilter = "created" | "assigned" | "in_progress" | "completed" | "cancelled" | undefined;

export default function PickingPage() {
  // Состояние
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Получаем список складов
  const { data: warehouses } = api.inventory.getWarehouses.useQuery();

  // Определяем фильтр статуса на основе вкладки
  const getStatusFilter = (): StatusFilter => {
    switch (activeTab) {
      case "active":
        return undefined; // Фильтруем на клиенте
      case "completed":
        return "completed";
      case "all":
        return undefined;
    }
  };

  // Получаем листы сборки
  const { data: lists, isLoading: loadingLists, refetch: refetchLists } =
    api.picking.getByStatus.useQuery({
      warehouse: selectedWarehouse === "all" ? "" : selectedWarehouse,
      status: getStatusFilter(),
    });

  // Мутации
  const createMutation = api.picking.create.useMutation({
    onSuccess: () => {
      setShowCreateForm(false);
      void refetchLists();
    },
  });

  const cancelMutation = api.picking.cancel.useMutation({
    onSuccess: () => {
      void refetchLists();
    },
  });

  // Фильтрация для активной вкладки
  const filteredLists = lists?.filter((list) => {
    if (activeTab === "active") {
      return ["created", "assigned", "in_progress"].includes(list.status);
    }
    return true;
  });

  // Обработчики
  const handleView = (listId: number) => {
    window.location.href = `/picking/${listId}`;
  };

  const handleAssign = (listId: number) => {
    // TODO: Модалка выбора работника
    const workerId = prompt("Введите ID работника:");
    if (workerId) {
      // Используем мутацию assign
      alert(`Назначен: ${workerId} на лист ${listId}`);
    }
  };

  const handleCancel = (listId: number) => {
    if (confirm("Отменить лист сборки?")) {
      cancelMutation.mutate({ listId });
    }
  };

  const handleCreate = (data: {
    warehouse: string;
    orders: Array<{
      orderNumber: string;
      customerName?: string;
      items: Array<{ sku: string; quantity: number; productName?: string }>;
    }>;
    pickingType: "single" | "batch" | "wave";
    priority: number;
  }) => {
    createMutation.mutate(data);
  };

  const tabs: Array<{ key: TabType; label: string; icon: string }> = [
    { key: "active", label: "Активные", icon: "🟡" },
    { key: "completed", label: "Завершённые", icon: "✅" },
    { key: "all", label: "Все", icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Шапка */}
      <header className="border-b border-zinc-700/50 bg-zinc-800/50 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                📋 Управление сборкой
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Создание и отслеживание листов сборки заказов
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Выбор склада */}
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Все склады</option>
                {warehouses?.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>

              {/* Кнопка создания */}
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-500"
              >
                <span>+</span>
                Новый лист
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Виджет статистики */}
        <div className="mb-6">
          <PickingStatsWidget
            warehouse={selectedWarehouse === "all" ? undefined : selectedWarehouse}
          />
        </div>

        {/* Вкладки */}
        <div className="mb-4 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Таблица листов */}
        <PickingListTable
          lists={filteredLists ?? []}
          onView={handleView}
          onAssign={handleAssign}
          onCancel={handleCancel}
          isLoading={loadingLists}
        />
      </main>

      {/* Модалка создания */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-700/50 bg-zinc-800 p-6">
            <h2 className="mb-6 text-xl font-bold text-white">
              Создать лист сборки
            </h2>
            <CreatePickingListForm
              warehouses={warehouses ?? []}
              onSubmit={handleCreate}
              onCancel={() => setShowCreateForm(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
