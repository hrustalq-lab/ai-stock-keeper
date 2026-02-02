"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
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
import { Camera, ImagePlus, History, ScanLine, Search, FileText, CheckCircle } from "lucide-react";

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
 * Шаги workflow
 */
const steps = [
  { id: "scan", label: "Сканирование", icon: ScanLine },
  { id: "match", label: "Выбор товара", icon: Search },
  { id: "form", label: "Данные", icon: FileText },
  { id: "confirm", label: "Результат", icon: CheckCircle },
] as const;

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

      if (mappedSuggestions.length > 0) {
        setStep((prev) => (prev === "scan" ? "match" : prev));
      }
    }
  }, [matchProductQuery.data]);

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
        const barcodeResult = await recognizeBarcodeMutation.mutateAsync({ imageBase64 });

        if (barcodeResult.success && barcodeResult.data) {
          setScannedCode(barcodeResult.data.code);
          return;
        }

        const ocrResult = await recognizeOCRMutation.mutateAsync({ imageBase64, language: "rus+eng" });

        if (ocrResult.success && ocrResult.data) {
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

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <>
      <PageHeader
        title="Приёмка товаров"
        description="Сканируйте штрих-код или загрузите фото для быстрой приёмки"
        breadcrumbs={[{ label: "Приёмка" }]}
        actions={
          <Button variant="outline" size="sm" onClick={handleViewHistory}>
            <History className="mr-2 size-4" />
            История
          </Button>
        }
      />

      {/* Progress Steps - compact */}
      <div className="border-b px-3 py-2 md:px-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors ${
                  step === s.id
                    ? "bg-primary/10 text-primary"
                    : currentStepIndex > index
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                }`}
              >
                <s.icon className="size-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-1.5 h-px w-4 sm:w-8 ${
                    currentStepIndex > index ? "bg-primary/50" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 p-3 md:p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Ошибка */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="rounded-full bg-destructive/10 p-2">
                  <span className="text-destructive">⚠️</span>
                </div>
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Step: Scan */}
          {step === "scan" && (
            <div className="space-y-6">
              {/* Переключатель режима */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant={inputMode === "camera" ? "default" : "outline"}
                  onClick={() => setInputMode("camera")}
                  className="gap-2"
                >
                  <Camera className="size-4" />
                  Камера
                </Button>
                <Button
                  variant={inputMode === "upload" ? "default" : "outline"}
                  onClick={() => setInputMode("upload")}
                  className="gap-2"
                >
                  <ImagePlus className="size-4" />
                  Загрузить файл
                </Button>
              </div>

              {/* Сканер или загрузчик */}
              <Card>
                <CardContent className="p-4">
                  {inputMode === "camera" ? (
                    <BarcodeScanner
                      onScan={handleBarcodeScan}
                      onError={handleScanError}
                      isActive={step === "scan"}
                      className="aspect-video rounded-lg"
                    />
                  ) : (
                    <ImageUploader
                      onUpload={handleImageUpload}
                      onError={handleScanError}
                      maxSizeMB={10}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Распознанный код */}
              {scannedCode && (
                <Card className="border-chart-2/30 bg-chart-2/5">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Распознанный код:</p>
                      <code className="mt-1 text-lg font-bold text-chart-2">{scannedCode}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      {matchProductQuery.isLoading && (
                        <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                      <Button variant="ghost" size="icon" onClick={handleResetSearch}>
                        ✕
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Подсказка */}
              {!scannedCode && !recognizedText && (
                <p className="text-center text-sm text-muted-foreground">
                  {inputMode === "camera"
                    ? "Наведите камеру на штрих-код товара"
                    : "Загрузите фото штрих-кода или накладной"}
                </p>
              )}
            </div>
          )}

          {/* Step: Match */}
          {step === "match" && (
            <div className="space-y-6">
              {/* Информация о поиске */}
              <Card>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Поиск по:</p>
                    <code className="text-primary">{scannedCode ?? recognizedText}</code>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleResetSearch}>
                    Новый поиск
                  </Button>
                </CardContent>
              </Card>

              {/* Список товаров */}
              <ProductSuggestions
                suggestions={suggestions}
                selectedId={selectedProduct?.id ?? null}
                onSelect={handleSelectProduct}
                isLoading={matchProductQuery.isLoading}
              />

              {/* Кнопка подтверждения */}
              {selectedProduct && (
                <Button onClick={handleConfirmSelection} className="w-full" size="lg">
                  Далее: заполнить форму
                </Button>
              )}
            </div>
          )}

          {/* Step: Form */}
          {step === "form" && selectedProduct && (
            <div className="space-y-6">
              {/* Выбранный товар */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-4">
                  <p className="mb-1 text-sm text-muted-foreground">Выбранный товар:</p>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {selectedProduct.sku}
                    </Badge>
                    <span className="font-medium">{selectedProduct.name}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Форма */}
              <Card>
                <CardHeader>
                  <CardTitle>Данные приёмки</CardTitle>
                  <CardDescription>Укажите количество и склад для приёмки</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && confirmationData && (
            <Card>
              <CardContent className="py-8">
                <IntakeConfirmation
                  data={confirmationData}
                  status={receiptStatus}
                  errorMessage={error ?? undefined}
                  onNewIntake={handleNewIntake}
                  onViewHistory={handleViewHistory}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
