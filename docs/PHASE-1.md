# Phase 1: Core Architecture (Weeks 1-2)

**Goal:** Validate 1C integration, set up project structure  
**Timeline:** 2 weeks (10 working days)  
**Deliverable:** Working connection to 1C, can read/write documents

---

## 1.1 Study 1C API & Sandbox Setup (Days 1-2)

### 1.1.1 1C API Research
**Tasks:**
- [ ] Visit https://1c.ru/developers/ and download SDK
- [ ] Study "1C:Enterprise REST API" documentation
- [ ] Explore 1C:Cloud API (if available)
- [ ] Review authentication methods:
  - [ ] Basic Auth (username/password)
  - [ ] OAuth 2.0
  - [ ] Certificate-based auth
  - [ ] API key
- [ ] Document rate limits, response formats, error codes
- [ ] Create `docs/1C-API-REFERENCE.md` with findings

**Resources:**
- Official: https://1c.ru/
- Community: https://habr.com/ru/hub/1c/ (search "REST API")
- Stack Overflow: Tag `1c-enterprise`

### 1.1.2 Set Up 1C Sandbox
**Options:**
1. **1C:Cloud** (free trial) → Easiest, no setup needed
2. **Docker 1C** → `docker run 1c-enterprise` (if available)
3. **VirtualBox + 1C Demo** → Most realistic, more setup

**Action:**
- [ ] Sign up for 1C:Cloud free trial or download 1C:Enterprise demo
- [ ] Create test database "ai_stock_keeper_dev"
- [ ] Add sample goods with SKUs
- [ ] Document sandbox credentials in `.env.example`

---

## 1.2 Design API Schema (Day 2)

### 1.2.1 Core Data Models

```typescript
// Inventory (1C Goods)
interface Goods {
  id: string;           // 1C internal ID
  sku: string;          // Product code
  name: string;         // Product name (Cyrillic)
  quantity: number;     // Current stock
  warehouse: string;    // Warehouse ID
  reorderPoint: number; // Alert threshold
  supplier: string;     // Supplier reference
  lastUpdated: Date;    // Last sync from 1C
}

// Transactions (Movements)
interface Transaction {
  id: string;
  type: 'intake' | 'picking' | 'transfer' | 'adjustment';
  sku: string;
  quantity: number;
  fromWarehouse?: string;
  toWarehouse?: string;
  documentId: string;   // 1C document reference
  syncedWith1C: boolean;
  createdAt: Date;
  syncedAt?: Date;
}

// 1C Document References
interface Document1C {
  type: 'GoodsReceipt' | 'Shipment' | 'Transfer' | 'Adjustment';
  number: string;       // Document number in 1C
  date: Date;
  warehouse: string;
  items: Array<{
    sku: string;
    quantity: number;
    unitPrice?: number;
  }>;
  status: 'draft' | 'posted' | 'processed';
}
```

### 1.2.2 1C Integration Endpoints

**Read from 1C:**
```
GET /1c/goods
  Query: ?warehouse=wh1&limit=100
  Returns: Goods[]

GET /1c/goods/{sku}
  Returns: Goods

GET /1c/transactions
  Query: ?from=2026-01-01&to=2026-01-31
  Returns: Transaction[]
```

**Write to 1C:**
```
POST /1c/goods-receipt
  Body: { items: Array<{ sku, qty }>, warehouse }
  Returns: { documentId, number, status }

POST /1c/shipment
  Body: { orderNum, items }
  Returns: { documentId }

POST /1c/transfer
  Body: { from, to, items }
  Returns: { documentId }
```

**Sync & Webhooks:**
```
GET /1c/sync/status
  Returns: { lastSync: Date, itemsInQueue: number }

POST /webhook/1c
  Receives: Events from 1C (goods updated, document posted)
  Queues: For processing
```

---

## 1.3 Set Up Database (Day 2-3)

### 1.3.1 PostgreSQL Schema

```sql
-- Inventory cache (synced from 1C)
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  warehouse VARCHAR(50) NOT NULL,
  reorder_point INT DEFAULT 10,
  supplier VARCHAR(100),
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_1c_update TIMESTAMP,
  UNIQUE(sku, warehouse)
);

-- Local transactions (before sync to 1C)
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- intake, picking, transfer, adjustment
  sku VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  from_warehouse VARCHAR(50),
  to_warehouse VARCHAR(50),
  document_id VARCHAR(100),    -- 1C document reference
  synced_with_1c BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1C document references
CREATE TABLE documents_1c (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,  -- GoodsReceipt, Shipment, Transfer
  doc_number VARCHAR(50) NOT NULL,
  doc_date TIMESTAMP,
  warehouse VARCHAR(50),
  status VARCHAR(20),  -- draft, posted, processed
  sync_attempt INT DEFAULT 0,
  last_sync_error TEXT,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50),
  record_id VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  user_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync queue (for Bull job queue)
CREATE TABLE sync_queue (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse);
CREATE INDEX idx_transactions_sku ON transactions(sku);
CREATE INDEX idx_transactions_synced ON transactions(synced_with_1c);
CREATE INDEX idx_documents_1c_number ON documents_1c(doc_number);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
```

### 1.3.2 Set Up Local Database

**Install PostgreSQL:**
```bash
# macOS
brew install postgresql@15

# Linux
sudo apt-get install postgresql-15

# Docker (recommended for dev)
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=ai_stock_keeper \
  -p 5432:5432 \
  -d postgres:15
```

**Create database:**
```bash
createdb -U postgres ai_stock_keeper

# Or from psql
psql -U postgres
CREATE DATABASE ai_stock_keeper;
```

**Run migrations:**
- [ ] Save SQL above as `migrations/001-initial-schema.sql`
- [ ] Run: `psql ai_stock_keeper < migrations/001-initial-schema.sql`

---

## 1.4 Set Up Redis (Day 3)

**Install Redis:**
```bash
# macOS
brew install redis

# Docker
docker run --name redis-dev -p 6379:6379 -d redis:7

# Start locally
redis-server
```

**Test connection:**
```bash
redis-cli
> PING
PONG
```

---

## 1.5 Build 1C Authentication Module (Days 3-4)

### 1.5.1 Auth Service

Create `src/server/services/1c-auth.ts`:

```typescript
interface 1CConfig {
  baseUrl: string;        // e.g., https://1c-cloud.ru/api/v1
  username: string;
  password: string;
  // OR
  apiKey: string;
  // OR
  certificatePath: string;
  keyPath: string;
}

export class Auth1C {
  private config: 1CConfig;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: 1CConfig) {
    this.config = config;
  }

  async authenticate(): Promise<string> {
    // Check if token still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get new token
    const response = await fetch(`${this.config.baseUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
      }),
    });

    if (!response.ok) throw new Error('1C auth failed');

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.tokenExpiry = new Date(Date.now() + (data.expiresIn * 1000));

    return this.accessToken;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.authenticate();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
}
```

### 1.5.2 Environment Setup

Create/update `.env.local`:
```
# 1C Configuration
ONE_C_BASE_URL=https://1c-cloud.example.com/api/v1
ONE_C_USERNAME=your_username
ONE_C_PASSWORD=your_password
ONE_C_WAREHOUSE_ID=warehouse_main

# Database
DATABASE_URL=postgresql://postgres:dev_password@localhost:5432/ai_stock_keeper

# Redis
REDIS_URL=redis://localhost:6379

# Bull Queue
BULL_QUEUE_NAME=1c-sync-queue
```

Update `.env.example`:
```
ONE_C_BASE_URL=https://1c-cloud.example.com/api/v1
ONE_C_USERNAME=change_me
ONE_C_PASSWORD=change_me
ONE_C_WAREHOUSE_ID=warehouse_main
DATABASE_URL=postgresql://user:password@localhost:5432/ai_stock_keeper
REDIS_URL=redis://localhost:6379
```

---

## 1.6 Build Inventory Cache Layer (Days 4-5)

### 1.6.1 Cache Service

Create `src/server/services/inventory-cache.ts`:

```typescript
import { db } from '~/server/db';
import { redis } from '~/server/redis';

export class InventoryCache {
  private CACHE_TTL = 5 * 60; // 5 minutes

  async getGood(sku: string): Promise<Goods | null> {
    // Try Redis first
    const cached = await redis.get(`goods:${sku}`);
    if (cached) return JSON.parse(cached);

    // Fall back to DB
    const goods = await db.inventory.findUnique({ where: { sku } });
    if (goods) {
      await redis.setex(`goods:${sku}`, this.CACHE_TTL, JSON.stringify(goods));
    }
    return goods;
  }

  async getAllGoods(warehouse?: string): Promise<Goods[]> {
    const goods = await db.inventory.findMany({
      where: warehouse ? { warehouse } : {},
    });
    return goods;
  }

  async updateCache(goods: Goods): Promise<void> {
    // Update DB
    await db.inventory.upsert({
      where: { sku: goods.sku },
      update: goods,
      create: goods,
    });

    // Invalidate Redis cache
    await redis.del(`goods:${goods.sku}`);

    // Publish event for real-time sync
    await redis.publish('inventory:updated', JSON.stringify(goods));
  }

  async syncFromOnEc(items: Goods[]): Promise<void> {
    // Bulk insert/update from 1C
    for (const item of items) {
      await this.updateCache(item);
    }
  }
}
```

### 1.6.2 Initial Sync

Create `scripts/sync-1c-initial.ts`:

```typescript
import { db } from '~/server/db';
import { client1C } from '~/server/services/1c-client';

async function syncInitial() {
  console.log('Starting initial 1C sync...');
  
  const goods = await client1C.getGoods();
  console.log(`Fetched ${goods.length} items from 1C`);

  // Insert into DB
  for (const item of goods) {
    await db.inventory.upsert({
      where: { sku: item.sku },
      update: item,
      create: item,
    });
  }

  console.log('Initial sync complete');
}

syncInitial().catch(console.error);
```

---

## 1.7 Build Webhook Receiver (Day 5)

### 1.7.1 Webhook Endpoint

Create `src/app/api/webhooks/1c/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '~/server/redis';
import { db } from '~/server/db';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    console.log('[1C Webhook]', payload.event, payload.data);

    // Validate webhook signature (if 1C sends one)
    // const isValid = validateSignature(req, payload);
    // if (!isValid) return NextResponse.json({ ok: false }, { status: 401 });

    // Queue for processing
    await db.syncQueue.create({
      data: {
        jobType: payload.event,
        payload: payload.data,
        status: 'pending',
      },
    });

    // Publish to Redis for real-time listeners
    await redis.publish('1c:webhook', JSON.stringify(payload));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[1C Webhook Error]', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

### 1.7.2 Webhook Processor

Create `src/server/workers/process-webhook.ts`:

```typescript
import { db } from '~/server/db';
import { inventoryCache } from '~/server/services/inventory-cache';

export async function processWebhook(event: string, data: unknown) {
  switch (event) {
    case 'goods.updated':
      // Sync updated goods
      await inventoryCache.updateCache(data);
      break;

    case 'document.posted':
      // Document posted in 1C, update transaction status
      await handleDocumentPosted(data);
      break;

    default:
      console.warn('Unknown webhook event:', event);
  }
}

async function handleDocumentPosted(data: any) {
  const { documentId, type, items } = data;

  // Update document status
  await db.documents1C.update({
    where: { id: documentId },
    data: { status: 'posted', syncedAt: new Date() },
  });

  // Update inventory if needed
  if (type === 'GoodsReceipt') {
    for (const item of items) {
      const goods = await db.inventory.findUnique({
        where: { sku: item.sku },
      });
      if (goods) {
        await db.inventory.update({
          where: { sku: item.sku },
          data: { quantity: goods.quantity + item.quantity },
        });
      }
    }
  }
}
```

---

## 1.8 Create API Routes (Days 5-6)

### 1.8.1 tRPC Router for 1C Operations

Create `src/server/api/routers/inventory.ts`:

```typescript
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { z } from 'zod';
import { inventoryCache } from '~/server/services/inventory-cache';
import { client1C } from '~/server/services/1c-client';

export const inventoryRouter = createTRPCRouter({
  getAll: publicProcedure
    .query(async () => {
      return await inventoryCache.getAllGoods();
    }),

  getBySkus: publicProcedure
    .input(z.object({ skus: z.array(z.string()) }))
    .query(async ({ input }) => {
      const goods = await Promise.all(
        input.skus.map(sku => inventoryCache.getGood(sku))
      );
      return goods.filter(Boolean);
    }),

  createGoodsReceipt: publicProcedure
    .input(z.object({
      items: z.array(z.object({ sku: z.string(), qty: z.number() })),
      warehouse: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Create document in 1C
      const result = await client1C.createGoodsReceipt(input);
      
      // Store reference locally
      // Update inventory
      
      return result;
    }),

  getSyncStatus: publicProcedure
    .query(async () => {
      const queue = await db.syncQueue.findMany({
        where: { status: 'pending' },
      });
      return { 
        queued: queue.length,
        lastSync: new Date(),
      };
    }),
});
```

Update root router:
```typescript
export const appRouter = createTRPCRouter({
  inventory: inventoryRouter,
});
```

---

## 1.9 Testing Checklist (Day 6)

### 1C Connection
- [ ] Can authenticate to 1C API
- [ ] Can fetch goods list
- [ ] Can create goods receipt document
- [ ] Document appears in 1C interface

### Database
- [ ] PostgreSQL running and accessible
- [ ] Schema created successfully
- [ ] Can insert/query inventory

### Redis
- [ ] Redis running
- [ ] Can store/retrieve cache
- [ ] Pub/sub working

### API
- [ ] `GET /trpc/inventory.getAll` returns goods
- [ ] `POST /trpc/inventory.createGoodsReceipt` creates document
- [ ] `POST /api/webhooks/1c` receives and queues events
- [ ] Sync status shows queue depth

### Integration
- [ ] Update 1C goods → Cache updated within 5 seconds
- [ ] Create local transaction → Syncs to 1C
- [ ] 1C webhook → Local DB updated

---

## 1.10 Documentation (Day 6)

Create `docs/PHASE-1-COMPLETE.md`:
- [ ] What was built
- [ ] How to test
- [ ] Known issues
- [ ] Next phase tasks

---

## Files to Create/Update

```
src/
├── server/
│   ├── services/
│   │   ├── 1c-auth.ts
│   │   ├── 1c-client.ts
│   │   └── inventory-cache.ts
│   ├── workers/
│   │   └── process-webhook.ts
│   ├── api/
│   │   └── routers/
│   │       └── inventory.ts
│   └── db/
│       └── schema.ts (Prisma or Drizzle schema)
├── app/
│   └── api/
│       ├── webhooks/
│       │   └── 1c/route.ts
│       └── sync/
│           └── status/route.ts
└── trpc/
    └── react.tsx

migrations/
├── 001-initial-schema.sql
└── 002-add-indexes.sql

scripts/
├── sync-1c-initial.ts
└── run-migrations.sh

docs/
├── 1C-API-REFERENCE.md
├── PHASE-1.md (this file)
└── PHASE-1-COMPLETE.md

.env.local
.env.example
```

---

## Success Criteria

✅ Phase 1 is complete when:
1. Connected to 1C sandbox successfully
2. Can read goods from 1C API
3. Can write goods receipt documents to 1C
4. Inventory cache layer working (Redis + PostgreSQL)
5. Webhook receiver processing 1C events
6. All 4 API endpoints tested and working
7. Documentation complete

---

## Issues & Blockers

If you encounter issues:

1. **1C API not documented:**
   → Contact 1C support or use community resources
   → Try reverse-engineering API calls from official client

2. **Authentication failure:**
   → Check credentials in `.env.local`
   → Review 1C documentation on auth methods

3. **Database errors:**
   → Run migrations in correct order
   → Check PostgreSQL logs

4. **Webhook not firing:**
   → Verify webhook URL in 1C settings
   → Check firewall/network accessibility
   → Log all incoming requests

---

## What's Next (Phase 2)

Once Phase 1 complete:
- [ ] Start building OCR intake (Tesseract.js)
- [ ] Build product matching (Fuse.js)
- [ ] Create intake UI component
- [ ] End-to-end testing

---

**Start Date:** 2026-02-03 (Monday)  
**End Date:** 2026-02-14 (Friday)  
**Status:** Ready to begin ⚡
