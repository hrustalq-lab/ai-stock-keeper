# Integration Testing Plan

**Status:** Planning  
**Created:** 2026-01-31  
**Phase:** Phase 1 → Ongoing  

---

## Executive Summary

**Question:** Do we need Express/NestJS or can we test with tRPC?

**Answer:** **Stick with tRPC + Next.js API routes** for MVP.
- tRPC already provides end-to-end type safety
- Next.js API routes work fine for 1C integration
- Add separate integration module ONLY if we need:
  - Microservices (separate teams)
  - Different deployment cycles
  - Extreme scale (100K+ req/sec)

**Timeline:** Integration tests built during Phase 1 (weeks 1-2)

---

## 1. Testing Strategy Overview

### Test Pyramid (Recommended)

```
        ▲
       /|\
      / | \
     /  |  \  E2E Tests (10%)
    /   |   \  - Full flow via UI or API
   /    |    \
  /     |     \──────────────────────
 /      |      \
/       |       \  Integration Tests (30%)
/       |        \ - 1C API (sandbox)
/        |         \ - Database (real/test)
/         |          \ - Message queue
/          |           \
/           |            \─────────────────
/            |             \
/             |              \  Unit Tests (60%)
/              |               \ - Service functions
/               |                \ - Utils, helpers
/                |                 \ - Mocked dependencies
/                 |                  \
─────────────────────────────────────────
```

### Test Coverage Goals

| Layer | Coverage | Examples |
|-------|----------|----------|
| **Unit** | >90% | Auth functions, cache utils, formatters |
| **Integration** | >70% | 1C API client, DB operations, webhooks |
| **E2E** | >50% | User workflows (intake, picking, sync) |
| **Overall** | >80% | All layers combined |

---

## 2. Architecture Decision: tRPC vs Express/NestJS

### Option A: Keep tRPC + Next.js (RECOMMENDED) ✅

#### Pros
- ✅ Already set up, no additional framework
- ✅ Full-stack type safety (end-to-end)
- ✅ Can test via HTTP + programmatic calls
- ✅ Single deployment (frontend + backend together)
- ✅ Simpler test setup (same environment)

#### Cons
- ❌ Tightly coupled frontend/backend
- ❌ Harder to scale independently
- ❌ Can't use traditional API docs (tRPC is introspective)

#### When This Works
- MVP (Phase 1-3)
- Single team
- <5K req/sec load

#### Test Structure
```
src/
├── __tests__/
│   ├── integration/
│   │   ├── 1c-client.test.ts
│   │   ├── inventory-cache.test.ts
│   │   ├── webhooks.test.ts
│   │   └── api-routes.test.ts
│   ├── unit/
│   │   ├── services/
│   │   ├── utils/
│   │   └── formatters.test.ts
│   └── e2e/
│       └── workflows.test.ts
├── server/
│   └── services/
└── ...
```

---

### Option B: Separate Express/NestJS Module

#### When You'd Need This
- [ ] Team split (frontend / backend teams)
- [ ] Different deployment schedules
- [ ] Microservices architecture
- [ ] >10K req/sec on 1C sync layer
- [ ] Separate API documentation (Swagger/OpenAPI)
- [ ] Reusable API for multiple frontends

#### If You Choose This

**Architecture:**
```
ai-stock-keeper/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/app/
│   │   └── __tests__/e2e/
│   │
│   └── api/                    # Express/NestJS backend
│       ├── src/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── models/
│       │   └── __tests__/
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── shared/                     # Shared types & utils
│   └── types/
│
└── package.json (monorepo)
```

**Deployment:**
- Frontend: Vercel (web/)
- Backend: Heroku/Railway (api/)
- Separate versioning

**Tradeoff:** More infrastructure, but better scalability

---

## 3. Unit Tests (60% coverage)

### 3.1 Test Framework Setup

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev ts-jest @types/jest
```

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app/**',
    '!src/trpc/**',
  ],
};
```

### 3.2 Example Unit Tests

**src/server/services/__tests__/inventory-cache.test.ts:**
```typescript
import { InventoryCache } from '../inventory-cache';
import { redis } from '~/server/redis';
import { db } from '~/server/db';

jest.mock('~/server/redis');
jest.mock('~/server/db');

describe('InventoryCache', () => {
  let cache: InventoryCache;

  beforeEach(() => {
    cache = new InventoryCache();
    jest.clearAllMocks();
  });

  describe('getGood', () => {
    it('should return cached good from Redis', async () => {
      const mockGood = { sku: 'PROD-001', quantity: 100 };
      
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockGood));

      const result = await cache.getGood('PROD-001');

      expect(result).toEqual(mockGood);
      expect(redis.get).toHaveBeenCalledWith('goods:PROD-001');
    });

    it('should fallback to DB if cache miss', async () => {
      const mockGood = { sku: 'PROD-001', quantity: 100 };
      
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.inventory.findUnique as jest.Mock).mockResolvedValue(mockGood);

      const result = await cache.getGood('PROD-001');

      expect(result).toEqual(mockGood);
      expect(db.inventory.findUnique).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalled(); // Cache it
    });

    it('should return null if good not found', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.inventory.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await cache.getGood('NONEXISTENT');

      expect(result).toBeNull();
    });
  });
});
```

### 3.3 Unit Test Files to Create

| Service | Test File | Coverage |
|---------|-----------|----------|
| 1C Auth | `1c-auth.test.ts` | Auth flow, token refresh |
| Inventory Cache | `inventory-cache.test.ts` | Get, set, invalidate |
| Document Builder | `document-builder.test.ts` | GoodsReceipt formatting |
| Formatters | `formatters.test.ts` | Date, currency, SKU parsing |

---

## 4. Integration Tests (30% coverage)

### 4.1 Integration Test Strategy

**What to Test:**
1. tRPC router endpoints
2. 1C API client (with sandbox)
3. Database operations (with test DB)
4. Webhook receiver + processing
5. Cache invalidation flow

**Tools:**
```bash
npm install --save-dev @trpc/client supertest
npm install --save-dev testcontainers  # Optional: Docker containers
```

### 4.2 1C Sandbox Setup for Tests

**Option A: Mock 1C API (Fastest)**
```typescript
// tests/mocks/1c-client-mock.ts
export const mock1CClient = {
  getGoods: jest.fn().mockResolvedValue([
    { sku: 'PROD-001', name: 'Товар 1', quantity: 100 },
  ]),
  
  createGoodsReceipt: jest.fn().mockResolvedValue({
    id: 'doc-123',
    number: '00001',
    status: 'draft',
  }),
};
```

**Option B: Real 1C Sandbox (Most Realistic)**
```typescript
// .env.test
ONE_C_BASE_URL=https://1c-sandbox.example.com/api/v1
ONE_C_USERNAME=test_user
ONE_C_PASSWORD=test_password
ONE_C_WAREHOUSE_ID=test_warehouse

// tests/fixtures/setup.ts
export async function setupTestDatabase() {
  // Create test DB
  await db.query('CREATE DATABASE test_ai_stock_keeper');
  await runMigrations('test_ai_stock_keeper');
}

export async function setup1CSandbox() {
  // Verify connection to test 1C instance
  const auth = new Auth1C({
    baseUrl: process.env.ONE_C_BASE_URL,
    username: process.env.ONE_C_USERNAME,
    password: process.env.ONE_C_PASSWORD,
  });
  
  await auth.authenticate(); // Will throw if fail
}
```

### 4.3 Example Integration Tests

**src/server/api/__tests__/inventory.integration.test.ts:**
```typescript
import { createCallerFactory } from '~/server/api/trpc';
import { appRouter } from '~/server/api/root';
import { db } from '~/server/db';

describe('Inventory Router Integration', () => {
  let caller: ReturnType<typeof createCallerFactory>;

  beforeAll(async () => {
    // Setup test DB
    await db.$connect();
    caller = createCallerFactory(appRouter)({});
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    // Clear test data
    await db.inventory.deleteMany();
  });

  describe('getAll', () => {
    it('should return all goods from cache', async () => {
      // Insert test data
      await db.inventory.create({
        data: {
          sku: 'PROD-001',
          name: 'Товар 1',
          quantity: 100,
          warehouse: 'wh-main',
        },
      });

      // Call tRPC endpoint
      const goods = await caller.inventory.getAll();

      expect(goods).toHaveLength(1);
      expect(goods[0].sku).toBe('PROD-001');
    });
  });

  describe('createGoodsReceipt', () => {
    it('should create document in 1C and update local DB', async () => {
      // Mock 1C response
      jest.spyOn(client1C, 'createGoodsReceipt').mockResolvedValue({
        id: 'doc-123',
        number: '00001',
        status: 'draft',
      });

      // Call tRPC
      const result = await caller.inventory.createGoodsReceipt({
        items: [{ sku: 'PROD-001', qty: 50 }],
        warehouse: 'wh-main',
      });

      expect(result.id).toBe('doc-123');

      // Verify saved in local DB
      const saved = await db.documents1C.findUnique({
        where: { id: 'doc-123' },
      });
      expect(saved).toBeDefined();
    });

    it('should retry on 1C failure', async () => {
      // 1st call fails
      jest.spyOn(client1C, 'createGoodsReceipt')
        .mockRejectedValueOnce(new Error('1C timeout'))
        .mockResolvedValueOnce({ id: 'doc-123' });

      // Should retry and succeed
      const result = await caller.inventory.createGoodsReceipt({
        items: [{ sku: 'PROD-001', qty: 50 }],
        warehouse: 'wh-main',
      });

      expect(result.id).toBe('doc-123');
      expect(client1C.createGoodsReceipt).toHaveBeenCalledTimes(2);
    });
  });
});
```

**tests/integration/webhooks.integration.test.ts:**
```typescript
import { POST } from '~/app/api/webhooks/1c/route';

describe('1C Webhook Integration', () => {
  it('should process goods.updated webhook', async () => {
    const req = new Request('http://localhost/api/webhooks/1c', {
      method: 'POST',
      body: JSON.stringify({
        event: 'goods.updated',
        data: { sku: 'PROD-001', quantity: 150 },
      }),
    });

    const response = await POST(req as any);

    expect(response.status).toBe(200);

    // Verify queued
    const queued = await db.syncQueue.findFirst({
      where: { jobType: 'goods.updated' },
    });
    expect(queued).toBeDefined();
  });

  it('should reject invalid webhook signature', async () => {
    const req = new Request('http://localhost/api/webhooks/1c', {
      method: 'POST',
      headers: {
        'X-1C-Signature': 'invalid-sig',
      },
      body: JSON.stringify({ event: 'goods.updated' }),
    });

    // Should validate signature
    const response = await POST(req as any);

    expect(response.status).toBe(401);
  });
});
```

### 4.4 Integration Test Checklist

| Component | Test | Status |
|-----------|------|--------|
| **1C Auth** | Can authenticate & get token | |
| **Inventory Read** | Can fetch goods from 1C → Cache | |
| **Inventory Write** | Can create GoodsReceipt → 1C | |
| **Error Handling** | Retry on timeout, circuit breaker | |
| **Database** | Insert/update/query works | |
| **Redis** | Set/get, TTL, invalidation | |
| **Webhooks** | Receive, validate, queue events | |
| **Message Queue** | Process jobs, retry failures | |

---

## 5. E2E Tests (10% coverage)

### 5.1 Critical User Journeys

**Journey 1: Goods Intake**
```
1. Worker logs in
2. Scans barcode → OCR reads label
3. System matches product to 1C
4. Worker confirms
5. Document created in 1C
6. Inventory updated
7. Notification sent
```

**Journey 2: Real-Time Sync**
```
1. Manager opens dashboard
2. Warehouse updates quantity in 1C
3. Webhook fires from 1C
4. App processes webhook
5. Dashboard updates in real-time
6. Manager sees new quantity
```

### 5.2 E2E Test Framework

```bash
npm install --save-dev @playwright/test  # Or Cypress
```

**tests/e2e/intake.spec.ts:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Goods Intake Flow', () => {
  test('should complete intake and sync to 1C', async ({ page }) => {
    // 1. Navigate to app
    await page.goto('http://localhost:3000');

    // 2. Login
    await page.fill('[name="username"]', 'worker@test.com');
    await page.fill('[name="password"]', 'testpass');
    await page.click('button:has-text("Login")');

    // 3. Await redirect to intake page
    await expect(page).toHaveURL('/intake');

    // 4. Click "Scan Barcode"
    await page.click('button:has-text("Scan Barcode")');

    // 5. Mock barcode input (or use actual barcode scanner)
    await page.fill('[data-testid="barcode-input"]', 'PROD-001');
    await page.keyboard.press('Enter');

    // 6. Verify product matched
    await expect(page.locator('text=Товар 1')).toBeVisible();

    // 7. Fill quantity
    await page.fill('[name="quantity"]', '50');

    // 8. Submit
    await page.click('button:has-text("Confirm Intake")');

    // 9. Verify success message
    await expect(page.locator('text=Document created')).toBeVisible();

    // 10. Verify 1C was called (check API logs)
    const apiLogs = await page.context().storageState();
    // Or query test DB
    const doc = await db.documents1C.findFirst({
      where: { type: 'GoodsReceipt' },
      orderBy: { createdAt: 'desc' },
    });
    expect(doc).toBeDefined();
  });
});
```

---

## 6. Test Data & Fixtures

### 6.1 Fixture Organization

```
tests/fixtures/
├── 1c-responses/
│   ├── goods-list.json
│   ├── goods-receipt-response.json
│   └── error-responses.json
├── database/
│   ├── seed-goods.sql
│   ├── seed-transactions.sql
│   └── seed-documents.sql
└── builders/
    ├── inventory.builder.ts
    ├── document.builder.ts
    └── transaction.builder.ts
```

### 6.2 Test Data Builders

```typescript
// tests/fixtures/builders/inventory.builder.ts
export class InventoryBuilder {
  private data = {
    sku: 'PROD-001',
    name: 'Test Good',
    quantity: 100,
    warehouse: 'wh-main',
  };

  withSku(sku: string) {
    this.data.sku = sku;
    return this;
  }

  withQuantity(qty: number) {
    this.data.quantity = qty;
    return this;
  }

  build() {
    return this.data;
  }
}

// Usage in tests
const good = new InventoryBuilder()
  .withSku('PROD-002')
  .withQuantity(50)
  .build();
```

---

## 7. Mocking Strategy

### 7.1 Mock Levels

**Level 1: Function-level (fastest)**
```typescript
jest.mock('~/server/services/1c-client', () => ({
  client1C: {
    getGoods: jest.fn().mockResolvedValue([...]),
  },
}));
```

**Level 2: HTTP-level (more realistic)**
```typescript
// Using msw (Mock Service Worker)
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('https://1c-instance/api/v1/goods', (req, res, ctx) => {
    return res(ctx.json([{ sku: 'PROD-001', quantity: 100 }]));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Level 3: Full integration (real sandbox)**
```typescript
// Use real 1C test instance (slow but most realistic)
process.env.ONE_C_BASE_URL = 'https://test-1c-instance.com/api/v1';
```

### 7.2 When to Mock What

| Dependency | Mock? | Why |
|-----------|-------|-----|
| 1C API | ✅ Yes (fast) | For unit/integration tests, use real sandbox for E2E |
| PostgreSQL | ❓ Depends | Use test DB for integration, mock for unit |
| Redis | ✅ Yes | Slower than in-memory, mock for unit tests |
| External APIs | ✅ Yes | Weather, SMS, payment gateways |
| Message Queue | ❓ Depends | Mock for unit, real for integration |

---

## 8. CI/CD Integration

### 8.1 GitHub Actions Workflow

**`.github/workflows/test.yml`:**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: ai_stock_keeper_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm install

      - name: Run unit tests
        run: npm run test:unit
        env:
          NODE_ENV: test

      - name: Run integration tests
        run: npm run test:integration
        env:
          NODE_ENV: test
          DATABASE_URL: postgres://postgres:testpass@localhost:5432/ai_stock_keeper_test
          REDIS_URL: redis://localhost:6379

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          NODE_ENV: test
          BASE_URL: http://localhost:3000

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### 8.2 NPM Scripts

**package.json:**
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

---

## 9. Test Coverage Goals

### 9.1 Phase 1 Targets

| Metric | Target | Acceptable |
|--------|--------|-----------|
| **Line Coverage** | >80% | >70% |
| **Branch Coverage** | >75% | >65% |
| **Function Coverage** | >85% | >75% |
| **Statement Coverage** | >80% | >70% |

### 9.2 Coverage Reports

```bash
npm run test:coverage

# Generates:
# - coverage/lcov-report/index.html (visual report)
# - coverage/coverage-final.json (machine-readable)
```

---

## 10. Common Testing Patterns

### 10.1 Testing 1C API Failures

```typescript
describe('1C API Error Handling', () => {
  it('should retry on timeout', async () => {
    const client = new Client1C({ retries: 3 });
    
    jest.spyOn(client, 'request')
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({ success: true });

    const result = await client.getGoods();

    expect(result.success).toBe(true);
    expect(client.request).toHaveBeenCalledTimes(3);
  });

  it('should handle 409 Conflict (document exists)', async () => {
    const error = new ApiError('Document exists', 409);
    
    const result = await client.createGoodsReceipt(data);

    expect(result).toHaveProperty('existingId');
    // Don't fail, return existing ID
  });

  it('should circuit breaker after 5 failures', async () => {
    const client = new Client1C({ circuitBreaker: true });

    for (let i = 0; i < 6; i++) {
      jest.spyOn(client, 'request').mockRejectedValue(new Error('Fail'));
    }

    const result = await client.getGoods();

    expect(result).toThrow('Circuit breaker open');
  });
});
```

### 10.2 Testing Async Operations with Queues

```typescript
describe('Sync Queue Processing', () => {
  it('should process queued jobs in order', async () => {
    const queue = new Queue('1c-sync');
    const results = [];

    queue.process(async (job) => {
      results.push(job.data.id);
    });

    await queue.add({ id: 1 });
    await queue.add({ id: 2 });
    await queue.add({ id: 3 });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(results).toEqual([1, 2, 3]);
  });

  it('should retry failed jobs', async () => {
    const queue = new Queue('1c-sync');
    let attempts = 0;

    queue.process(async (job) => {
      attempts++;
      if (attempts < 3) throw new Error('Fail');
      return 'success';
    });

    const job = await queue.add({ id: 1 }, { attempts: 3 });
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(await job.getState()).toBe('completed');
    expect(attempts).toBe(3);
  });
});
```

---

## 11. Testing Without a Separate Integration Module

### Decision: Keep tRPC + Next.js

**Why it works:**
- tRPC is fundamentally an RPC layer on top of Next.js
- Tests can call tRPC routers directly (no HTTP needed)
- Same validation, same type safety
- Simpler than maintaining Express/NestJS

**Test approach:**
```typescript
// Instead of making HTTP requests
const response = await fetch('/trpc/inventory.getAll');

// You call the router directly
import { appRouter } from '~/server/api/root';
const result = await appRouter.inventory.getAll();

// Or use createCallerFactory for real HTTP tests
const caller = createCallerFactory(appRouter)({});
const result = await caller.inventory.getAll();
```

**When to migrate to Express/NestJS:**
- [ ] Need multiple frontend clients (web + mobile app)
- [ ] Backend team separate from frontend team
- [ ] API versioning becomes complex
- [ ] >50K requests/sec to sync layer
- [ ] Need standard OpenAPI/Swagger docs

---

## 12. Testing Roadmap

### Week 1-2 (Phase 1)
- [ ] Setup Jest + test framework
- [ ] Write unit tests for 1C auth module
- [ ] Write integration tests for tRPC endpoints
- [ ] Mock 1C API responses
- [ ] **Target:** >70% coverage

### Week 3-5 (Phase 2)
- [ ] Add OCR service unit tests
- [ ] Add integration tests for goods intake
- [ ] Setup test 1C sandbox
- [ ] **Target:** >75% coverage

### Week 6-10 (Phase 3-4)
- [ ] Add E2E tests for critical flows
- [ ] Add webhook testing
- [ ] Add predictive analytics tests
- [ ] **Target:** >80% coverage

### Week 11+ (Scale)
- [ ] Performance testing (load tests)
- [ ] Chaos engineering (failure injection)
- [ ] Security testing (OWASP top 10)
- [ ] **Target:** >85% coverage

---

## 13. Debugging Failed Tests

### 13.1 Common Issues & Solutions

**Issue:** 1C API timeout in tests
```typescript
// Increase timeout
jest.setTimeout(30000); // 30 sec

// Or skip in CI
if (process.env.CI) {
  test.skip('1C integration', () => { ... });
}
```

**Issue:** Database state bleeding between tests
```typescript
// Reset between tests
afterEach(async () => {
  await db.inventory.deleteMany();
  await db.transactions.deleteMany();
  // Clear all tables
});
```

**Issue:** Flaky tests (timing issues)
```typescript
// Use waitFor instead of setTimeout
await waitFor(() => {
  expect(element).toBeVisible();
}, { timeout: 5000 });
```

---

## 14. Final Recommendation

### Stick with tRPC + Next.js

**For Phase 1:**
```
src/
├── __tests__/
│   ├── unit/                      ← 60% of tests
│   │   ├── 1c-auth.test.ts
│   │   └── inventory-cache.test.ts
│   ├── integration/               ← 30% of tests
│   │   ├── 1c-client.test.ts
│   │   └── webhooks.test.ts
│   └── e2e/                       ← 10% of tests (Phase 3+)
└── ...
```

**No separate Express/NestJS needed** unless you hit the scaling requirements in Section 11.

**Timeline:** Days 1-2 of Phase 1 to set up test infrastructure, then ~20% of dev time writing tests.

---

## Next Steps

1. [ ] Create Jest config
2. [ ] Write first unit test (1C auth)
3. [ ] Setup GitHub Actions CI
4. [ ] Set coverage threshold (e.g., 70%)
5. [ ] Add pre-commit hook (`npm run test` before commit)

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-31  
**Owner:** Backend team (you)
