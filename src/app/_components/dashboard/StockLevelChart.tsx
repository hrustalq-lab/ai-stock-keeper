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
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-zinc-700" />
        <div className="h-[250px] animate-pulse rounded bg-zinc-700/50" />
      </div>
    );
  }

  // Если нет данных, показываем заглушку
  const chartData =
    trends && trends.length > 0
      ? trends
      : generateMockData(days);

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30">
      <div className="border-b border-zinc-700/50 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-white">
          <span>📈</span>
          Уровень запасов
          <span className="ml-auto text-xs font-normal text-zinc-500">
            {days} дней
          </span>
        </h3>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#374151" }}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                });
              }}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#fff",
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
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#stockGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
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
