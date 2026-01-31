# AI Stock Keeper Documentation

## Navigation by Role

| Role | Start Here | Then Read |
|------|-----------|-----------|
| **Project Manager** | [AI-STOCK-KEEPER-PLAN.md](./AI-STOCK-KEEPER-PLAN.md) | TOOLS-RESEARCH.md |
| **Developer (Phase 1)** | [PHASE-1-COMPLETE.md](./PHASE-1-COMPLETE.md) | PHASE-2.md |
| **Developer (Phase 2)** | [PHASE-2.md](./PHASE-2.md) | TOOLS-RESEARCH.md (OCR section) |
| **QA / Testing** | [INTEGRATION-TESTING-PLAN.md](./INTEGRATION-TESTING-PLAN.md) | PHASE-1.md |
| **DevOps / Infra** | [TOOLS-RESEARCH.md](./TOOLS-RESEARCH.md) | INTEGRATION-TESTING-PLAN.md (CI/CD section) |
| **1C Integrator** | [1C-INTEGRATION-RESEARCH.md](./1C-INTEGRATION-RESEARCH.md) | PHASE-1.md (sections 1.5-1.6) |

---

## Quick Start

1. **[AI-STOCK-KEEPER-PLAN.md](./AI-STOCK-KEEPER-PLAN.md)** — Full implementation roadmap
   - Product vision, use cases, 20-week timeline
   - 8 phases from MVP to multi-warehouse management
   - Revenue model, GTM strategy, success metrics

2. **[TOOLS-RESEARCH.md](./TOOLS-RESEARCH.md)** — Technology stack decisions
   - 11 tool categories evaluated (OCR, barcode, forecasting, etc.)
   - Cost breakdown: $45/month (MVP) → $250-550/month (scale)
   - Implementation priority (must-have, should-have, nice-to-have)

3. **[1C-INTEGRATION-RESEARCH.md](./1C-INTEGRATION-RESEARCH.md)** — 1C API deep dive ⚡
   - REST API architecture & authentication methods
   - Document types (GoodsReceipt, Shipment, Transfer, etc.)
   - Webhook system & rate limits
   - Community resources & real examples
   - Risks & mitigations for Phase 1

4. **[PHASE-1.md](./PHASE-1.md)** — Phase 1 implementation guide (reference)
   - Day-by-day breakdown (10 working days)
   - Complete code examples (PostgreSQL schema, 1C auth, webhooks)
   - Testing checklist & success criteria

5. **[PHASE-1-COMPLETE.md](./PHASE-1-COMPLETE.md)** — Phase 1 завершён ✅
   - Что было создано (сервисы, API, тесты)
   - Как запустить и протестировать
   - NPM scripts reference

6. **[PHASE-2.md](./PHASE-2.md)** — Phase 2: Goods Intake with OCR 📋
   - Barcode scanning (Quagga.js)
   - OCR recognition (Tesseract.js)
   - Product matching (Fuse.js)
   - UI компоненты и страницы
   - Таймлайн: 2 недели

7. **[INTEGRATION-TESTING-PLAN.md](./INTEGRATION-TESTING-PLAN.md)** — Test strategy & framework
   - **Decision:** Keep tRPC + Next.js (no separate Express/NestJS needed for MVP)
   - Test pyramid: 60% unit, 30% integration, 10% E2E
   - Jest setup + example tests for 1C, webhooks, database
   - Mock vs real sandbox strategies
   - CI/CD (GitHub Actions) setup

## Architecture Overview

```
Frontend (T3 Stack)
├── Next.js + React + TypeScript
├── Tailwind CSS
├── tRPC (type-safe API)
└── Tesseract.js (OCR), Quagga.js (barcode)

Backend
├── PostgreSQL (inventory, transactions)
├── Redis (cache, real-time)
├── Bull (async 1C sync queue)
├── Prophet (forecasting microservice)
└── Google Vision API (production OCR)

Integration
└── 1C ERP (REST API, webhooks)
```

## Key Use Cases

| Use Case | Timeline | Status |
|----------|----------|--------|
| Core architecture (1C integration) | Week 1-2 | ✅ Complete |
| Goods intake with AI recognition | Week 3-5 | 📋 Planning |
| Real-time inventory sync | Week 6-7 | ⬜ Pending |
| Predictive stock alerts | Week 8-10 | ⬜ Pending |
| Intelligent picking optimization | Week 11-13 | ⬜ Pending |
| Multi-warehouse management | Week 14-15 | ⬜ Pending |
| Mobile app | Week 16-18 | ⬜ Pending |

## Current Phase

**Phase 2: Goods Intake with OCR** — [PHASE-2.md](./PHASE-2.md)

| Блок | Описание | Статус |
|------|----------|--------|
| Блок 1 | Библиотеки и сервисы | ⬜ |
| Блок 2 | UI компоненты | ⬜ |
| Блок 3 | Backend API | ⬜ |
| Блок 4 | Страницы | ⬜ |
| Блок 5 | Тестирование | ⬜ |

## File Structure

```
docs/
├── README.md                    # Навигация (этот файл)
├── AI-STOCK-KEEPER-PLAN.md      # Общий план проекта
├── TOOLS-RESEARCH.md            # Исследование технологий
├── 1C-INTEGRATION-RESEARCH.md   # Исследование 1C API
├── PHASE-1.md                   # План Phase 1 (reference)
├── PHASE-1-COMPLETE.md          # Phase 1 — завершён ✅
├── PHASE-2.md                   # Phase 2 — текущий 📋
└── INTEGRATION-TESTING-PLAN.md  # Стратегия тестирования
```
