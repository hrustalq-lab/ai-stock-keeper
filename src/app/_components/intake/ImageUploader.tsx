"use client";

import { useRef, useState, useCallback } from "react";

/**
 * Пропсы компонента ImageUploader
 */
interface ImageUploaderProps {
  onUpload: (imageBase64: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

/**
 * Компонент загрузки изображений с drag-and-drop
 */
export function ImageUploader({
  onUpload,
  onError,
  accept = "image/*",
  maxSizeMB = 10,
  className = "",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Обработка файла
  const processFile = useCallback(
    async (file: File) => {
      // Проверка типа
      if (!file.type.startsWith("image/")) {
        onError?.("Файл должен быть изображением");
        return;
      }

      // Проверка размера
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        onError?.(`Файл слишком большой. Максимум ${maxSizeMB} МБ`);
        return;
      }

      setIsLoading(true);

      try {
        // Читаем как base64
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setPreview(base64);
          onUpload(base64);
          setIsLoading(false);
        };
        reader.onerror = () => {
          onError?.("Ошибка чтения файла");
          setIsLoading(false);
        };
        reader.readAsDataURL(file);
      } catch {
        onError?.("Ошибка обработки файла");
        setIsLoading(false);
      }
    },
    [maxSizeMB, onUpload, onError]
  );

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        void processFile(files[0]!);
      }
    },
    [processFile]
  );

  // Input change handler
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        void processFile(files[0]!);
      }
    },
    [processFile]
  );

  // Очистить превью
  const clearPreview = useCallback(() => {
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Превью загруженного изображения */}
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Превью"
            className="h-auto max-h-64 w-full object-contain"
          />
          <button
            onClick={clearPreview}
            className="absolute right-2 top-2 rounded-full bg-red-500/80 p-1.5 text-white transition hover:bg-red-500"
            title="Удалить"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ) : (
        /* Зона загрузки */
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
            isDragging
              ? "border-cyan-400 bg-cyan-950/30 shadow-[0_0_30px_rgba(34,211,238,0.15)]"
              : "border-slate-600 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-900"
          }`}
        >
          {isLoading ? (
            <>
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
              <p className="text-slate-300">Обработка...</p>
            </>
          ) : (
            <>
              <svg
                className={`mb-4 h-12 w-12 transition-colors ${
                  isDragging ? "text-cyan-400" : "text-slate-500"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mb-1 text-center text-slate-300">
                {isDragging ? "Отпустите файл" : "Перетащите изображение сюда"}
              </p>
              <p className="text-center text-sm text-slate-500">
                или нажмите для выбора
              </p>
              <p className="mt-3 text-xs text-slate-600">
                PNG, JPG до {maxSizeMB} МБ
              </p>
            </>
          )}
        </div>
      )}

      {/* Скрытый input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
