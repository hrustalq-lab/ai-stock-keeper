"use client";

/**
 * Страница инвентаризации (placeholder)
 * /inventory
 */

import { PageHeader } from "~/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { 
  Package, 
  Search, 
  Filter,
  Download,
  RefreshCw,
  ArrowUpDown,
  MoreHorizontal,
  Construction
} from "lucide-react";

export default function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Инвентаризация"
        description="Полный каталог товаров и остатков на складах"
        breadcrumbs={[{ label: "Инвентарь" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 size-4" />
              Синхронизация
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 size-4" />
              Экспорт
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-4 md:p-6">
        {/* Coming Soon Card */}
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-xl bg-primary/10 p-4">
              <Construction className="size-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">В разработке</h3>
              <p className="text-sm text-muted-foreground">
                Полноценный модуль инвентаризации будет доступен в следующей версии.
                Текущий функционал доступен на странице Дашборда.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Поиск товаров */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Search className="size-5 text-primary" />
                </div>
                <Badge variant="secondary">Скоро</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="mb-2 text-base">Поиск товаров</CardTitle>
              <CardDescription>
                Быстрый поиск по SKU, названию, штрих-коду с фильтрацией по складам
              </CardDescription>
            </CardContent>
          </Card>

          {/* Фильтры */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-violet-500/10 p-2">
                  <Filter className="size-5 text-violet-500" />
                </div>
                <Badge variant="secondary">Скоро</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="mb-2 text-base">Расширенные фильтры</CardTitle>
              <CardDescription>
                Фильтрация по категориям, поставщикам, статусу остатков и датам
              </CardDescription>
            </CardContent>
          </Card>

          {/* Массовые операции */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <ArrowUpDown className="size-5 text-amber-500" />
                </div>
                <Badge variant="secondary">Скоро</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="mb-2 text-base">Массовые операции</CardTitle>
              <CardDescription>
                Корректировка остатков, перемещения между складами, списание
              </CardDescription>
            </CardContent>
          </Card>

          {/* Таблица товаров */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Package className="size-5 text-emerald-500" />
                </div>
                <Badge variant="secondary">Скоро</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="mb-2 text-base">Каталог товаров</CardTitle>
              <CardDescription>
                Интерактивная таблица с сортировкой, пагинацией и inline-редактированием
              </CardDescription>
            </CardContent>
          </Card>

          {/* История изменений */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <RefreshCw className="size-5 text-blue-500" />
                </div>
                <Badge variant="secondary">Скоро</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="mb-2 text-base">История изменений</CardTitle>
              <CardDescription>
                Аудит всех операций с товарами: кто, когда и что изменил
              </CardDescription>
            </CardContent>
          </Card>

          {/* Действия */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-rose-500/10 p-2">
                  <MoreHorizontal className="size-5 text-rose-500" />
                </div>
                <Badge variant="secondary">Скоро</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="mb-2 text-base">Быстрые действия</CardTitle>
              <CardDescription>
                Контекстное меню для каждого товара: редактирование, печать этикеток, 1C
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder Table Preview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Предпросмотр таблицы</CardTitle>
            <CardDescription>
              Так будет выглядеть таблица инвентаризации в будущей версии
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-6 gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <div>SKU</div>
                <div className="col-span-2">Название</div>
                <div>Склад</div>
                <div className="text-right">Остаток</div>
                <div className="text-right">Действия</div>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="grid grid-cols-6 gap-4 border-b px-4 py-3 last:border-0"
                >
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  <div className="col-span-2 h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-4 w-8 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
