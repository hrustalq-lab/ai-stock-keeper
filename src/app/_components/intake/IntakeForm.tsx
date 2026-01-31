"use client";

import { useState, useCallback } from "react";

/**
 * Данные формы приёмки
 */
export interface IntakeFormData {
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
}

/**
 * Пропсы компонента IntakeForm
 */
interface IntakeFormProps {
  initialData?: Partial<IntakeFormData>;
  warehouses: Array<{ id: string; name: string }>;
  onSubmit: (data: IntakeFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  className?: string;
}

/**
 * Компонент формы приёмки товара
 */
export function IntakeForm({
  initialData = {},
  warehouses,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = "",
}: IntakeFormProps) {
  const [formData, setFormData] = useState<IntakeFormData>({
    sku: initialData.sku ?? "",
    name: initialData.name ?? "",
    quantity: initialData.quantity ?? 1,
    warehouse: initialData.warehouse ?? warehouses[0]?.id ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof IntakeFormData, string>>>({});

  // Валидация формы
  const validate = useCallback(() => {
    const newErrors: Partial<Record<keyof IntakeFormData, string>> = {};

    if (!formData.sku.trim()) {
      newErrors.sku = "Введите артикул (SKU)";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Введите название товара";
    }

    if (formData.quantity < 1) {
      newErrors.quantity = "Количество должно быть минимум 1";
    }

    if (formData.quantity > 999999) {
      newErrors.quantity = "Слишком большое количество";
    }

    if (!formData.warehouse) {
      newErrors.warehouse = "Выберите склад";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Обработка отправки
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (validate()) {
        onSubmit(formData);
      }
    },
    [formData, validate, onSubmit]
  );

  // Обновление поля
  const updateField = useCallback(
    <K extends keyof IntakeFormData>(field: K, value: IntakeFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Сбрасываем ошибку поля при изменении
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${className}`}>
      {/* SKU */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Артикул (SKU) <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.sku}
          onChange={(e) => updateField("sku", e.target.value.toUpperCase())}
          placeholder="Например: SKU-001"
          disabled={isSubmitting}
          className={`w-full rounded-xl border bg-slate-900 px-4 py-3 font-mono text-white placeholder-slate-500 transition focus:outline-none focus:ring-2 ${
            errors.sku
              ? "border-red-500 focus:ring-red-500/50"
              : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
          }`}
        />
        {errors.sku && <p className="mt-1.5 text-sm text-red-400">{errors.sku}</p>}
      </div>

      {/* Название */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Название товара <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Например: Болт М8x30 оцинкованный"
          disabled={isSubmitting}
          className={`w-full rounded-xl border bg-slate-900 px-4 py-3 text-white placeholder-slate-500 transition focus:outline-none focus:ring-2 ${
            errors.name
              ? "border-red-500 focus:ring-red-500/50"
              : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
          }`}
        />
        {errors.name && <p className="mt-1.5 text-sm text-red-400">{errors.name}</p>}
      </div>

      {/* Количество и Склад в одной строке */}
      <div className="grid grid-cols-2 gap-4">
        {/* Количество */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Количество <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => updateField("quantity", parseInt(e.target.value) || 0)}
              min={1}
              max={999999}
              disabled={isSubmitting}
              className={`w-full rounded-xl border bg-slate-900 px-4 py-3 pr-12 font-mono text-white placeholder-slate-500 transition focus:outline-none focus:ring-2 ${
                errors.quantity
                  ? "border-red-500 focus:ring-red-500/50"
                  : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
              шт
            </span>
          </div>
          {errors.quantity && (
            <p className="mt-1.5 text-sm text-red-400">{errors.quantity}</p>
          )}
        </div>

        {/* Склад */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Склад <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.warehouse}
            onChange={(e) => updateField("warehouse", e.target.value)}
            disabled={isSubmitting}
            className={`w-full appearance-none rounded-xl border bg-slate-900 px-4 py-3 text-white transition focus:outline-none focus:ring-2 ${
              errors.warehouse
                ? "border-red-500 focus:ring-red-500/50"
                : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
            }`}
          >
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
          {errors.warehouse && (
            <p className="mt-1.5 text-sm text-red-400">{errors.warehouse}</p>
          )}
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-6 py-3 font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/40 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Отправка...
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Создать приёмку
            </>
          )}
        </button>
      </div>
    </form>
  );
}
