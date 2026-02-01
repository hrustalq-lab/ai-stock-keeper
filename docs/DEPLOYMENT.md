# AI Stock Keeper — Deployment Guide

## 📋 Содержание

- [Branching Strategy](#branching-strategy)
- [Environments](#environments)
- [GitHub Secrets](#github-secrets)
- [VPS Setup](#vps-setup)
- [Nginx Configuration](#nginx-configuration)
- [PM2 Setup](#pm2-setup)
- [Manual Deployment](#manual-deployment)
- [Rollback](#rollback)
- [SSL Certificates](#ssl-certificates)

---

## Branching & Versioning Strategy

Проект использует **Tag-based Release Flow** с SemVer версионированием:

```
┌─────────────────────────────────────────────────────────────────┐
│                     TAG-BASED RELEASE FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tags (Production Releases)                                      │
│  ═══════════════════════════                                     │
│                                                                  │
│  Pre-MVP (alpha):                                                │
│    v0.1.0-alpha.1 ──→ v0.1.0-alpha.2 ──→ v0.2.0-alpha.1 ──→ ... │
│                                                                  │
│  MVP Release:                                                    │
│    v1.0.0 ──→ v1.0.1 ──→ v1.1.0 ──→ v1.2.0 ──→ ...              │
│                                                                  │
│  All tags deploy to: ai-stock-keeper.hrustalq.dev               │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  dev ──●──●──●──●──●──●──●──●──●──●──●──●──→  Development       │
│        │  │  │  │     │  │                     ai-stock-keeper   │
│        │  │  │  │     │  └── feature/...      -dev.hrustalq.dev │
│        │  │  │  │     └── fix/...                               │
│        │  │  │  └── feature/forecast-api                        │
│        │  │  └── feature/picking-ui                             │
│        │  └── feature/alerts                                    │
│        └── feature/auth                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Versioning Schema (SemVer)

```
v{MAJOR}.{MINOR}.{PATCH}[-alpha.{N}]

Examples:
  v0.1.0-alpha.1   # First alpha release
  v0.1.0-alpha.2   # Bug fixes in alpha
  v0.2.0-alpha.1   # New features in alpha
  v0.3.0-alpha.1   # More features
  v1.0.0           # MVP Release! 🎉
  v1.0.1           # Patch after MVP
  v1.1.0           # Minor features
  v2.0.0           # Major version
```

| Stage | Version Pattern | Описание |
|-------|-----------------|----------|
| **Pre-MVP** | `v0.x.x-alpha.N` | Активная разработка, нестабильный API |
| **MVP** | `v1.0.0` | Первый стабильный релиз |
| **Post-MVP** | `v1.x.x+` | Стабильные релизы |

### Ветки

| Ветка | Назначение | Деплой |
|-------|-----------|--------|
| `dev` | Интеграционная ветка | Auto → `ai-stock-keeper-dev.hrustalq.dev` |
| `feature/*` | Новые фичи | PR → dev |
| `fix/*` | Исправления багов | PR → dev |
| Tags `v*` | Production релизы | Auto → `ai-stock-keeper.hrustalq.dev` |

### Workflow

1. **Feature Development**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/my-feature
   # ... работа над фичей ...
   git push origin feature/my-feature
   # Создать PR в dev
   ```

2. **Create Release (Alpha)**
   ```bash
   # Убедитесь что dev стабилен
   git checkout dev
   git pull origin dev
   
   # Создаём alpha-тег
   git tag -a v0.2.0-alpha.1 -m "Release v0.2.0-alpha.1: New features"
   git push origin v0.2.0-alpha.1
   # → Auto-deploy to production
   ```

3. **Create Release (MVP / Stable)**
   ```bash
   git checkout dev
   git pull origin dev
   
   # Создаём stable-тег
   git tag -a v1.0.0 -m "Release v1.0.0: MVP Release 🎉"
   git push origin v1.0.0
   # → Auto-deploy to production
   ```

4. **Hotfix**
   ```bash
   git checkout dev
   git checkout -b fix/critical-bug
   # ... исправление ...
   git push origin fix/critical-bug
   # PR в dev, затем новый тег с patch версией
   git tag -a v0.2.0-alpha.2 -m "Hotfix: critical bug"
   git push origin v0.2.0-alpha.2
   ```

---

## Environments

### Production

| Параметр | Значение |
|----------|----------|
| **URL** | `https://ai-stock-keeper.hrustalq.dev` |
| **Триггер** | Теги `v*` (любые версии, включая alpha) |
| **Директория** | `/opt/ai-stock-keeper` |
| **Database** | Внешний PostgreSQL |
| **Redis** | Внешний Redis сервер |

### Development

| Параметр | Значение |
|----------|----------|
| **URL** | `https://ai-stock-keeper-dev.hrustalq.dev` |
| **Триггер** | Push в `dev` |
| **Директория** | `/opt/ai-stock-keeper-dev` |
| **Database** | Отдельная dev БД |
| **Redis** | Отдельный Redis |

---

## GitHub Secrets

### Repository Secrets

Настройте в **Settings → Secrets and variables → Actions → Repository secrets**:

#### VPS Credentials

| Secret | Описание | Пример |
|--------|----------|--------|
| `VPS_HOST` | IP или домен VPS | `192.168.1.100` |
| `VPS_USERNAME` | SSH пользователь | `deploy` |
| `VPS_SSH_KEY` | Приватный SSH ключ | `-----BEGIN OPENSSH...` |
| `VPS_SSH_PORT` | SSH порт | `22` |

#### Project Paths

| Secret | Описание | Default |
|--------|----------|---------|
| `PROJECT_PATH_PROD` | Путь production | `/opt/ai-stock-keeper` |
| `PROJECT_PATH_DEV` | Путь development | `/opt/ai-stock-keeper-dev` |

### Полный список Repository Secrets

```
VPS_HOST              = your-vps-ip
VPS_USERNAME          = deploy
VPS_SSH_KEY           = -----BEGIN OPENSSH PRIVATE KEY-----...
VPS_SSH_PORT          = 22
PROJECT_PATH_PROD     = /opt/ai-stock-keeper
PROJECT_PATH_DEV      = /opt/ai-stock-keeper-dev
```

> **Note:** App secrets (DATABASE_URL, REDIS_URL, 1C credentials) хранятся в `.env` файлах на VPS, а не в GitHub Secrets.

---

## VPS Setup

### 1. Подготовка сервера

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Устанавливаем Docker Compose plugin
sudo apt install docker-compose-plugin

# Создаём директории проектов
sudo mkdir -p /opt/ai-stock-keeper
sudo mkdir -p /opt/ai-stock-keeper-dev
sudo chown $USER:$USER /opt/ai-stock-keeper /opt/ai-stock-keeper-dev

# Создаём директории для логов
sudo mkdir -p /var/log/nginx
sudo mkdir -p /var/log/pm2
```

### 2. Структура директорий

```
/opt/ai-stock-keeper/           # Production
├── docker-compose.prod.yml
├── .env
├── nginx/
│   ├── nginx.conf
│   ├── conf.d/
│   │   └── default.conf
│   ├── ssl/
│   │   ├── fullchain.pem
│   │   └── privkey.pem
│   └── logs/

/opt/ai-stock-keeper-dev/       # Development
├── docker-compose.prod.yml
├── .env
├── nginx/
│   ├── ...
```

### 3. Настройка .env файла

**Production** (`/opt/ai-stock-keeper/.env`):

```bash
# ============================================
# Production Environment
# ============================================

APP_VERSION=latest

# External Database
DATABASE_URL=postgresql://user:password@db-host:5432/ai_stock_keeper_prod

# External Redis
REDIS_URL=redis://redis-host:6379/0

# 1C Integration
ONE_C_BASE_URL=https://your-1c-server.com/api
ONE_C_USERNAME=api_user
ONE_C_PASSWORD=secure_password
ONE_C_WAREHOUSE_ID=warehouse_main
ONE_C_WEBHOOK_SECRET=your_webhook_secret_min_16_chars

# Email Notifications
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=alerts@hrustalq.dev

# Settings
ALERT_DEFAULT_COOLDOWN_MINS=60
ROUTE_OPTIMIZATION_ALGORITHM=nearest_neighbor
```

**Development** (`/opt/ai-stock-keeper-dev/.env`):

```bash
# ============================================
# Development Environment
# ============================================

APP_VERSION=dev

# External Database (separate dev DB)
DATABASE_URL=postgresql://user:password@db-host:5432/ai_stock_keeper_dev

# External Redis (separate namespace)
REDIS_URL=redis://redis-host:6379/1

# 1C Integration (mock or test server)
ONE_C_BASE_URL=http://localhost:3001/api/1c
ONE_C_USERNAME=admin
ONE_C_PASSWORD=dev_password
ONE_C_WAREHOUSE_ID=warehouse_dev
ONE_C_WEBHOOK_SECRET=dev_webhook_secret_16chars

# Email (disabled in dev)
RESEND_API_KEY=
RESEND_FROM_EMAIL=alerts@localhost
```

---

## Nginx Configuration

### Копирование конфигов

```bash
# Production
cd /opt/ai-stock-keeper
mkdir -p nginx/conf.d nginx/ssl nginx/logs

# Копируем из репозитория
cp nginx/nginx.conf nginx/
cp nginx/conf.d/default.conf nginx/conf.d/
```

### Настройка доменов

Файл `nginx/conf.d/default.conf` уже содержит конфигурацию для:
- `ai-stock-keeper.hrustalq.dev` (production)
- `ai-stock-keeper-dev.hrustalq.dev` (development)

### DNS записи

Добавьте A-записи в DNS:

```
ai-stock-keeper.hrustalq.dev     A    <VPS_IP>
ai-stock-keeper-dev.hrustalq.dev A    <VPS_IP>
```

---

## PM2 Setup

### Альтернатива Docker (Native PM2)

Если предпочитаете PM2 без Docker:

```bash
# Установка PM2
npm install -g pm2

# Копирование ecosystem.config.cjs
cp ecosystem.config.cjs /opt/ai-stock-keeper/
cp ecosystem.config.cjs /opt/ai-stock-keeper-dev/

# Запуск Production
cd /opt/ai-stock-keeper
pm2 start ecosystem.config.cjs --only ai-stock-keeper-prod,ai-stock-keeper-worker-prod

# Запуск Development
cd /opt/ai-stock-keeper-dev
pm2 start ecosystem.config.cjs --only ai-stock-keeper-dev,ai-stock-keeper-worker-dev

# Сохранение конфигурации
pm2 save
pm2 startup
```

### PM2 команды

```bash
# Статус
pm2 status

# Логи
pm2 logs ai-stock-keeper-prod
pm2 logs ai-stock-keeper-dev

# Перезапуск
pm2 restart ai-stock-keeper-prod
pm2 reload ai-stock-keeper-prod  # zero-downtime

# Мониторинг
pm2 monit
```

---

## SSL Certificates

### Let's Encrypt (Certbot)

```bash
# Установка certbot
sudo apt install certbot

# Получение сертификатов
sudo certbot certonly --standalone -d ai-stock-keeper.hrustalq.dev
sudo certbot certonly --standalone -d ai-stock-keeper-dev.hrustalq.dev

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/ai-stock-keeper.hrustalq.dev/fullchain.pem \
    /opt/ai-stock-keeper/nginx/ssl/
sudo cp /etc/letsencrypt/live/ai-stock-keeper.hrustalq.dev/privkey.pem \
    /opt/ai-stock-keeper/nginx/ssl/

# Автообновление
sudo certbot renew --dry-run
```

### Временные самоподписанные сертификаты

```bash
# Для тестирования
cd /opt/ai-stock-keeper/nginx/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/CN=ai-stock-keeper.hrustalq.dev"
```

---

## Manual Deployment

### Первый деплой

```bash
ssh user@vps

# Production
cd /opt/ai-stock-keeper

# Логинимся в GHCR
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Копируем конфиги
mkdir -p nginx/conf.d nginx/ssl nginx/logs
# ... копируем nginx конфиги и SSL сертификаты ...

# Пуллим образы
docker compose -f docker-compose.prod.yml pull

# Запускаем миграции
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# Запускаем сервисы
docker compose -f docker-compose.prod.yml up -d

# Проверяем статус
docker compose -f docker-compose.prod.yml ps
```

### Обновление

```bash
cd /opt/ai-stock-keeper

# Пуллим новую версию
docker compose -f docker-compose.prod.yml pull app worker

# Применяем миграции
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# Перезапускаем (zero-downtime)
docker compose -f docker-compose.prod.yml up -d --no-deps app worker

# Reload nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## Rollback

### Откат на предыдущую версию

```bash
cd /opt/ai-stock-keeper

# Смотрим доступные теги
docker images ghcr.io/hrustalq-lab/ai-stock-keeper

# Указываем конкретную версию
export APP_VERSION=v1.0.0

# Или по SHA
export APP_VERSION=sha-abc1234

# Перезапускаем
docker compose -f docker-compose.prod.yml up -d --no-deps app worker
```

---

## Monitoring

### Логи

```bash
# Все сервисы
docker compose -f docker-compose.prod.yml logs -f

# Только app
docker compose -f docker-compose.prod.yml logs -f app

# Nginx логи
tail -f /opt/ai-stock-keeper/nginx/logs/access.log
tail -f /opt/ai-stock-keeper/nginx/logs/error.log
```

### Healthcheck

```bash
# Статус контейнеров
docker compose -f docker-compose.prod.yml ps

# Тест endpoints
curl -f https://ai-stock-keeper.hrustalq.dev/health
curl -f https://ai-stock-keeper-dev.hrustalq.dev/health
```

### Ресурсы

```bash
# Использование ресурсов
docker stats
```

---

## Troubleshooting

### Контейнер не запускается

```bash
# Смотрим логи
docker compose -f docker-compose.prod.yml logs app

# Проверяем .env
cat .env | grep -v PASSWORD

# Проверяем подключение к БД
docker compose -f docker-compose.prod.yml run --rm app npx prisma db pull
```

### Nginx 502 Bad Gateway

```bash
# Проверяем что app запущен
docker compose -f docker-compose.prod.yml ps app

# Проверяем healthcheck
docker inspect ai-stock-keeper-app | jq '.[0].State.Health'

# Смотрим логи nginx
docker compose -f docker-compose.prod.yml logs nginx
```

### SSL проблемы

```bash
# Проверяем сертификаты
openssl x509 -in nginx/ssl/fullchain.pem -text -noout | head -20

# Тестируем SSL
openssl s_client -connect ai-stock-keeper.hrustalq.dev:443 -servername ai-stock-keeper.hrustalq.dev
```
