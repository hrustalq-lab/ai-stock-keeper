"use client";

/**
 * TrendIndicator - индикатор тренда потребления
 */

interface TrendIndicatorProps {
  trend: "increasing" | "stable" | "decreasing";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const trendConfig = {
  increasing: {
    icon: "↗️",
    label: "Растёт",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  stable: {
    icon: "→",
    label: "Стабильно",
    color: "text-slate-600",
    bg: "bg-slate-50",
  },
  decreasing: {
    icon: "↘️",
    label: "Снижается",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-1",
  lg: "text-base px-3 py-1.5",
};

export function TrendIndicator({
  trend,
  showLabel = true,
  size = "md",
}: TrendIndicatorProps) {
  const config = trendConfig[trend];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bg} ${config.color} ${sizeClasses[size]}`}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
