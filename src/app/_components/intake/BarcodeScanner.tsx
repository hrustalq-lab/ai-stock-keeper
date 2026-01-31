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

  // Инициализация Quagga
  const initScanner = useCallback(async () => {
    if (!scannerRef.current || isInitialized) return;

    try {
      // Проверяем доступ к камере
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);

      await Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target: scannerRef.current,
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
          locate: true, // Автоматический поиск штрих-кода
          locator: {
            patchSize: "medium",
            halfSample: true,
          },
        },
        (err) => {
          if (err) {
            console.error("[BarcodeScanner] Ошибка инициализации:", err);
            onError?.("Не удалось запустить камеру");
            return;
          }
          Quagga.start();
          setIsInitialized(true);
        }
      );
    } catch (err) {
      console.error("[BarcodeScanner] Нет доступа к камере:", err);
      setHasPermission(false);
      onError?.("Нет доступа к камере. Разрешите доступ в настройках браузера.");
    }
  }, [isInitialized, onError]);

  // Остановка Quagga
  const stopScanner = useCallback(() => {
    if (isInitialized) {
      void Quagga.stop();
      setIsInitialized(false);
    }
  }, [isInitialized]);

  // Обработчик обнаружения штрих-кода
  useEffect(() => {
    const handleDetected = (result: QuaggaJSResultObject) => {
      const code = result.codeResult?.code;
      const format = result.codeResult?.format;

      if (!code || !format) return;

      // Дебаунс — не сканировать один и тот же код несколько раз подряд
      if (code === lastScannedCode) return;

      setLastScannedCode(code);

      // Воспроизводим звук успешного сканирования (опционально)
      // new Audio('/beep.mp3').play().catch(() => {});

      onScan({ code, format });

      // Сбрасываем через 2 секунды для повторного сканирования
      setTimeout(() => setLastScannedCode(null), 2000);
    };

    if (isInitialized) {
      Quagga.onDetected(handleDetected);
    }

    return () => {
      Quagga.offDetected(handleDetected);
    };
  }, [isInitialized, lastScannedCode, onScan]);

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
