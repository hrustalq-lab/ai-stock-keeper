"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Plus,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  History,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

/**
 * Доступные склады (TODO: получать из API)
 */
const WAREHOUSES = [
  { id: "all", name: "Все склады" },
  { id: "warehouse_main", name: "Основной склад" },
  { id: "warehouse_reserve", name: "Резервный склад" },
  { id: "warehouse_retail", name: "Розничный склад" },
];

/**
 * Периоды для фильтра
 */
const PERIODS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 90, label: "90 дней" },
  { days: 365, label: "Год" },
];

/**
 * Страница истории приёмок
 */
export default function IntakeHistoryPage() {
  // Фильтры
  const [warehouse, setWarehouse] = useState("all");
  const [periodDays, setPeriodDays] = useState(30);

  // Пагинация
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // Вычисляем даты фильтра (мемоизация для стабильного query key)
  const fromDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - periodDays);
    return date;
  }, [periodDays]);

  // API запросы
  const historyQuery = api.intake.getHistory.useQuery({
    warehouse: warehouse === "all" ? undefined : warehouse,
    fromDate,
    limit,
    offset,
  });

  const statsQuery = api.intake.getStats.useQuery({
    warehouse: warehouse === "all" ? undefined : warehouse,
    days: periodDays,
  });

  // Пагинация
  const handleNextPage = useCallback(() => {
    setOffset((prev) => prev + limit);
  }, []);

  const handlePrevPage = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - limit));
  }, []);

  const handleWarehouseChange = useCallback((value: string) => {
    setWarehouse(value);
    setOffset(0);
  }, []);

  const handlePeriodChange = useCallback((days: number) => {
    setPeriodDays(days);
    setOffset(0);
  }, []);

  // Форматирование даты
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Получение бейджа статуса
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
            <CheckCircle className="mr-1 size-3" />
            Завершено
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
            <Clock className="mr-1 size-3" />
            В обработке
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-400 hover:bg-red-500/30">
            <XCircle className="mr-1 size-3" />
            Ошибка
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  // Получение названия склада
  const getWarehouseName = (warehouseId: string) => {
    return WAREHOUSES.find((wh) => wh.id === warehouseId)?.name ?? warehouseId;
  };

  const stats = statsQuery.data?.success ? statsQuery.data.data : null;
  const history = historyQuery.data?.success ? historyQuery.data.data : null;

  return (
    <>
      {/* Header */}
      <PageHeader
        title="История приёмок"
        description="Журнал всех операций приёмки товаров"
        breadcrumbs={[
          { label: "Приёмка", href: "/intake" },
          { label: "История" },
        ]}
        actions={
          <Button asChild size="sm">
            <Link href="/intake">
              <Plus className="mr-2 size-4" />
              Новая приёмка
            </Link>
          </Button>
        }
      />

      <main className="flex-1 space-y-4 p-4 md:space-y-6 md:p-6">
        {/* Статистика */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Приёмок за период
              </CardTitle>
              <History className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.receiptsCount ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Принято товаров
              </CardTitle>
              <Package className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                +{stats?.totalItemsReceived ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Уникальных SKU
              </CardTitle>
              <Package className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats?.uniqueSkusReceived ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Последняя приёмка
              </CardTitle>
              <Clock className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-base font-medium">
                {stats?.lastReceiptDate
                  ? formatDate(new Date(stats.lastReceiptDate))
                  : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Склад */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Склад</label>
            <Select value={warehouse} onValueChange={handleWarehouseChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Выберите склад" />
              </SelectTrigger>
              <SelectContent>
                {WAREHOUSES.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Период */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Период</label>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <Button
                  key={p.days}
                  variant={periodDays === p.days ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePeriodChange(p.days)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Таблица */}
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Документ</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="hidden sm:table-cell">Склад</TableHead>
                  <TableHead className="text-right">Позиций</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead className="hidden sm:table-cell">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Загрузка */}
                {historyQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-muted-foreground">Загрузка...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Ошибка */}
                {historyQuery.error && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="text-destructive">
                        Ошибка загрузки: {historyQuery.error.message}
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Пустой список */}
                {history?.receipts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Inbox className="size-10 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Нет приёмок за выбранный период
                        </p>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/intake">
                            <Plus className="mr-2 size-4" />
                            Создать приёмку
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Список */}
                {history?.receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 font-mono text-sm text-primary">
                        {receipt.docNumber ?? `#${receipt.id}`}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {receipt.docDate ? formatDate(receipt.docDate) : "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {getWarehouseName(receipt.warehouse ?? "")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {receipt.itemsCount}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-emerald-500">
                      +{receipt.totalQuantity}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {getStatusBadge(receipt.status ?? "pending")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

          {/* Пагинация */}
          {history && history.totalCount > limit && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Показано {offset + 1} –{" "}
                {Math.min(offset + limit, history.totalCount)} из{" "}
                {history.totalCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={offset === 0}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!history.hasMore}
                >
                  Вперёд
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
