"use client";

/**
 * График уровня запасов (Recharts)
 * Issue #3, #4: Restrained colors, compact layout
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
      <Card className="border-border/50">
        <CardHeader className="pb-1.5">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[140px] sm:h-[180px]" />
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
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <BarChart3 className="size-3.5 text-primary" />
          Уровень запасов
        </CardTitle>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{days}д</Badge>
      </CardHeader>

      <CardContent className="pt-1">
        <div className="h-[140px] sm:h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
            >
            <defs>
              <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
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
              tick={{ fill: "#64748b", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                color: "#333333",
                fontSize: "12px",
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
              stroke="#2563eb"
              strokeWidth={1.5}
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
