"use client";

/**
 * График уровня запасов (Recharts)
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { BarChart3 } from "lucide-react";

interface StockLevelChartProps {
  warehouse?: string;
  days?: number;
  sku?: string;
}

export function StockLevelChart({
  warehouse,
  days = 7,
  sku,
}: StockLevelChartProps) {
  const { data: trends, isLoading } = api.dashboard.getStockTrends.useQuery(
    { warehouse, days, sku },
    {
      refetchInterval: 300000, // 5 минут
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] sm:h-[250px]" />
        </CardContent>
      </Card>
    );
  }

  // Если нет данных, показываем заглушку
  const chartData =
    trends && trends.length > 0
      ? trends
      : generateMockData(days);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="size-4 text-primary" />
          Уровень запасов
        </CardTitle>
        <Badge variant="outline">{days} дней</Badge>
      </CardHeader>

      <CardContent className="pt-2 sm:pt-4">
        <div className="h-[180px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 5, left: -10, bottom: 0 }}
            >
            <defs>
              <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.28 0.005 285)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "oklch(0.65 0.01 285)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "oklch(0.28 0.005 285)" }}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                });
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "oklch(0.65 0.01 285)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.16 0.005 285)",
                border: "1px solid oklch(0.28 0.005 285)",
                borderRadius: "8px",
                color: "oklch(0.98 0 0)",
              }}
              labelFormatter={(value) => {
                const date = new Date(String(value));
                return date.toLocaleDateString("ru-RU", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                });
              }}
              formatter={(value) => [
                `${Number(value).toLocaleString("ru-RU")} шт`,
                "Остаток",
              ]}
            />
            <Area
              type="monotone"
              dataKey="quantity"
              stroke="oklch(0.75 0.15 195)"
              strokeWidth={2}
              fill="url(#stockGradient)"
            />
          </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Генерация моковых данных для отображения
 */
function generateMockData(days: number) {
  const data = [];
  const baseQuantity = 500;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split("T")[0],
      quantity: baseQuantity + Math.floor(Math.random() * 200) - 100,
    });
  }

  return data;
}
