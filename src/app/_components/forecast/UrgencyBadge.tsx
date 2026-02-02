"use client";

/**
 * UrgencyBadge - индикатор срочности заказа
 * Updated: Compact, restrained colors
 */

interface UrgencyBadgeProps {
  urgency: "critical" | "warning" | "normal";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const urgencyConfig = {
  critical: {
    icon: "🔴",
    label: "Крит.",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
  },
  warning: {
    icon: "🟡",
    label: "Вним.",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  normal: {
    icon: "🟢",
    label: "Норм",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
};

const sizeClasses = {
  sm: "text-[10px] px-1 py-0.5",
  md: "text-xs px-1.5 py-0.5",
  lg: "text-sm px-2 py-1",
};

export function UrgencyBadge({
  urgency,
  showLabel = true,
  size = "md",
}: UrgencyBadgeProps) {
  const config = urgencyConfig[urgency];

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md border font-medium ${config.bg} ${config.color} ${config.border} ${sizeClasses[size]}`}
    >
      <span className="text-[8px]">{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
