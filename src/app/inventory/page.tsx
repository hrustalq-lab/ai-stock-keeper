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

      <main className="flex-1 p-3 md:p-4">
        {/* Coming Soon Card - compact */}
        <Card className="mb-4 border-border/50 border-l-2 border-l-primary">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Construction className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">В разработке</h3>
              <p className="text-xs text-muted-foreground">
                Модуль инвентаризации в следующей версии
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview Cards - compact */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {/* Поиск товаров */}
          <Card className="border-border/50">
            <CardContent className="py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <Search className="size-4 text-primary" />
                </div>
                <Badge variant="secondary" className="h-5 text-[10px]">Скоро</Badge>
              </div>
              <CardTitle className="mb-1 text-sm">Поиск товаров</CardTitle>
              <CardDescription className="text-xs">
                Быстрый поиск по SKU, названию, штрих-коду
              </CardDescription>
            </CardContent>
          </Card>

          {/* Фильтры */}
          <Card className="border-border/50">
            <CardContent className="py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-violet-500/10 p-1.5">
                  <Filter className="size-4 text-violet-500" />
                </div>
                <Badge variant="secondary" className="h-5 text-[10px]">Скоро</Badge>
              </div>
              <CardTitle className="mb-1 text-sm">Фильтры</CardTitle>
              <CardDescription className="text-xs">
                По категориям, поставщикам, статусу
              </CardDescription>
            </CardContent>
          </Card>

          {/* Массовые операции */}
          <Card className="border-border/50">
            <CardContent className="py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-amber-500/10 p-1.5">
                  <ArrowUpDown className="size-4 text-amber-500" />
                </div>
                <Badge variant="secondary" className="h-5 text-[10px]">Скоро</Badge>
              </div>
              <CardTitle className="mb-1 text-sm">Массовые операции</CardTitle>
              <CardDescription className="text-xs">
                Корректировка, перемещения, списание
              </CardDescription>
            </CardContent>
          </Card>

          {/* Таблица товаров */}
          <Card className="border-border/50">
            <CardContent className="py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-emerald-500/10 p-1.5">
                  <Package className="size-4 text-emerald-500" />
                </div>
                <Badge variant="secondary" className="h-5 text-[10px]">Скоро</Badge>
              </div>
              <CardTitle className="mb-1 text-sm">Каталог товаров</CardTitle>
              <CardDescription className="text-xs">
                Таблица с сортировкой, пагинацией
              </CardDescription>
            </CardContent>
          </Card>

          {/* История изменений */}
          <Card className="border-border/50">
            <CardContent className="py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-blue-500/10 p-1.5">
                  <RefreshCw className="size-4 text-blue-500" />
                </div>
                <Badge variant="secondary" className="h-5 text-[10px]">Скоро</Badge>
              </div>
              <CardTitle className="mb-1 text-sm">История</CardTitle>
              <CardDescription className="text-xs">
                Аудит всех операций с товарами
              </CardDescription>
            </CardContent>
          </Card>

          {/* Действия */}
          <Card className="border-border/50">
            <CardContent className="py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-rose-500/10 p-1.5">
                  <MoreHorizontal className="size-4 text-rose-500" />
                </div>
                <Badge variant="secondary" className="h-5 text-[10px]">Скоро</Badge>
              </div>
              <CardTitle className="mb-1 text-sm">Быстрые действия</CardTitle>
              <CardDescription className="text-xs">
                Редактирование, печать, 1C
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder Table Preview - compact */}
        <Card className="mt-4 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Предпросмотр таблицы</CardTitle>
            <CardDescription className="text-xs">
              Будущая версия
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border/50">
              <div className="grid grid-cols-6 gap-3 border-b bg-muted/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <div>SKU</div>
                <div className="col-span-2">Название</div>
                <div>Склад</div>
                <div className="text-right">Ост.</div>
                <div className="text-right"></div>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="grid grid-cols-6 gap-3 border-b border-border/30 px-3 py-2 last:border-0"
                >
                  <div className="h-3 w-14 animate-pulse rounded bg-muted" />
                  <div className="col-span-2 h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-3 w-8 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-3 w-6 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
