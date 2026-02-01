"use client";

/**
 * Форма создания листа сборки
 */

import { useState } from "react";

interface OrderItem {
  sku: string;
  quantity: number;
  productName?: string;
}

interface Order {
  orderNumber: string;
  customerName?: string;
  items: OrderItem[];
}

interface CreatePickingListFormProps {
  warehouses: string[];
  onSubmit: (data: {
    warehouse: string;
    orders: Order[];
    pickingType: "single" | "batch" | "wave";
    priority: number;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CreatePickingListForm({
  warehouses,
  onSubmit,
  onCancel,
  isLoading,
}: CreatePickingListFormProps) {
  const [warehouse, setWarehouse] = useState(warehouses[0] ?? "");
  const [pickingType, setPickingType] = useState<"single" | "batch" | "wave">("single");
  const [priority, setPriority] = useState(1);
  const [orders, setOrders] = useState<Order[]>([
    { orderNumber: "", customerName: "", items: [{ sku: "", quantity: 1 }] },
  ]);

  const handleAddOrder = () => {
    setOrders([
      ...orders,
      { orderNumber: "", customerName: "", items: [{ sku: "", quantity: 1 }] },
    ]);
  };

  const handleRemoveOrder = (index: number) => {
    if (orders.length > 1) {
      setOrders(orders.filter((_, i) => i !== index));
    }
  };

  const handleOrderChange = (
    orderIndex: number,
    field: "orderNumber" | "customerName",
    value: string
  ) => {
    const newOrders = [...orders];
    newOrders[orderIndex] = { ...newOrders[orderIndex]!, [field]: value };
    setOrders(newOrders);
  };

  const handleAddItem = (orderIndex: number) => {
    const newOrders = [...orders];
    newOrders[orderIndex]!.items.push({ sku: "", quantity: 1 });
    setOrders(newOrders);
  };

  const handleRemoveItem = (orderIndex: number, itemIndex: number) => {
    const newOrders = [...orders];
    if (newOrders[orderIndex]!.items.length > 1) {
      newOrders[orderIndex]!.items = newOrders[orderIndex]!.items.filter(
        (_, i) => i !== itemIndex
      );
      setOrders(newOrders);
    }
  };

  const handleItemChange = (
    orderIndex: number,
    itemIndex: number,
    field: "sku" | "quantity" | "productName",
    value: string | number
  ) => {
    const newOrders = [...orders];
    newOrders[orderIndex]!.items[itemIndex] = {
      ...newOrders[orderIndex]!.items[itemIndex]!,
      [field]: field === "quantity" ? Number(value) : value,
    };
    setOrders(newOrders);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Фильтруем пустые заказы и позиции
    const validOrders = orders
      .filter((o) => o.orderNumber.trim())
      .map((o) => ({
        ...o,
        items: o.items.filter((i) => i.sku.trim() && i.quantity > 0),
      }))
      .filter((o) => o.items.length > 0);

    if (validOrders.length === 0) {
      alert("Добавьте хотя бы один заказ с позициями");
      return;
    }

    onSubmit({ warehouse, orders: validOrders, pickingType, priority });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Основные параметры */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            Склад
          </label>
          <select
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            required
          >
            {warehouses.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            Тип сборки
          </label>
          <select
            value={pickingType}
            onChange={(e) =>
              setPickingType(e.target.value as "single" | "batch" | "wave")
            }
            className="w-full rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="single">Одиночный (1 заказ)</option>
            <option value="batch">Batch (несколько заказов)</option>
            <option value="wave">Wave (по зонам)</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            Приоритет
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value={0}>Низкий</option>
            <option value={1}>Нормальный</option>
            <option value={2}>Высокий</option>
            <option value={3}>Срочный</option>
          </select>
        </div>
      </div>

      {/* Заказы */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Заказы</h3>
          <button
            type="button"
            onClick={handleAddOrder}
            className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-600"
          >
            + Добавить заказ
          </button>
        </div>

        {orders.map((order, orderIndex) => (
          <div
            key={orderIndex}
            className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-medium text-white">Заказ #{orderIndex + 1}</h4>
              {orders.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOrder(orderIndex)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Удалить
                </button>
              )}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <input
                type="text"
                value={order.orderNumber}
                onChange={(e) =>
                  handleOrderChange(orderIndex, "orderNumber", e.target.value)
                }
                placeholder="Номер заказа *"
                className="rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                required
              />
              <input
                type="text"
                value={order.customerName}
                onChange={(e) =>
                  handleOrderChange(orderIndex, "customerName", e.target.value)
                }
                placeholder="Клиент"
                className="rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Позиции заказа */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Позиции</span>
                <button
                  type="button"
                  onClick={() => handleAddItem(orderIndex)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Добавить
                </button>
              </div>

              {order.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex gap-2">
                  <input
                    type="text"
                    value={item.sku}
                    onChange={(e) =>
                      handleItemChange(orderIndex, itemIndex, "sku", e.target.value)
                    }
                    placeholder="SKU *"
                    className="flex-1 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={item.productName ?? ""}
                    onChange={(e) =>
                      handleItemChange(
                        orderIndex,
                        itemIndex,
                        "productName",
                        e.target.value
                      )
                    }
                    placeholder="Название"
                    className="flex-1 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(
                        orderIndex,
                        itemIndex,
                        "quantity",
                        e.target.value
                      )
                    }
                    placeholder="Кол-во"
                    min={1}
                    className="w-24 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                  {order.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(orderIndex, itemIndex)}
                      className="rounded-lg px-2 text-red-400 hover:bg-red-500/20"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Кнопки */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {isLoading ? "Создание..." : "Создать лист сборки"}
        </button>
      </div>
    </form>
  );
}
