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

  // Получение бейджа статуса - design system colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="gap-1 border-chart-2/30 bg-chart-2/10 text-[10px] text-chart-2">
            <CheckCircle className="size-2.5" />
            Готово
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="gap-1 border-chart-3/30 bg-chart-3/10 text-[10px] text-chart-3">
            <Clock className="size-2.5" />
            В работе
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-[10px] text-destructive">
            <XCircle className="size-2.5" />
            Ошибка
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
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

      <main className="flex-1 space-y-3 p-3 md:space-y-4 md:p-4">
        {/* Статистика - design system colors */}
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          <Card className="border-border/50 transition-shadow hover:shadow-sm">
            <CardContent className="flex items-center gap-3 py-2.5">
              <div className="rounded-md bg-muted/50 p-1.5">
                <History className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Приёмок</p>
                <p className="text-lg font-semibold tabular-nums">{stats?.receiptsCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 transition-shadow hover:shadow-sm">
            <CardContent className="flex items-center gap-3 py-2.5">
              <div className="rounded-md bg-chart-2/10 p-1.5">
                <Package className="size-4 text-chart-2" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Принято</p>
                <p className="text-lg font-semibold tabular-nums text-chart-2">+{stats?.totalItemsReceived ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 transition-shadow hover:shadow-sm">
            <CardContent className="flex items-center gap-3 py-2.5">
              <div className="rounded-md bg-primary/10 p-1.5">
                <Package className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Уник. SKU</p>
                <p className="text-lg font-semibold tabular-nums text-primary">{stats?.uniqueSkusReceived ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 transition-shadow hover:shadow-sm">
            <CardContent className="flex items-center gap-3 py-2.5">
              <div className="rounded-md bg-muted/50 p-1.5">
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Последняя</p>
                <p className="truncate text-xs font-medium">
                  {stats?.lastReceiptDate
                    ? formatDate(new Date(stats.lastReceiptDate))
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Фильтры - compact */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Склад */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Склад</label>
            <Select value={warehouse} onValueChange={handleWarehouseChange}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
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
            <label className="text-[10px] text-muted-foreground">Период</label>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <Button
                  key={p.days}
                  variant={periodDays === p.days ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => handlePeriodChange(p.days)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Таблица - compact */}
        <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
          <Table>
              <TableHeader>
                <TableRow className="text-[10px]">
                  <TableHead className="py-2">Документ</TableHead>
                  <TableHead className="py-2">Дата</TableHead>
                  <TableHead className="hidden py-2 sm:table-cell">Склад</TableHead>
                  <TableHead className="py-2 text-right">Поз.</TableHead>
                  <TableHead className="py-2 text-right">Кол-во</TableHead>
                  <TableHead className="hidden py-2 sm:table-cell">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Загрузка */}
                {historyQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span className="text-xs text-muted-foreground">Загрузка...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Ошибка */}
                {historyQuery.error && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="text-xs text-destructive">
                        Ошибка: {historyQuery.error.message}
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Пустой список */}
                {history?.receipts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="size-6 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Нет приёмок</p>
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                          <Link href="/intake">
                            <Plus className="mr-1 size-3" />
                            Создать
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Список */}
                {history?.receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="py-2">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-primary">
                        {receipt.docNumber ?? `#${receipt.id}`}
                      </code>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      {receipt.docDate ? formatDate(receipt.docDate) : "—"}
                    </TableCell>
                    <TableCell className="hidden py-2 text-xs text-muted-foreground sm:table-cell">
                      {getWarehouseName(receipt.warehouse ?? "")}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs">
                      {receipt.itemsCount}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs font-medium text-chart-2">
                      +{receipt.totalQuantity}
                    </TableCell>
                    <TableCell className="hidden py-2 sm:table-cell">
                      {getStatusBadge(receipt.status ?? "pending")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

          {/* Пагинация - compact */}
          {history && history.totalCount > limit && (
            <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">
                {offset + 1} – {Math.min(offset + limit, history.totalCount)} / {history.totalCount}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={handlePrevPage}
                  disabled={offset === 0}
                >
                  <ChevronLeft className="size-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={handleNextPage}
                  disabled={!history.hasMore}
                >
                  <ChevronRight className="size-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
