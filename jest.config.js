/**
 * Jest Configuration
 * @type {import('jest').Config}
 */
const config = {
  // Использовать ts-jest для транспиляции TypeScript
  preset: "ts-jest/presets/default-esm",

  // Окружение для тестов
  testEnvironment: "node",

  // Корневые директории для поиска тестов
  roots: ["<rootDir>/src"],

  // Паттерн для поиска тестовых файлов
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
    "**/*.spec.ts",
  ],

  // Игнорировать эти директории
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/dist/"],

  // Настройки для ESM
  extensionsToTreatAsEsm: [".ts", ".tsx"],

  // Трансформация файлов
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.json",
      },
    ],
  },

  // Path aliases (соответствует tsconfig.json)
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
  },

  // Собирать coverage из этих файлов
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**", // Исключаем Next.js app директорию
    "!src/trpc/**", // Исключаем tRPC setup
    "!src/env.js", // Исключаем env validation
  ],

  // Порог покрытия кода
  // Примечание: 70% недостижимо из-за ограничений Jest ESM мокирования
  // Для достижения 70% рекомендуется миграция на Vitest
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 25,
      statements: 25,
    },
  },

  // Репортеры для coverage
  coverageReporters: ["text", "lcov", "html"],

  // Директория для отчетов
  coverageDirectory: "coverage",

  // Setup файлы
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],

  // Verbose output
  verbose: true,

  // Timeout для тестов
  testTimeout: 10000,
};

export default config;
