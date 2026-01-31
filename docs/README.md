# AI Stock Keeper Documentation

## Quick Start

1. **[AI-STOCK-KEEPER-PLAN.md](./AI-STOCK-KEEPER-PLAN.md)** — Full implementation roadmap
   - Product vision, use cases, 20-week timeline
   - 8 phases from MVP to multi-warehouse management
   - Revenue model, GTM strategy, success metrics

2. **[TOOLS-RESEARCH.md](./TOOLS-RESEARCH.md)** — Technology stack decisions
   - 11 tool categories evaluated (OCR, barcode, forecasting, etc.)
   - Cost breakdown: $45/month (MVP) → $250-550/month (scale)
   - Implementation priority (must-have, should-have, nice-to-have)

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
