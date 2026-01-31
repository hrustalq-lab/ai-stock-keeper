/**
 * BarcodeService — сервис распознавания штрих-кодов
 * Использует Quagga2 для декодирования EAN-13, Code128, Code39 и других форматов
 */

import Quagga, {
  type QuaggaJSResultObject_CodeResult,
  type QuaggaJSCodeReader,
} from "@ericblade/quagga2";

/**
 * Поддерживаемые форматы штрих-кодов
 */
export type BarcodeFormat =
  | "ean_13"
  | "ean_8"
  | "code_128"
  | "code_39"
  | "upc_a"
  | "upc_e"
  | "unknown";

/**
 * Результат распознавания штрих-кода
 */
export interface BarcodeResult {
  code: string;
  format: BarcodeFormat;
  confidence: number; // 0-100
}

/**
 * Конфигурация сканера
 */
export interface BarcodeScannerConfig {
  formats?: BarcodeFormat[];
  multiple?: boolean; // Искать несколько кодов
}

/**
 * Преобразование формата Quagga в наш формат
 */
function mapQuaggaFormat(format: string): BarcodeFormat {
  const formatMap: Record<string, BarcodeFormat> = {
    ean_reader: "ean_13",
    ean_8_reader: "ean_8",
    code_128_reader: "code_128",
    code_39_reader: "code_39",
    upc_reader: "upc_a",
    upc_e_reader: "upc_e",
  };
  return formatMap[format] ?? "unknown";
}

/**
 * Преобразование нашего формата в формат Quagga
 */
function mapToQuaggaReader(format: BarcodeFormat): string {
  const readerMap: Record<BarcodeFormat, string> = {
    ean_13: "ean_reader",
    ean_8: "ean_8_reader",
    code_128: "code_128_reader",
    code_39: "code_39_reader",
    upc_a: "upc_reader",
    upc_e: "upc_e_reader",
    unknown: "ean_reader",
  };
  return readerMap[format];
}

/**
 * Сервис распознавания штрих-кодов
 */
export class BarcodeService {
  private config: BarcodeScannerConfig;

  constructor(config: BarcodeScannerConfig = {}) {
    this.config = {
      formats: config.formats ?? ["ean_13", "code_128", "code_39"],
      multiple: config.multiple ?? false,
    };
  }

  /**
   * Распознать штрих-код из base64 изображения
   */
  async recognize(imageBase64: string): Promise<BarcodeResult | null> {
    const results = await this.recognizeMultiple(imageBase64);
    return results.length > 0 ? results[0]! : null;
  }

  /**
   * Распознать все штрих-коды на изображении
   */
  async recognizeMultiple(imageBase64: string): Promise<BarcodeResult[]> {
    // Убираем data URL prefix если есть
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Конфигурация Quagga для серверного использования
    const readers = (this.config.formats ?? ["ean_13"]).map(mapToQuaggaReader) as QuaggaJSCodeReader[];

    return new Promise((resolve) => {
      void Quagga.decodeSingle(
        {
          src: `data:image/jpeg;base64,${base64Data}`,
          numOfWorkers: 0, // Для Node.js без web workers
          inputStream: {
            size: 800, // Ограничиваем размер для производительности
          },
          decoder: {
            readers: readers,
            multiple: this.config.multiple ?? false,
          },
          locate: true, // Автопоиск области штрих-кода
        },
        (result) => {
          if (!result?.codeResult) {
            console.log("[Barcode] Штрих-код не найден");
            resolve([]);
            return;
          }

          // Обрабатываем одиночный результат
          const codeResult = result.codeResult;
          const barcodeResult: BarcodeResult = {
            code: codeResult.code ?? "",
            format: mapQuaggaFormat(codeResult.format ?? ""),
            confidence: this.calculateConfidence(codeResult),
          };

          console.log(
            `[Barcode] Распознан: ${barcodeResult.code} (${barcodeResult.format}, ${barcodeResult.confidence}%)`
          );

          resolve([barcodeResult]);
        }
      );
    });
  }

  /**
   * Рассчитать уверенность распознавания (0-100)
   */
  private calculateConfidence(codeResult: QuaggaJSResultObject_CodeResult): number {
    // Quagga возвращает массив decodedCodes с ошибками
    const decodedCodes = (codeResult as unknown as { decodedCodes?: Array<{ error?: number }> }).decodedCodes ?? [];

    if (!decodedCodes || decodedCodes.length === 0) {
      return 50; // Базовая уверенность
    }

    // Средняя ошибка декодирования (меньше = лучше)
    const errors = decodedCodes
      .filter((d): d is { error: number } => typeof d.error === "number")
      .map((d) => d.error);

    if (errors.length === 0) {
      return 70;
    }

    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;

    // Преобразуем ошибку в процент уверенности
    // Ошибка ~0.1 = 90%, ошибка ~0.3 = 70%, ошибка ~0.5 = 50%
    const confidence = Math.max(0, Math.min(100, (1 - avgError) * 100));

    return Math.round(confidence);
  }

  /**
   * Валидация контрольной суммы EAN-13
   */
  validateEAN13(code: string): boolean {
    if (code.length !== 13 || !/^\d+$/.test(code)) {
      return false;
    }

    // Алгоритм контрольной суммы EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]!, 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(code[12]!, 10);
  }

  /**
   * Настроить параметры сканера
   */
  configure(config: Partial<BarcodeScannerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Получить текущую конфигурацию
   */
  getConfig(): BarcodeScannerConfig {
    return { ...this.config };
  }
}

// Синглтон для использования во всем приложении
export const barcodeService = new BarcodeService();
