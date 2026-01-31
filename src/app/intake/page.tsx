"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import {
  BarcodeScanner,
  ImageUploader,
  ProductSuggestions,
  IntakeForm,
  IntakeConfirmation,
  type ScanResult,
  type ProductSuggestion,
  type IntakeFormData,
  type ConfirmationData,
} from "~/app/_components/intake";

/**
 * Состояния workflow приёмки
 */
type IntakeStep = "scan" | "match" | "form" | "confirm";

/**
 * Режим ввода: камера или файл
 */
type InputMode = "camera" | "upload";

/**
 * Доступные склады (TODO: получать из API)
 */
const WAREHOUSES = [
  { id: "warehouse_main", name: "Основной склад" },
  { id: "warehouse_reserve", name: "Резервный склад" },
  { id: "warehouse_retail", name: "Розничный склад" },
];

/**
 * Страница приёмки товаров
 * Flow: Сканирование → Поиск товара → Форма → Подтверждение
 */
export default function IntakePage() {
  const router = useRouter();

  // Состояние workflow
  const [step, setStep] = useState<IntakeStep>("scan");
  const [inputMode, setInputMode] = useState<InputMode>("camera");
  const [error, setError] = useState<string | null>(null);

  // Данные workflow
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductSuggestion | null>(null);
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<"pending" | "success" | "error">("pending");

  // tRPC мутации
  const recognizeBarcodeMutation = api.intake.recognizeBarcode.useMutation();
  const recognizeOCRMutation = api.intake.recognizeOCR.useMutation();
  const createReceiptMutation = api.intake.createReceipt.useMutation();

  // tRPC queries
  const matchProductQuery = api.intake.matchProduct.useQuery(
    {
      sku: scannedCode ?? undefined,
      name: recognizedText ?? undefined,
      barcode: scannedCode ?? undefined,
    },
    {
      enabled: !!(scannedCode ?? recognizedText),
      refetchOnWindowFocus: false,
    }
  );

  // Обновление suggestions при получении результатов
  useEffect(() => {
    if (matchProductQuery.data?.success && matchProductQuery.data.matches) {
      const mappedSuggestions: ProductSuggestion[] = matchProductQuery.data.matches.map((m) => ({
        id: m.id,
        sku: m.sku,
        name: m.name,
        quantity: m.quantity,
        warehouse: m.warehouse,
        supplier: m.supplier ?? undefined,
        confidence: m.confidence,
      }));
      setSuggestions(mappedSuggestions);

      // Переходим к выбору товара если есть результаты (функциональная форма для избежания цикла)
      if (mappedSuggestions.length > 0) {
        setStep((prev) => (prev === "scan" ? "match" : prev));
      }
    }
  }, [matchProductQuery.data]); // step удалён — используем функциональную форму setStep

  // Обработка сканирования штрих-кода
  const handleBarcodeScan = useCallback((result: ScanResult) => {
    setScannedCode(result.code);
    setError(null);
  }, []);

  // Обработка загрузки изображения
  const handleImageUpload = useCallback(
    async (imageBase64: string) => {
      setError(null);

      try {
        // Пробуем распознать штрих-код
        const barcodeResult = await recognizeBarcodeMutation.mutateAsync({ imageBase64 });

        if (barcodeResult.success && barcodeResult.data) {
          setScannedCode(barcodeResult.data.code);
          return;
        }

        // Если штрих-код не найден, пробуем OCR
        const ocrResult = await recognizeOCRMutation.mutateAsync({ imageBase64, language: "rus+eng" });

        if (ocrResult.success && ocrResult.data) {
          // Используем извлечённые данные для поиска
          const extracted = ocrResult.data.extracted;
          if (extracted.sku) {
            setScannedCode(extracted.sku);
          } else if (extracted.name) {
            setRecognizedText(extracted.name);
          } else {
            setRecognizedText(ocrResult.data.text.slice(0, 100));
          }
          return;
        }

        setError("Не удалось распознать данные на изображении");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка распознавания изображения");
      }
    },
    [recognizeBarcodeMutation, recognizeOCRMutation]
  );

  // Обработка ошибок сканирования
  const handleScanError = useCallback((errorMsg: string) => {
    setError(errorMsg);
  }, []);

  // Выбор товара из списка
  const handleSelectProduct = useCallback((product: ProductSuggestion) => {
    setSelectedProduct(product);
  }, []);

  // Подтверждение выбора и переход к форме
  const handleConfirmSelection = useCallback(() => {
    if (selectedProduct) {
      setStep("form");
    }
  }, [selectedProduct]);

  // Отправка формы приёмки
  const handleFormSubmit = useCallback(
    async (data: IntakeFormData) => {
      if (!selectedProduct) return;

      setConfirmationData({
        sku: data.sku,
        name: data.name,
        quantity: data.quantity,
        warehouse: WAREHOUSES.find((w) => w.id === data.warehouse)?.name ?? data.warehouse,
      });
      setReceiptStatus("pending");
      setStep("confirm");

      try {
        const result = await createReceiptMutation.mutateAsync({
          items: [
            {
              inventoryId: selectedProduct.id,
              quantity: data.quantity,
            },
          ],
          warehouse: data.warehouse,
        });

        if (result.success && result.data) {
          setConfirmationData((prev) =>
            prev
              ? {
                  ...prev,
                  documentId: result.data?.documentId,
                }
              : null
          );
          setReceiptStatus("success");
        } else {
          setReceiptStatus("error");
          setError(result.error ?? "Неизвестная ошибка");
        }
      } catch (err) {
        setReceiptStatus("error");
        setError(err instanceof Error ? err.message : "Ошибка создания приёмки");
      }
    },
    [selectedProduct, createReceiptMutation]
  );

  // Отмена формы
  const handleFormCancel = useCallback(() => {
    setStep("match");
  }, []);

  // Новая приёмка
  const handleNewIntake = useCallback(() => {
    setStep("scan");
    setScannedCode(null);
    setRecognizedText(null);
    setSuggestions([]);
    setSelectedProduct(null);
    setConfirmationData(null);
    setReceiptStatus("pending");
    setError(null);
  }, []);

  // Переход к истории
  const handleViewHistory = useCallback(() => {
    router.push("/intake/history");
  }, [router]);

  // Сброс поиска
  const handleResetSearch = useCallback(() => {
    setScannedCode(null);
    setRecognizedText(null);
    setSuggestions([]);
    setSelectedProduct(null);
    setError(null);
    setStep("scan");
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-emerald-500">
              <svg
                className="h-6 w-6 text-white"
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
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Приёмка товаров</h1>
              <p className="text-xs text-slate-500">AI Stock Keeper</p>
            </div>
          </div>

          <button
            onClick={handleViewHistory}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            История
          </button>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            {[
              { id: "scan", label: "Сканирование", icon: "📷" },
              { id: "match", label: "Выбор товара", icon: "🔍" },
              { id: "form", label: "Данные", icon: "📝" },
              { id: "confirm", label: "Результат", icon: "✅" },
            ].map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition ${
                    step === s.id
                      ? "bg-cyan-500/20 text-cyan-400"
                      : ["scan", "match", "form", "confirm"].indexOf(step) >
                          ["scan", "match", "form", "confirm"].indexOf(s.id as IntakeStep)
                        ? "text-slate-500"
                        : "text-slate-600"
                  }`}
                >
                  <span>{s.icon}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {index < 3 && (
                  <div
                    className={`mx-2 h-px w-8 sm:w-12 ${
                      ["scan", "match", "form", "confirm"].indexOf(step) > index
                        ? "bg-cyan-500/50"
                        : "bg-slate-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Ошибка */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-red-300">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Step: Scan */}
        {step === "scan" && (
          <div className="space-y-6">
            {/* Переключатель режима */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setInputMode("camera")}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition ${
                  inputMode === "camera"
                    ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Камера
              </button>
              <button
                onClick={() => setInputMode("upload")}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition ${
                  inputMode === "upload"
                    ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Загрузить файл
              </button>
            </div>

            {/* Сканер или загрузчик */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              {inputMode === "camera" ? (
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  onError={handleScanError}
                  isActive={step === "scan"}
                  className="aspect-video"
                />
              ) : (
                <ImageUploader
                  onUpload={handleImageUpload}
                  onError={handleScanError}
                  maxSizeMB={10}
                />
              )}
            </div>

            {/* Распознанный код */}
            {scannedCode && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Распознанный код:</p>
                    <code className="mt-1 text-lg font-bold text-emerald-400">{scannedCode}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    {matchProductQuery.isLoading && (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                    )}
                    <button
                      onClick={handleResetSearch}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Подсказка */}
            {!scannedCode && !recognizedText && (
              <div className="text-center">
                <p className="text-slate-500">
                  {inputMode === "camera"
                    ? "Наведите камеру на штрих-код товара"
                    : "Загрузите фото штрих-кода или накладной"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step: Match */}
        {step === "match" && (
          <div className="space-y-6">
            {/* Информация о поиске */}
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Поиск по:</p>
                  <code className="text-cyan-400">{scannedCode ?? recognizedText}</code>
                </div>
                <button
                  onClick={handleResetSearch}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-700"
                >
                  Новый поиск
                </button>
              </div>
            </div>

            {/* Список товаров */}
            <ProductSuggestions
              suggestions={suggestions}
              selectedId={selectedProduct?.id ?? null}
              onSelect={handleSelectProduct}
              isLoading={matchProductQuery.isLoading}
            />

            {/* Кнопка подтверждения */}
            {selectedProduct && (
              <button
                onClick={handleConfirmSelection}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 px-6 py-4 font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/40"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                Далее: заполнить форму
              </button>
            )}
          </div>
        )}

        {/* Step: Form */}
        {step === "form" && selectedProduct && (
          <div className="space-y-6">
            {/* Выбранный товар */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
              <p className="mb-1 text-sm text-slate-400">Выбранный товар:</p>
              <div className="flex items-center gap-3">
                <code className="rounded bg-slate-800 px-2 py-1 font-mono text-cyan-400">
                  {selectedProduct.sku}
                </code>
                <span className="text-white">{selectedProduct.name}</span>
              </div>
            </div>

            {/* Форма */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
              <IntakeForm
                initialData={{
                  sku: selectedProduct.sku,
                  name: selectedProduct.name,
                  warehouse: selectedProduct.warehouse,
                  quantity: 1,
                }}
                warehouses={WAREHOUSES}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                isSubmitting={createReceiptMutation.isPending}
              />
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && confirmationData && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
            <IntakeConfirmation
              data={confirmationData}
              status={receiptStatus}
              errorMessage={error ?? undefined}
              onNewIntake={handleNewIntake}
              onViewHistory={handleViewHistory}
            />
          </div>
        )}
      </main>
    </div>
  );
}
