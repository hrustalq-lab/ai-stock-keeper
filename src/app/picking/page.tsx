"use client";

/**
 * Страница управления сборкой - Phase 5
 * /picking
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  PickingListTable,
  PickingStatsWidget,
  CreatePickingListForm,
} from "~/app/_components/picking";
import { 
  ClipboardList, 
  Plus, 
  Warehouse,
  ListChecks,
  CheckCircle,
  FileText
} from "lucide-react";

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

  const tabs: Array<{ key: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: "active", label: "Активные", icon: ListChecks },
    { key: "completed", label: "Завершённые", icon: CheckCircle },
    { key: "all", label: "Все", icon: FileText },
  ];

  return (
    <>
      <PageHeader
        title="Управление сборкой"
        description="Создание и отслеживание листов сборки заказов"
        breadcrumbs={[{ label: "Сборка" }]}
        actions={
          <div className="flex items-center gap-2">
            {/* Выбор склада */}
            <Select
              value={selectedWarehouse}
              onValueChange={setSelectedWarehouse}
            >
              <SelectTrigger className="w-auto min-w-[100px] sm:w-[160px]">
                <Warehouse className="mr-2 size-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Склад" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все склады</SelectItem>
                {warehouses?.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Кнопка создания */}
            <Button onClick={() => setShowCreateForm(true)} className="hidden sm:flex">
              <Plus className="mr-2 size-4" />
              Новый лист
            </Button>
            <Button onClick={() => setShowCreateForm(true)} size="icon" className="sm:hidden">
              <Plus className="size-4" />
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-3 md:p-4">
        {/* Виджет статистики */}
        <div className="mb-3">
          <PickingStatsWidget
            warehouse={selectedWarehouse === "all" ? undefined : selectedWarehouse}
          />
        </div>

        {/* Вкладки - compact */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              onClick={() => setActiveTab(tab.key)}
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
            >
              <tab.icon className="size-3" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.slice(0, 3)}.</span>
              {tab.key === "active" && filteredLists && activeTab !== "active" && (
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px]">
                  {lists?.filter((l) => ["created", "assigned", "in_progress"].includes(l.status)).length ?? 0}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Таблица листов */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <ClipboardList className="size-4 text-primary" />
              Листы сборки
            </CardTitle>
            <CardDescription className="text-xs">
              {activeTab === "active" && "Активные листы"}
              {activeTab === "completed" && "Завершённые"}
              {activeTab === "all" && "Все листы"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PickingListTable
              lists={filteredLists ?? []}
              onView={handleView}
              onAssign={handleAssign}
              onCancel={handleCancel}
              isLoading={loadingLists}
            />
          </CardContent>
        </Card>
      </main>

      {/* Модалка создания */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать лист сборки</DialogTitle>
            <DialogDescription>
              Добавьте заказы и укажите параметры сборки
            </DialogDescription>
          </DialogHeader>
          <CreatePickingListForm
            warehouses={warehouses ?? []}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
