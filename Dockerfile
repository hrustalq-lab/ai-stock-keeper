# syntax=docker/dockerfile:1.4
# ============================================
# AI Stock Keeper - Production Dockerfile
# Multi-stage build с оптимизированным кешированием
# ============================================

# ============================================
# Stage 1: Dependencies (all)
# ============================================
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Копируем файлы зависимостей
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Устанавливаем все зависимости с кешированием npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# ============================================
# Stage 2: Production Dependencies
# ============================================
FROM node:24-alpine AS deps-prod
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Устанавливаем только production зависимости с кешированием npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --omit=dev

# ============================================
# Stage 3: Builder
# ============================================
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем приложение
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1

# Кешируем Next.js build cache
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Компилируем worker в JavaScript (bundle для production)
# Используем .cjs т.к. package.json имеет "type": "module"
RUN npx esbuild scripts/worker.ts --bundle --platform=node --target=node24 --outfile=dist/worker.cjs \
    --external:@prisma/client --external:pg --external:ioredis

# ============================================
# Stage 4: Runner (Production)
# ============================================
FROM node:24-alpine AS runner

WORKDIR /app

# Создаём non-root пользователя
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Устанавливаем runtime зависимости
RUN apk add --no-cache openssl

# Копируем необходимые файлы
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Копируем standalone output (Next.js app)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Копируем Prisma (schema + config)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Копируем скомпилированный worker
COPY --from=builder --chown=nextjs:nodejs /app/dist/worker.cjs ./worker.cjs

# Копируем production node_modules (для worker: pg, ioredis, prisma)
COPY --from=deps-prod /app/node_modules ./node_modules

# Регенерируем Prisma Client для текущей платформы
RUN npx prisma generate

# OCR language data (eng.traineddata, rus.traineddata) скачиваются
# автоматически tesseract.js при первом использовании OCR

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
