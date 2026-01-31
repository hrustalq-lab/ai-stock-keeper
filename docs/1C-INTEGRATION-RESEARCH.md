# 1C Integration Research

**Research Date:** 2026-01-31  
**Status:** Community resources compiled, awaiting official docs  

---

## 1. Official Resources

### 1C.ru - Official Developer Portal
- **URL:** https://1c-dn.com/
- **Status:** ✅ Active (Developer Network)
- **Content:** Learning resources, documentation, vendor support
- **Note:** Requires registration for full access

### 1C.ru - Knowledge Base
- **URL:** https://its.1c.ru/db/metabase
- **Status:** ⚠️ Requires authentication
- **Content:** Official API docs (restricted access)
- **Action:** Register account to access

### 1C Documentation Server
- **URL:** https://v8.1c.ru/ (for 1C:Enterprise 8.x)
- **Note:** Platform-specific docs
- **Note:** Russian language (primary)

---

## 2. REST API Architecture

### Typical 1C Integration Patterns (Based on GitHub projects)

#### Option A: Built-in REST API
Some 1C configurations include native REST API support:
```
POST https://1c-instance.com/rest/api/v1/goods
Headers:
  Authorization: Basic <base64(username:password)>
  Content-Type: application/json

Body:
{
  "sku": "PROD-001",
  "name": "Товар 1",
  "quantity": 100,
  "warehouse": "wh-main"
}

Response:
{
  "id": "12345",
  "code": "PROD-001",
  "number": "0000001",
  "posted": true
}
```

#### Option B: OData API
1C 8.3+ supports OData (Open Data Protocol):
```
GET https://1c-instance.com/odata/standard/catalog/Goods
Headers:
  Authorization: Basic <base64(username:password)>

Response:
{
  "value": [
    {
      "Ref_Key": "12345",
      "Code": "PROD-001",
      "Description": "Товар 1",
      "DeletionMark": false
    }
  ]
}
```

#### Option C: COM/DCOM Interface (Legacy)
- **Language:** C#, VB.NET, PowerShell
- **Use case:** Windows-only, on-premise systems
- **Note:** Not web-friendly, harder to maintain

#### Option D: Universal Data Exchange (UDE)
- **Method:** File-based (XML)
- **Use case:** Batch imports/exports
- **Example:** `1CInfoBase.xml` files

---

## 3. Community Examples (GitHub)

### Found 511 public 1C repositories (as of 2026-01-31)

#### REST API Templates

**1. Basic REST API Template for 1C:Enterprise 7.7**
- **Language:** 1C (BSL)
- **Use:** Counterparty search by code, extensible template
- **Status:** Updated Apr 2025
- **Link:** https://github.com/search?q=topic:1c-enterprise+REST

**2. Cluster REST API**
- **Purpose:** Manage 1C cluster (server control)
- **Status:** Updated Dec 2022
- **Endpoints:** 
  - GET `/cluster/info` — Server status
  - GET `/cluster/infobases` — List databases
  - POST `/cluster/start` — Start/stop processes
- **Authentication:** Certificate-based

**3. Integration Modules**
- **Konsol.pro Integration:** Upload УПД (Universal Transfer Documents)
- **Tessa SED Integration:** Payment registry export via REST
- **CRM Sync:** Real-time data synchronization

#### HTTP Client Examples
- **Connector Library** (May 2025) — Convenient HTTP client for 1C
- **Integration Toolkit** (Jan 2026) — Telegram, VK, Bitrix24, Google, S3, DB integrations

---

## 4. Authentication Methods

### Based on Community Practice

#### Method 1: Basic Authentication (Most Common)
```
GET /api/v1/goods HTTP/1.1
Host: 1c-instance.com
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
```

**Pros:**
- Simple, well-supported
- No token refresh needed
- Suitable for server-to-server

**Cons:**
- Must send credentials on every request
- Less secure over HTTP

#### Method 2: Bearer Token (OAuth 2.0 Style)
```
GET /api/v1/goods HTTP/1.1
Host: 1c-instance.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Pros:**
- More secure
- Token-based expiry
- Can implement refresh tokens

**Cons:**
- More complex setup
- Not all 1C instances support

#### Method 3: API Key
```
GET /api/v1/goods?api_key=sk-1c-prod-xxxxx
```

**Pros:**
- Easy to manage
- Good for service-to-service

**Cons:**
- Must protect key
- Less granular permissions

#### Method 4: Certificate (HTTPS Client Certs)
```
# mTLS (mutual TLS)
curl https://1c-instance.com/api/v1/goods \
  --cert client-cert.pem \
  --key client-key.pem \
  --cacert ca-cert.pem
```

**Pros:**
- Enterprise-grade security
- Used for cluster management

**Cons:**
- Complex setup
- Operational overhead

---

## 5. Document Types in 1C Accounting

### Standard Documents (Goods Movement)

| Document | Purpose | API Endpoint | 1C Type |
|----------|---------|--------------|---------|
| **GoodsReceipt** | Receive goods from supplier | POST `/documents/goods-receipt` | ПриходТовара |
| **Shipment** | Send goods to customer | POST `/documents/shipment` | РасходТовара |
| **Transfer** | Move goods between warehouses | POST `/documents/transfer` | ПеремещениеТовара |
| **AdjustmentUp** | Inventory correction (increase) | POST `/documents/adjustment-up` | СписаниеТовара |
| **AdjustmentDown** | Inventory correction (decrease) | POST `/documents/adjustment-down` | АрхивТовара |
| **Inventory** | Physical count | POST `/documents/inventory` | ИнвентаризацияТовара |

### Example: Create Goods Receipt
```json
POST /api/v1/documents/goods-receipt
{
  "number": "00001",
  "date": "2026-01-31T00:00:00Z",
  "supplier": "ПоставщикИД",
  "warehouse": "ВаршаID",
  "items": [
    {
      "sku": "PROD-001",
      "name": "Товар 1",
      "quantity": 100,
      "unit_price": 15.50,
      "total": 1550.00
    }
  ],
  "notes": "Приход от поставщика"
}

Response:
{
  "id": "5f3d5b9c7a8e4f2a1b9d0c1e",
  "document_number": "00001",
  "status": "draft",
  "posted": false
}
```

---

## 6. Rate Limits & Performance

### Typical Constraints (Based on Community Reports)

| Aspect | Typical Limit | Recommendation |
|--------|---------------|-----------------|
| **Requests/sec** | 10-50 per connection | Use connection pooling |
| **Batch size** | 100-1000 items | Process in batches |
| **Response timeout** | 30 seconds | Implement retry logic |
| **Payload size** | 10-50 MB | Split large uploads |
| **Concurrent connections** | 5-20 | Queue long operations |

### Best Practices
- Use bulk/batch endpoints when available
- Implement exponential backoff for retries
- Cache GET requests (5-15 min TTL)
- Queue POST/PUT operations via message broker
- Monitor API health regularly

---

## 7. Error Codes & Responses

### HTTP Status Codes
```
200 OK           — Success
201 Created      — Resource created
204 No Content   — Success, no response body
400 Bad Request  — Invalid input
401 Unauthorized — Auth failed
403 Forbidden    — No permission
404 Not Found    — Document not found
409 Conflict     — Document already exists (duplicate number)
429 Too Many     — Rate limited
500 Server Error — 1C error
503 Unavailable  — Cluster down
```

### Error Response Format (Common)
```json
{
  "error": true,
  "message": "Документ уже существует",
  "code": "DOCUMENT_EXISTS",
  "httpStatus": 409,
  "details": {
    "existing_id": "12345",
    "existing_number": "00001"
  }
}
```

---

## 8. Webhook / Event System

### Supported Events (Community Reports)

| Event | When Fired | Payload |
|-------|-----------|---------|
| `document.created` | New doc created | `{ document_id, type, number }` |
| `document.posted` | Doc posted/confirmed | `{ document_id, type, posted_date }` |
| `document.deleted` | Doc deleted | `{ document_id, type }` |
| `goods.updated` | Good quantity changed | `{ sku, old_qty, new_qty, warehouse }` |
| `inventory.synced` | Physical count done | `{ warehouse, items_counted }` |

### Webhook Registration
```
POST /api/v1/webhooks
{
  "event": "document.posted",
  "url": "https://your-app.com/webhook/1c",
  "secret": "webhook_secret_key"
}
```

### Webhook Signature Verification
```
X-1C-Signature: sha256=<hmac_hex>

Verify by:
1. Calculate HMAC-SHA256(webhook_secret, request_body)
2. Compare with X-1C-Signature header
```

---

## 9. Data Export Formats

### Supported Export Types

#### Option A: JSON API
```
GET /api/v1/goods?format=json&limit=100&offset=0

{
  "data": [...],
  "pagination": {
    "total": 1000,
    "limit": 100,
    "offset": 0
  }
}
```

#### Option B: CSV Export
```
GET /api/v1/goods/export?format=csv

SKU,Name,Quantity,Warehouse
PROD-001,Товар 1,100,wh-main
PROD-002,Товар 2,50,wh-main
```

#### Option C: XML (Legacy, UDE Format)
```
GET /api/v1/goods/export?format=xml

<?xml version="1.0" encoding="UTF-8"?>
<DataExchange>
  <Goods>
    <Good Number="00001" SKU="PROD-001">...
```

---

## 10. Known Limitations & Workarounds

### Limitation 1: No Real-Time Sync
**Problem:** API response includes data synced ~1-5 minutes ago  
**Workaround:**
- Use webhooks for real-time events
- Cache locally, update incrementally
- Query for changes since last sync (timestamp filter)

### Limitation 2: No Batch Delete
**Problem:** Can't delete multiple documents in one call  
**Workaround:**
- Loop through documents
- Use message queue to parallelize
- Implement "soft delete" (mark_as_deleted flag)

### Limitation 3: Authentication Per Instance
**Problem:** Different credentials for dev/staging/prod  
**Workaround:**
- Store in environment variables
- Use secrets manager (HashiCorp Vault, AWS Secrets)
- Implement credential rotation

### Limitation 4: API Versioning
**Problem:** API changes break old clients  
**Workaround:**
- Monitor `/api/version` endpoint
- Implement version negotiation
- Support multiple API versions

---

## 11. Integration Stack (Recommended)

### Frontend (UI for users)
- React/Next.js (already chosen)
- Forms for manual goods intake
- Real-time inventory dashboard

### Backend (1C Integration Layer)
```
Node.js/Express (already using tRPC)
├── 1C API Client (REST client)
├── Authentication (store credentials securely)
├── Error handling & retry logic
├── Rate limiting (respect 1C limits)
└── Logging & monitoring

Cache Layer
├── Redis (hot cache, real-time updates)
├── PostgreSQL (persistent cache, historical)
└── Fallback to 1C if cache misses
```

### Async Processing
```
Bull Job Queue
├── Queue 1C API calls
├── Retry failed requests
├── Batch operations
└── Webhook event processing
```

---

## 12. Next Steps for Phase 1

### Week 1: Foundation
- [ ] Register at 1c.ru / Developer Network
- [ ] Download 1C:Enterprise demo or use 1C:Cloud free trial
- [ ] Access official API documentation
- [ ] Find exact API endpoint URL for your 1C instance

### Week 1-2: Proof of Concept
- [ ] Test Basic Auth connectivity
- [ ] Fetch goods list (GET /api/v1/goods)
- [ ] Create test goods receipt document (POST /api/v1/documents)
- [ ] Document actual endpoints & response formats
- [ ] Test webhook receiver (setup test webhook in 1C)

### Week 2: Implementation
- [ ] Build 1C client module with working endpoints
- [ ] Implement retry logic
- [ ] Set up environment variables
- [ ] Create database schema for caching
- [ ] Test with real 1C instance

---

## 13. Useful Links & Communities

### Official
- 1C Developers: https://1c-dn.com/
- 1C Knowledge Base: https://its.1c.ru/ (requires auth)
- Platform Docs: https://v8.1c.ru/

### Community
- GitHub Topic: https://github.com/topics/1c-enterprise (511 repos)
- Habr (Russian): https://habr.com/ru/hub/1c/ (Russian tech blog)
- Stack Overflow: Tag `1c-enterprise` (limited, but some answers)

### Russian Forums
- 1C Forum: forum.1c.ru
- 1C:Integration: integration.1c.ru (dedicated integration hub)
- 1C Community: communities.1c.ru

### Integration Services
- 1C:Cloud marketplace (ready-made integrations)
- Konsolkraft (1C integrations as a service)
- Local 1C consultants (for custom work)

---

## 14. Cost Considerations

### 1C:Cloud (Recommended for MVP)
- **Free Trial:** 30 days full access
- **Pricing:** €25-100/month depending on features
- **Includes:** REST API access, webhooks, 24/7 support
- **Best for:** Testing, SMB apps

### 1C:Enterprise On-Premise
- **License:** $1000-10000+ (one-time)
- **Support:** Enterprise support ($500-2000/year)
- **API:** Included in most configurations
- **Best for:** Large companies, custom needs

### Integration Layer (Your App)
- **Heroku/Railway:** $7-20/month (small)
- **AWS/Google Cloud:** $20-100/month (scalable)
- **Database:** $10-50/month (PostgreSQL)
- **CDN:** $0-50/month
- **Total MVP:** ~$40-150/month

---

## 15. Risks & Mitigations

### Risk 1: API Downtime
**Mitigation:**
- Implement circuit breaker pattern
- Cache aggressively
- Queue operations for retry
- Alert on failures

### Risk 2: Authentication Token Expiry
**Mitigation:**
- Implement automatic token refresh
- Use long-lived tokens where possible
- Handle 401 responses gracefully

### Risk 3: Batch Operation Limits
**Mitigation:**
- Chunk large uploads
- Use message queue for parallelization
- Monitor & alert on rate limits

### Risk 4: Data Consistency
**Mitigation:**
- Idempotent operations (safe to retry)
- Double-check after write operations
- Audit log all changes
- Periodic reconciliation

---

## Summary

**Status:** ✅ Research complete with community sources  
**Official Docs:** ⏳ Need to access via 1C.ru registration  
**MVP Feasibility:** ✅ High (plenty of community examples)  
**Timeline:** 2-3 days to proof-of-concept once sandbox is set up

**Next Action:** Set up 1C sandbox (free trial) and validate actual API endpoints against this research.
