"use client";

/**
 * ForecastChart - график прогноза запасов
 * Phase 4: Predictive Analytics
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ComposedChart,
} from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ChartDataPoint {
  date: string;
  actual?: number;
  forecast?: number;
  confidenceLow?: number;
  confidenceHigh?: number;
}

interface ForecastChartProps {
  data: ChartDataPoint[];
  reorderPoint: number;
  currentQty: number;
  height?: number;
  showConfidence?: boolean;
}

// Кастомный тултип
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const dateStr = label as string;
  const formattedDate = dateStr
    ? format(new Date(dateStr), "d MMMM", { locale: ru })
    : "";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 font-medium text-slate-700">{formattedDate}</p>
      {payload.map((entry: any, index: number) => {
        if (entry.value === undefined || entry.value === null) return null;

        const labels: Record<string, string> = {
          actual: "Фактическое",
          forecast: "Прогноз",
          confidenceHigh: "Верхняя граница",
          confidenceLow: "Нижняя граница",
        };

        return (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color || entry.stroke }}
          >
            {labels[entry.dataKey] ?? entry.dataKey}: {entry.value} шт
          </p>
        );
      })}
    </div>
  );
}

export function ForecastChart({
  data,
  reorderPoint,
  currentQty,
  height = 300,
  showConfidence = true,
}: ForecastChartProps) {
  // Находим макс значение для оси Y
  const maxValue = Math.max(
    ...data.map((d) =>
      Math.max(
        d.actual ?? 0,
        d.forecast ?? 0,
        d.confidenceHigh ?? 0,
        currentQty,
        reorderPoint
      )
    )
  );

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(value) => {
              try {
                return format(new Date(value), "d.MM");
              } catch {
                return value;
              }
            }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            domain={[0, Math.ceil(maxValue * 1.1)]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                actual: "Фактическое потребление",
                forecast: "Прогноз",
              };
              return labels[value] ?? value;
            }}
          />

          {/* Доверительный интервал (заливка) */}
          {showConfidence && (
            <Area
              type="monotone"
              dataKey="confidenceHigh"
              stroke="none"
              fill="#8b5cf6"
              fillOpacity={0.1}
              name="confidenceHigh"
              legendType="none"
            />
          )}

          {/* Историческая линия (фактическое потребление) */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: "#2563eb", r: 3 }}
            activeDot={{ r: 5 }}
            name="actual"
            connectNulls={false}
          />

          {/* Прогнозная линия (пунктир) */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: "#8b5cf6", r: 3 }}
            activeDot={{ r: 5 }}
            name="forecast"
            connectNulls={false}
          />

          {/* Точка дозаказа */}
          <ReferenceLine
            y={reorderPoint}
            stroke="#f59e0b"
            strokeDasharray="5 3"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Легенда для точки дозаказа */}
      <div className="mt-2 flex items-center justify-center gap-6 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 bg-amber-500" style={{ borderStyle: "dashed" }} />
          <span>Точка дозаказа: {reorderPoint} шт</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-blue-600" />
          <span>Текущий остаток: {currentQty} шт</span>
        </div>
      </div>
    </div>
  );
}
