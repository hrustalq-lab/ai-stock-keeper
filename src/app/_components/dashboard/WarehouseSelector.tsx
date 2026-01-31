"use client";

/**
 * Селектор склада для фильтрации dashboard
 */

import { api } from "~/trpc/react";

interface WarehouseSelectorProps {
  value?: string;
  onChange: (warehouse: string | undefined) => void;
}

export function WarehouseSelector({ value, onChange }: WarehouseSelectorProps) {
  const { data: stats } = api.dashboard.getStats.useQuery(undefined);

  const warehouses = stats?.warehouses ?? [];

  return (
    <div className="relative inline-block">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 pr-10 text-sm text-white transition-colors hover:border-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      >
        <option value="">Все склады</option>
        {warehouses.map((wh) => (
          <option key={wh} value={wh}>
            {wh}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg
          className="h-4 w-4 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
