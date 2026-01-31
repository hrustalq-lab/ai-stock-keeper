"use client";

/**
 * UrgencyBadge - индикатор срочности заказа
 */

interface UrgencyBadgeProps {
  urgency: "critical" | "warning" | "normal";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const urgencyConfig = {
  critical: {
    icon: "🔴",
    label: "Критично",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  warning: {
    icon: "🟡",
    label: "Внимание",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  normal: {
    icon: "🟢",
    label: "Норма",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-1",
  lg: "text-base px-3 py-1.5",
};

export function UrgencyBadge({
  urgency,
  showLabel = true,
  size = "md",
}: UrgencyBadgeProps) {
  const config = urgencyConfig[urgency];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.bg} ${config.color} ${config.border} ${sizeClasses[size]}`}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
