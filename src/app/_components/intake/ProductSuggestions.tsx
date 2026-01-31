"use client";

import { useCallback } from "react";

/**
 * Товар из результатов поиска
 */
export interface ProductSuggestion {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  supplier?: string;
  confidence: number; // 0-100
}

/**
 * Пропсы компонента ProductSuggestions
 */
interface ProductSuggestionsProps {
  suggestions: ProductSuggestion[];
  selectedId: number | null;
  onSelect: (product: ProductSuggestion) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Компонент списка найденных товаров
 */
export function ProductSuggestions({
  suggestions,
  selectedId,
  onSelect,
  isLoading = false,
  className = "",
}: ProductSuggestionsProps) {
  // Получить цвет индикатора уверенности
  const getConfidenceColor = useCallback((confidence: number) => {
    if (confidence >= 90) return "bg-emerald-500";
    if (confidence >= 70) return "bg-yellow-500";
    return "bg-orange-500";
  }, []);

  // Получить текст уверенности
  const getConfidenceLabel = useCallback((confidence: number) => {
    if (confidence >= 90) return "Точное совпадение";
    if (confidence >= 70) return "Высокая схожесть";
    return "Возможное совпадение";
  }, []);

  // Загрузка
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-700 bg-slate-900/50 p-4"
          >
            <div className="mb-2 h-4 w-24 rounded bg-slate-700" />
            <div className="h-5 w-48 rounded bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  // Пустой список
  if (suggestions.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/30 p-8 ${className}`}
      >
        <svg
          className="mb-3 h-10 w-10 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-slate-500">Товары не найдены</p>
        <p className="mt-1 text-sm text-slate-600">
          Отсканируйте штрих-код или загрузите фото
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="mb-3 text-sm text-slate-400">
        Найдено товаров: {suggestions.length}
      </p>

      {suggestions.map((product, index) => {
        const isSelected = selectedId === product.id;

        return (
          <button
            key={product.id}
            onClick={() => onSelect(product)}
            className={`group w-full rounded-xl border-2 p-4 text-left transition-all ${
              isSelected
                ? "border-cyan-500 bg-cyan-950/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                : "border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              {/* Основная информация */}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  {/* Позиция в списке */}
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-slate-300">
                    {index + 1}
                  </span>
                  {/* SKU */}
                  <code className="rounded bg-slate-800 px-2 py-0.5 font-mono text-sm text-cyan-400">
                    {product.sku}
                  </code>
                </div>

                {/* Название */}
                <p
                  className={`truncate text-base font-medium ${
                    isSelected ? "text-white" : "text-slate-200"
                  }`}
                >
                  {product.name}
                </p>

                {/* Мета-информация */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    {product.quantity} шт
                  </span>
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    {product.warehouse}
                  </span>
                  {product.supplier && (
                    <span className="flex items-center gap-1">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {product.supplier}
                    </span>
                  )}
                </div>
              </div>

              {/* Индикатор уверенности */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${getConfidenceColor(product.confidence)}`}
                  />
                  <span className="font-mono text-sm font-semibold text-slate-300">
                    {product.confidence}%
                  </span>
                </div>
                <span className="mt-1 text-xs text-slate-500">
                  {getConfidenceLabel(product.confidence)}
                </span>
              </div>
            </div>

            {/* Чекбокс выбора */}
            {isSelected && (
              <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 shadow-lg">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
