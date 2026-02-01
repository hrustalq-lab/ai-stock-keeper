"use client";

/**
 * Селектор склада для фильтрации dashboard
 */

import { api } from "~/trpc/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Warehouse } from "lucide-react";

interface WarehouseSelectorProps {
  value?: string;
  onChange: (warehouse: string | undefined) => void;
}

export function WarehouseSelector({ value, onChange }: WarehouseSelectorProps) {
  const { data: stats } = api.dashboard.getStats.useQuery(undefined);

  const warehouses = stats?.warehouses ?? [];

  return (
    <Select
      value={value ?? "all"}
      onValueChange={(val) => onChange(val === "all" ? undefined : val)}
    >
      <SelectTrigger className="w-auto min-w-[120px] max-w-[180px]">
        <Warehouse className="mr-2 size-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Склад" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Все склады</SelectItem>
        {warehouses.map((wh) => (
          <SelectItem key={wh} value={wh}>
            {wh}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
