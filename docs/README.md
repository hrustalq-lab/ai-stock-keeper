# AI Stock Keeper Documentation

## Navigation by Role

| Role | Start Here | Then Read |
|------|-----------|-----------|
| **Project Manager** | [AI-STOCK-KEEPER-PLAN.md](./AI-STOCK-KEEPER-PLAN.md) | TOOLS-RESEARCH.md |
| **Developer (Phase 1)** | [PHASE-1.md](./PHASE-1.md) | INTEGRATION-TESTING-PLAN.md |
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

4. **[PHASE-1.md](./PHASE-1.md)** — Week-by-week implementation guide
   - Day-by-day breakdown (10 working days)
   - Complete code examples (PostgreSQL schema, 1C auth, webhooks)
   - Testing checklist & success criteria

5. **[INTEGRATION-TESTING-PLAN.md](./INTEGRATION-TESTING-PLAN.md)** — Test strategy & framework ✅
   - **Decision:** Keep tRPC + Next.js (no separate Express/NestJS needed for MVP)
   - Test pyramid: 60% unit, 30% integration, 10% E2E
   - Jest setup + example tests for 1C, webhooks, database
   - Mock vs real sandbox strategies
   - CI/CD (GitHub Actions) setup
   - When to consider Express/NestJS (>10K req/sec, microservices)

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
| Goods intake with AI recognition | Week 3-5 | Planning |
| Real-time inventory sync | Week 6-7 | Planning |
| Predictive stock alerts | Week 8-10 | Planning |
| Intelligent picking optimization | Week 11-13 | Planning |
| Multi-warehouse management | Week 14-15 | Planning |
| Mobile app | Week 16-18 | Planning |

## Next Steps

1. **Week 1:** Set up 1C sandbox, validate API connectivity
2. **Week 2:** Build core architecture (auth, sync, caching)
3. **Week 3:** Start Phase 2 - goods intake MVP

## File Structure

```
docs/
├── README.md (this file)
├── AI-STOCK-KEEPER-PLAN.md
└── TOOLS-RESEARCH.md
```
