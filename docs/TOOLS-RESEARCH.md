# AI Stock Keeper - Tools & Libraries Research

## 1. OCR & Image Recognition

### Option A: Tesseract.js (Open Source)
```javascript
// npm install tesseract.js
import Tesseract from 'tesseract.js';

const worker = await Tesseract.createWorker();
const result = await worker.recognize('path/to/image.jpg');
console.log(result.data.text); // Extracted text
```
- **Pros:** Free, works in browser, no backend needed
- **Cons:** Slower (~3-5sec per image), accuracy ~85-90%
- **Cost:** $0
- **Use case:** MVP for warehouse labels

### Option B: AWS Textract
```javascript
// npm install @aws-sdk/client-textract
const client = new TextractClient({ region: 'us-east-1' });
const params = { Document: { S3Object: { Bucket, Name } } };
const result = await client.send(new DetectDocumentTextCommand(params));
```
- **Pros:** 99% accurate, handles tables/forms, very fast
- **Cons:** Costs $0.015-0.30 per page, AWS dependency
- **Cost:** ~$100/month for 10K images
- **Use case:** Production, high accuracy required

### Option C: Google Vision API
- **Pros:** Similar accuracy to AWS, good OCR for labels
- **Cons:** Similar pricing
- **Cost:** $0.60 per 1000 requests = ~$6 for 10K
- **Best for:** Russian text (better Cyrillic support than AWS)

**Recommendation for MVP:** Tesseract.js (free, works in browser)  
**Scale to:** Google Vision API or AWS Textract (better accuracy)

---

## 2. Barcode Recognition

### Option A: jsQR (QR codes)
```javascript
import jsQR from 'jsqr';
const qrCode = jsQR(imageData);
console.log(qrCode.data); // Decoded data
```
- **Pros:** Fast, free, JS only
- **Cons:** QR codes only
- **Cost:** $0
- **Use case:** If using QR codes

### Option B: Quagga.js (All barcodes)
```javascript
import Quagga from '@ericblade/quagga2';
Quagga.onDetected((result) => console.log(result.codeResult.code));
Quagga.start();
```
- **Pros:** Supports EAN-13, Code128, etc., live camera
- **Cons:** JavaScript only, ~80% accuracy
- **Cost:** $0
- **Use case:** Live scanning in web/mobile app

### Option C: OpenCV.js
```javascript
// For advanced image processing
// Can detect barcodes with custom ML model
```
- **Pros:** Very accurate with training
- **Cons:** Complex, needs ML expertise
- **Cost:** $0 but R&D heavy
- **Use case:** Future custom model

**Recommendation:** Quagga.js (MVP) → OpenCV.js (advanced)

---

## 3. Product Matching (Fuzzy Matching)

### Option A: Fuse.js
```javascript
import Fuse from 'fuse.js';
const fuse = new Fuse(products, { keys: ['name', 'sku'], threshold: 0.3 });
const results = fuse.search('Тетрадь А5'); // Cyrillic support
```
- **Pros:** Fast, accurate fuzzy matching, free
- **Cons:** Simple string matching only
- **Cost:** $0
- **Use case:** MVP product matching

### Option B: ML-based Matching
```javascript
// Using TensorFlow.js or similar
// Train model on company's products
```
- **Pros:** Better accuracy over time, learns
- **Cons:** Requires training data
- **Cost:** $0-1000 (training time)
- **Use case:** Scale (6+ months)

**Recommendation:** Fuse.js now, add ML model later

---

## 4. Forecasting & Predictive Analytics

### Option A: Simple (Moving Average)
```javascript
function simpleMovingAverage(data, window = 7) {
  return data.map((_, i) => {
    const slice = data.slice(Math.max(i - window, 0), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
```
- **Pros:** No dependencies, instant
- **Cons:** Doesn't handle seasonality
- **Cost:** $0
- **Use case:** MVP reorder alerts

### Option B: Prophet (Facebook)
```python
# pip install pystan prophet
from prophet import Prophet

model = Prophet()
model.fit(df)
future = model.make_future_dataframe(periods=30)
forecast = model.predict(future)
```
- **Pros:** Handles seasonality, trends, holidays
- **Cons:** Python required, slower (~30 sec)
- **Cost:** $0
- **Use case:** Production forecasting

### Option C: AutoML (Cloud)
```javascript
// Google AutoML, AWS Forecast, Azure ML
// Upload data → get predictions
```
- **Pros:** No ML knowledge needed, very accurate
- **Cons:** Expensive ($100-1000/month)
- **Cost:** $300-1000/month
- **Use case:** Enterprise tier

**Recommendation for MVP:**  
1. **Weeks 1-4:** Simple moving average (free)
2. **Weeks 5-8:** Migrate to Prophet (Python microservice)
3. **Weeks 9+:** Optional AutoML for advanced features

---

## 5. Route Optimization (Picking Paths)

### Option A: Greedy Nearest-Neighbor
```javascript
function optimizeRoute(items, warehouse) {
  let current = warehouse.start;
  const visited = [current];
  const remaining = [...items];
  
  while (remaining.length > 0) {
    const nearest = remaining.reduce((best, item) => {
      const dist = distance(current, item.location);
      const bestDist = distance(current, best.location);
      return dist < bestDist ? item : best;
    });
    visited.push(nearest.location);
    current = nearest.location;
    remaining.splice(remaining.indexOf(nearest), 1);
  }
  return visited;
}
```
- **Pros:** Simple, fast (<100ms for 100 items)
- **Cons:** Suboptimal (can be 20% longer than optimal)
- **Cost:** $0
- **Use case:** MVP picking optimization

### Option B: OSRM (Open Source Routing Machine)
```bash
# Self-hosted or cloud
curl "http://router.project-osrm.org/route/v1/driving/-118.2437,34.0522;-118.2471,34.0506?overview=full"
```
- **Pros:** Professional routing, considers real roads
- **Cons:** Overkill for warehouse (distances small)
- **Cost:** $0 (self-hosted) or $50-200/month (cloud)
- **Use case:** Multi-location routes, delivery optimization

### Option C: Google OR-Tools
```python
# pip install ortools
from ortools.linear_solver import pywraplp

# Solve TSP with constraints
```
- **Pros:** Solves complex routing problems
- **Cons:** Python, complex setup
- **Cost:** $0
- **Use case:** Advanced multi-objective optimization

**Recommendation:** Greedy algorithm for MVP, upgrade to OSRM or OR-Tools if needed

---

## 6. Real-Time Sync & Message Queue

### Option A: Server-Sent Events (SSE) ✅ ВЫБРАНО для Phase 3
```typescript
// Backend (Next.js Route Handler)
export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      // Подписка на Redis pub/sub
      redis.subscribe("inventory:updated", (message) => {
        controller.enqueue(`data: ${message}\n\n`);
      });
    },
  });
  
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

// Frontend
const eventSource = new EventSource("/api/sse/inventory");
eventSource.onmessage = (e) => console.log(JSON.parse(e.data));
```
- **Pros:** Simple, native browser support, auto-reconnect, односторонний поток
- **Cons:** Только server → client, не bi-directional
- **Cost:** $0
- **Use case:** Dashboard real-time updates (read-only)

### Option B: Socket.io (WebSocket)
```javascript
// Frontend
const socket = io('http://api.app.com');
socket.on('inventory:updated', (data) => console.log(data));

// Backend
io.emit('inventory:updated', { sku: '123', qty: 50 });
```
- **Pros:** Real-time, bi-directional, familiar
- **Cons:** Websocket overhead, сложнее настройка
- **Cost:** $0
- **Use case:** Когда нужна двусторонняя связь

### Option B: Bull (Job Queue)
```javascript
// npm install bull redis
const queue = new Queue('1c-sync', { redis });

queue.process(async (job) => {
  await sync1CDocument(job.data);
});

// Enqueue
await queue.add({ type: 'goods-receipt', sku: '123' });
```
- **Pros:** Async, retries, persistence, ordering
- **Cons:** Needs Redis
- **Cost:** $0 (self-hosted) or $10-50/month (managed)
- **Use case:** Reliable async 1C sync

### Option C: RabbitMQ
```bash
# npm install amqplib
# More enterprise, similar to Bull
```
- **Pros:** Enterprise-grade, durable
- **Cons:** Overkill for MVP
- **Cost:** $0 (self-hosted)
- **Use case:** Scale to 100K+ transactions/day

**Recommendation:** Socket.io for live updates + Bull for async sync (MVP)

---

## 7. Database

### Option A: PostgreSQL (Recommended)
```sql
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE,
  name VARCHAR(255),
  quantity INT,
  reorder_point INT,
  synced_at TIMESTAMP,
  last_1c_update TIMESTAMP
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20), -- 'intake', 'picking', 'transfer'
  sku VARCHAR(50),
  quantity INT,
  created_at TIMESTAMP,
  synced_with_1c BOOLEAN DEFAULT FALSE
);
```
- **Pros:** Reliable, fast, great for queries, JSONB for flexibility
- **Cons:** Requires management
- **Cost:** $10-50/month (managed: Railway, Supabase)
- **Use case:** Primary data store

### Option B: MongoDB
- **Pros:** Flexible schema, good for logs
- **Cons:** Not ideal for inventory (transactional)
- **Cost:** Similar
- **Use case:** Audit logs, optional

**Recommendation:** PostgreSQL as primary (inventory, transactions)  
Can add MongoDB for audit logs if needed

---

## 8. Caching & Real-Time Data

### Option A: Redis
```javascript
// npm install redis
const client = redis.createClient();
await client.set('inventory:sku123', JSON.stringify({ qty: 50 }));
const cached = await client.get('inventory:sku123');
```
- **Pros:** Ultra-fast, in-memory, pub/sub
- **Cons:** Data lost on restart without persistence
- **Cost:** $0-10/month (managed: Redis Cloud)
- **Use case:** Cache, real-time inventory

### Option B: Memcached
- **Pros:** Simple, very fast
- **Cons:** Simpler than Redis
- **Cost:** Similar
- **Use case:** Alternative to Redis

**Recommendation:** Redis (has pub/sub, better for real-time)

---

## 9. Image Storage

### Option A: AWS S3
```javascript
// npm install @aws-sdk/client-s3
const client = new S3Client({});
await client.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'goods/2026-01-31/photo.jpg',
  Body: imageBuffer
}));
```
- **Pros:** Reliable, CDN, cheap storage
- **Cons:** AWS dependency
- **Cost:** $0.023/GB + $0.09/1M requests (~$10-20/month for startup)
- **Use case:** Production

### Option B: DigitalOcean Spaces
```javascript
// Similar to S3, cheaper alternative
// $5/month for 250GB
```
- **Pros:** Cheaper, simpler than AWS
- **Cost:** $5/month
- **Use case:** More cost-effective MVP

### Option C: Local disk (for MVP)
- **Pros:** Free, instant
- **Cons:** Not scalable, backup issues
- **Cost:** $0
- **Use case:** MVP only

**Recommendation:** Local disk for MVP → Spaces/S3 for production

---

## 10. Email Notifications (Alerts)

### Option A: Resend ✅ ВЫБРАНО для Phase 3
```typescript
// npm install resend
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "alerts@yourdomain.com",
  to: "manager@company.com",
  subject: "⚠️ Низкий остаток: SKU-001",
  html: "<p>Товар 'Болт М8x30' достиг критического уровня: 5 шт</p>",
});
```
- **Pros:** Современный API, отличный DX, React Email templates
- **Cons:** Требует свой домен для production
- **Cost:** Free tier: 100 emails/day, $20/month for 50K emails
- **Use case:** Alert emails, отчёты

### Option B: Nodemailer + SMTP
```typescript
// npm install nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  auth: { user: "...", pass: "..." },
});

await transporter.sendMail({ from, to, subject, html });
```
- **Pros:** Бесплатно (с Gmail/Yandex SMTP)
- **Cons:** Может попадать в спам, лимиты Gmail
- **Cost:** $0
- **Use case:** MVP, тестирование

### Option C: SendGrid
```typescript
// npm install @sendgrid/mail
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
await sgMail.send({ to, from, subject, html });
```
- **Pros:** Надёжный, enterprise-ready
- **Cons:** Дороже, сложнее API
- **Cost:** Free tier: 100/day, $15/month for 40K
- **Use case:** Production scale

**Recommendation:** Resend для Phase 3 (современный, простой)

---

## 11. Dashboard Charts

### Option A: Recharts ✅ ВЫБРАНО для Phase 3
```typescript
// npm install recharts
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const data = [
  { date: "Mon", quantity: 100 },
  { date: "Tue", quantity: 120 },
  { date: "Wed", quantity: 90 },
];

<LineChart width={600} height={300} data={data}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="quantity" stroke="#8884d8" />
</LineChart>
```
- **Pros:** React-native, декларативный, responsive, лёгкий
- **Cons:** Ограниченные возможности для complex charts
- **Cost:** $0
- **Use case:** Dashboard виджеты, stock levels

### Option B: Chart.js + react-chartjs-2
```typescript
// npm install chart.js react-chartjs-2
import { Line } from "react-chartjs-2";

<Line data={chartData} options={options} />
```
- **Pros:** Гибкий, много типов графиков
- **Cons:** Canvas-based, не React-идиоматичный
- **Cost:** $0
- **Use case:** Если нужны сложные графики

### Option C: Tremor
```typescript
// npm install @tremor/react
import { Card, AreaChart, DonutChart } from "@tremor/react";

<Card>
  <AreaChart data={data} categories={["quantity"]} />
</Card>
```
- **Pros:** Красивые готовые dashboard компоненты
- **Cons:** Тяжёлая библиотека (~100KB), opinionated
- **Cost:** $0
- **Use case:** Если нужен полный dashboard kit

**Recommendation:** Recharts для Phase 3 (простой, лёгкий, достаточно для MVP)

---

## 12. Backend Framework

### Option A: tRPC + Next.js (Current Choice) ✅ ВЫБРАНО
```typescript
// Already set up, great for this use case
export const appRouter = t.router({
  inventory: t.procedure.query(async () => {
    return await db.inventory.findMany();
  })
});
```
- **Pros:** Full-stack TypeScript, type-safe APIs, Next.js handles frontend/backend
- **Cons:** Overkill for pure backend, less scalable for microservices
- **Cost:** $0
- **Use case:** Full-stack development

### Option B: Express.js + Node.js
```javascript
// More traditional, decoupled from frontend
app.get('/api/inventory', async (req, res) => {
  const inventory = await db.query('SELECT * FROM inventory');
  res.json(inventory);
});
```
- **Pros:** Decoupled, lighter, microservices-friendly
- **Cons:** Manual routing, no type safety
- **Cost:** $0
- **Use case:** Scalable production backend

### Option C: Python FastAPI
```python
@app.get("/api/inventory")
async def get_inventory():
    return await db.inventory.find()
```
- **Pros:** Great for AI/ML integration (forecasting), fast
- **Cons:** Another language to manage
- **Cost:** $0
- **Use case:** ML-heavy components

**Recommendation for MVP:** Stick with tRPC + Next.js  
**Scale:** Optional separate Express/FastAPI for heavy computations

---

## 13. 1C Integration Specifics

### Completed Research ✅
- [x] Official 1C REST API docs — see [1C-INTEGRATION-RESEARCH.md](./1C-INTEGRATION-RESEARCH.md)
- [x] Authentication methods (Basic Auth, Token)
- [x] Document types (GoodsReceipt, Shipment, Transfer)
- [x] Webhook system
- [x] Rate limits considerations

### Implementation (Phase 1) ✅
- `OneCAuth` service — token management
- `OneCClient` service — HTTP client
- `WebhookProcessor` — event handling
- Mock 1C server for development

---

## Technology Stack Summary

### Frontend (T3 Stack - Ready)
- Next.js 15, React 19, TypeScript
- Tailwind CSS, tRPC
- **Phase 2:** Tesseract.js (OCR), Quagga.js (barcode), Fuse.js (matching)
- **Phase 3:** Recharts (charts), SSE (real-time updates)

### Backend
- **Node.js** (tRPC + Next.js API routes, Express for scale)
- **Database:** PostgreSQL
- **Cache:** Redis (+ pub/sub для real-time)
- **Queue:** Bull
- **Email:** Resend (Phase 3)
- **Python:** Prophet (forecasting microservice, Phase 4)
- **AI:** Google Vision API (scale) / Tesseract.js (MVP)

### Deployment
- **Frontend:** Vercel
- **Backend:** Heroku / Railway / VPS
- **Database:** Managed PostgreSQL (Railway, Supabase)
- **Cache:** Redis Cloud
- **Storage:** DigitalOcean Spaces

---

## Cost Breakdown (Monthly)

### MVP Phase (Months 1-3)
- Hosting: $20 (Vercel free + Railway backend)
- Database: $15 (Supabase PostgreSQL)
- Cache: $5 (Redis Cloud)
- Storage: $5 (Spaces)
- APIs: $0 (free tier)
- **Total:** ~$45/month

### Scale Phase (Months 4-12)
- Hosting: $50-100
- Database: $50-100
- Cache: $20-50
- Storage: $20-50
- APIs (Google Vision): $100-200
- Queue/monitoring: $20-50
- **Total:** ~$250-550/month

---

## Implementation Priority

### Phase 1-2 (Complete) ✅
1. ✅ Tesseract.js OCR
2. ✅ Fuse.js product matching
3. ✅ Quagga.js barcode recognition
4. ✅ Bull job queue
5. ✅ PostgreSQL + Redis

### Phase 3 (Current) 📋
1. ⬜ SSE real-time updates
2. ⬜ Recharts dashboard
3. ⬜ Resend email alerts
4. ⬜ Inventory snapshots & diff

### Phase 4+ (Future) ⬜
1. ⬜ Prophet forecasting (Python microservice)
2. ⬜ Google Vision API (better OCR)
3. ⬜ Route optimization (greedy → OSRM)
4. ⬜ ML model training (product matching)
5. ⬜ SMS alerts (Twilio)
6. ⬜ Mobile PWA
