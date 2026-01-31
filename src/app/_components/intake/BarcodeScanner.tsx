"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Quagga, { type QuaggaJSResultObject } from "@ericblade/quagga2";

/**
 * Результат сканирования
 */
export interface ScanResult {
  code: string;
  format: string;
}

/**
 * Пропсы компонента BarcodeScanner
 */
interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  onError?: (error: string) => void;
  isActive?: boolean;
  className?: string;
}

/**
 * Компонент сканера штрих-кодов с камеры
 */
export function BarcodeScanner({
  onScan,
  onError,
  isActive = true,
  className = "",
}: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  
  // Refs для избежания race condition и stale closures в setTimeout/useCallback
  const isInitializedRef = useRef(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onErrorRef = useRef(onError);
  const onScanRef = useRef(onScan);
  const lastScannedCodeRef = useRef(lastScannedCode);
  
  // Ref для текущего зарегистрированного handler (гарантирует корректную отмену регистрации)
  const handleDetectedRef = useRef<((result: QuaggaJSResultObject) => void) | null>(null);
  
  // Ref для отслеживания активности сканера (предотвращает race condition при асинхронной инициализации)
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  
  // Синхронизируем refs с актуальными значениями (избегаем stale closures в event handlers)
  onErrorRef.current = onError;
  onScanRef.current = onScan;
  lastScannedCodeRef.current = lastScannedCode;

  // Инициализация Quagga
  const initScanner = useCallback(async () => {
    // Проверяем ref для актуального состояния (не closure)
    if (!scannerRef.current || isInitializedRef.current) return;
    
    // Проверяем что сканер всё ещё должен быть активен (race condition prevention)
    if (!isActiveRef.current) return;

    // Ждём пока элемент получит размеры (важно для SSR)
    const target = scannerRef.current;
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Очищаем предыдущий таймаут если есть
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      // Повторяем попытку через 100ms
      retryTimeoutRef.current = setTimeout(() => void initScanner(), 100);
      return;
    }

    try {
      // Проверяем доступ к камере
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.getTracks().forEach((track) => track.stop());
      
      // Повторная проверка после async операции (race condition prevention)
      if (!isActiveRef.current) return;
      
      setHasPermission(true);

      await Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target: target,
            constraints: {
              facingMode: "environment", // Задняя камера
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
            },
          },
          decoder: {
            readers: [
              "ean_reader", // EAN-13, EAN-8
              "code_128_reader",
              "code_39_reader",
              "upc_reader",
            ],
          },
          locate: true, // Автоматический поиск штрих-кода в кадре
          locator: {
            patchSize: "medium",
            halfSample: true,
          },
        },
        (err) => {
          if (err) {
            console.error("[BarcodeScanner] Ошибка инициализации:", err);
            onErrorRef.current?.("Не удалось запустить камеру");
            return;
          }
          
          // Финальная проверка перед стартом (race condition prevention)
          if (!isActiveRef.current) {
            void Quagga.stop();
            return;
          }
          
          Quagga.start();
          isInitializedRef.current = true;
          setIsInitialized(true);
        }
      );
    } catch (err) {
      console.error("[BarcodeScanner] Нет доступа к камере:", err);
      setHasPermission(false);
      onErrorRef.current?.("Нет доступа к камере. Разрешите доступ в настройках браузера.");
    }
  }, []); // Зависимости пусты — используем refs для избежания stale closure при setTimeout retry

  // Остановка Quagga
  const stopScanner = useCallback(() => {
    // Очищаем retry-таймаут
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Принудительно отменяем handler (дополнительная защита от накопления handlers)
    if (handleDetectedRef.current) {
      Quagga.offDetected(handleDetectedRef.current);
      handleDetectedRef.current = null;
    }
    
    if (isInitializedRef.current) {
      void Quagga.stop();
      isInitializedRef.current = false;
      setIsInitialized(false);
    }
  }, []); // Зависимости не нужны — используем ref

  // Обработчик обнаружения штрих-кода
  // ВАЖНО: Всегда сначала отменяем предыдущий handler перед регистрацией нового
  // Это предотвращает накопление stale handlers при:
  // 1. React StrictMode (effects вызываются дважды в dev)
  // 2. Быстром toggle isActive (race conditions)
  // 3. Любых других сценариях где cleanup мог не сработать
  useEffect(() => {
    // Всегда сначала отменяем предыдущий handler если он есть
    // Это критично для предотвращения дублирования callbacks
    if (handleDetectedRef.current) {
      Quagga.offDetected(handleDetectedRef.current);
      handleDetectedRef.current = null;
    }

    // Ранний выход: не регистрируем handler если сканер не инициализирован
    if (!isInitialized) {
      // Возвращаем cleanup для консистентности (хотя handler не был зарегистрирован)
      return () => {
        if (handleDetectedRef.current) {
          Quagga.offDetected(handleDetectedRef.current);
          handleDetectedRef.current = null;
        }
      };
    }

    const handleDetected = (result: QuaggaJSResultObject) => {
      const code = result.codeResult?.code;
      const format = result.codeResult?.format;

      if (!code || !format) return;

      // Дебаунс — не сканировать один и тот же код несколько раз подряд (используем ref для актуального значения)
      if (code === lastScannedCodeRef.current) return;

      setLastScannedCode(code);

      // Воспроизводим звук успешного сканирования (опционально)
      // new Audio('/beep.mp3').play().catch(() => {});

      // Используем ref для актуального callback
      onScanRef.current({ code, format });

      // Сбрасываем через 2 секунды для повторного сканирования
      setTimeout(() => setLastScannedCode(null), 2000);
    };

    // Сохраняем ссылку на handler для корректной отмены регистрации
    handleDetectedRef.current = handleDetected;
    Quagga.onDetected(handleDetected);

    return () => {
      // Используем ref для гарантированного удаления правильного handler
      if (handleDetectedRef.current) {
        Quagga.offDetected(handleDetectedRef.current);
        handleDetectedRef.current = null;
      }
    };
  }, [isInitialized]);

  // Управление жизненным циклом
  useEffect(() => {
    if (isActive) {
      void initScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isActive, initScanner, stopScanner]);

  // Нет доступа к камере
  if (hasPermission === false) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-red-400/50 bg-red-950/20 p-8 ${className}`}
      >
        <svg
          className="mb-4 h-12 w-12 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <p className="text-center text-red-300">
          Нет доступа к камере
        </p>
        <p className="mt-2 text-center text-sm text-red-400/70">
          Разрешите доступ в настройках браузера
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-black ${className}`}>
      {/* Видеопоток */}
      <div
        ref={scannerRef}
        className="relative aspect-video w-full"
        style={{ minHeight: "240px" }}
      />

      {/* Рамка сканирования */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-32 w-64 rounded-lg border-2 border-emerald-400/70 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
          {/* Угловые маркеры */}
          <div className="absolute -left-1 -top-1 h-4 w-4 border-l-4 border-t-4 border-emerald-400" />
          <div className="absolute -right-1 -top-1 h-4 w-4 border-r-4 border-t-4 border-emerald-400" />
          <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-emerald-400" />
          <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-emerald-400" />
        </div>
      </div>

      {/* Индикатор статуса */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
        <div
          className={`h-2 w-2 rounded-full ${
            isInitialized
              ? "animate-pulse bg-emerald-400"
              : "bg-yellow-400"
          }`}
        />
        <span className="text-xs text-white/80">
          {isInitialized ? "Сканирование..." : "Запуск камеры..."}
        </span>
      </div>

      {/* Последний отсканированный код */}
      {lastScannedCode && (
        <div className="absolute right-4 top-4 rounded-lg bg-emerald-500/90 px-3 py-2 shadow-lg backdrop-blur-sm">
          <p className="font-mono text-sm font-medium text-white">
            {lastScannedCode}
          </p>
        </div>
      )}
    </div>
  );
}