# ============================================
# AI Stock Keeper - Production Dockerfile
# Multi-stage build для оптимального размера образа
# ============================================

# ============================================
# Stage 1: Dependencies (all)
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Копируем файлы зависимостей
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Устанавливаем все зависимости
RUN npm ci --legacy-peer-deps

# ============================================
# Stage 2: Production Dependencies
# ============================================
FROM node:20-alpine AS deps-prod
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Устанавливаем только production зависимости
RUN npm ci --legacy-peer-deps --omit=dev

# ============================================
# Stage 3: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем приложение
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Компилируем worker в JavaScript (bundle для production)
# Используем .cjs т.к. package.json имеет "type": "module"
RUN npx esbuild scripts/worker.ts --bundle --platform=node --target=node20 --outfile=dist/worker.cjs \
    --external:@prisma/client --external:pg --external:ioredis

# ============================================
# Stage 4: Runner (Production)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Создаём non-root пользователя
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Устанавливаем runtime зависимости
RUN apk add --no-cache openssl

# Копируем необходимые файлы
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Копируем standalone output (Next.js app)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Копируем Prisma
COPY --from=builder /app/prisma ./prisma

# Копируем скомпилированный worker
COPY --from=builder --chown=nextjs:nodejs /app/dist/worker.cjs ./worker.cjs

# Копируем production node_modules (для worker: pg, ioredis, prisma)
COPY --from=deps-prod /app/node_modules ./node_modules

# Регенерируем Prisma Client для текущей платформы
RUN npx prisma generate

# Копируем OCR language data
COPY --from=builder /app/eng.traineddata ./eng.traineddata
COPY --from=builder /app/rus.traineddata ./rus.traineddata

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
