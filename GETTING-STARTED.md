# Getting Started - AI Stock Keeper

## Quick Setup (5 minutes)

### 1. Clone & Install
```bash
cd ai-stock-keeper
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with your values (or use defaults for local dev)
```

### 3. Docker Services (Recommended)
```bash
# PostgreSQL
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=ai_stock_keeper \
  -p 5432:5432 \
  -d postgres:15

# Redis
docker run --name redis-dev \
  -p 6379:6379 \
  -d redis:7

# Verify
psql -U postgres -h localhost -d ai_stock_keeper
redis-cli ping
```

### 4. Database Setup
```bash
npm run db:migrate
npm run db:seed  # Optional: add test data
```

### 5. Start Development
```bash
npm run dev
```

Visit http://localhost:3000

---

## Project Structure

```
ai-stock-keeper/
├── src/
│   ├── app/              # Next.js pages & API routes
│   ├── server/           # Backend services
│   │   ├── api/          # tRPC routers
│   │   ├── services/     # Business logic
│   │   ├── db/           # Database
│   │   └── workers/      # Background jobs
│   ├── trpc/             # tRPC setup
│   └── styles/           # Tailwind CSS
├── docs/                 # Documentation
│   ├── README.md
│   ├── AI-STOCK-KEEPER-PLAN.md
│   ├── TOOLS-RESEARCH.md
│   └── PHASE-1.md       # You are here
├── scripts/              # Utilities
├── migrations/           # Database migrations
└── package.json
```

---

## Documentation

- **[docs/README.md](docs/README.md)** — Project overview & navigation
- **[docs/AI-STOCK-KEEPER-PLAN.md](docs/AI-STOCK-KEEPER-PLAN.md)** — 20-week roadmap
- **[docs/TOOLS-RESEARCH.md](docs/TOOLS-RESEARCH.md)** — Tech stack decisions
- **[docs/PHASE-1.md](docs/PHASE-1.md)** — Current implementation guide

---

## Phase 1 Checklist

**Goal:** Connect to 1C, set up infrastructure (2 weeks)

### Week 1: Setup
- [ ] Study 1C API docs (see docs/PHASE-1.md section 1.1)
- [ ] Set up 1C sandbox environment
- [ ] Create PostgreSQL + Redis (Docker)
- [ ] Run DB migrations
- [ ] Build 1C auth module

### Week 2: Integration
- [ ] Create inventory cache layer
- [ ] Build webhook receiver
- [ ] Implement tRPC API routes
- [ ] Test end-to-end
- [ ] Document learnings

**Deliverable:** Sync goods from 1C, create documents, receive webhooks

---

## Available Scripts

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run format           # Format with Prettier

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed test data
npm run db:studio        # Open Prisma Studio (if using Prisma)

# Phase 1 Utilities
npm run sync:1c:initial  # Initial sync from 1C (after setup)
npm run test:webhooks    # Send test webhook to verify receiver
```

---

## Technology Stack (T3)

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Node.js, tRPC (type-safe API)
- **Database:** PostgreSQL + Redis
- **Styling:** Tailwind CSS
- **Linting:** ESLint + Prettier

---

## Common Issues

### Can't connect to PostgreSQL
```bash
# Check if container is running
docker ps | grep postgres

# View logs
docker logs postgres-dev

# Reset and restart
docker rm postgres-dev
docker run --name postgres-dev ... (see above)
```

### Redis connection failed
```bash
# Check Redis
redis-cli ping
# Should return: PONG

# If not, restart
docker restart redis-dev
```

### 1C authentication errors
1. Check credentials in `.env.local`
2. Verify 1C API is accessible
3. Review docs/PHASE-1.md section 1.5
4. Check 1C logs for auth attempts

---

## Next Steps

1. **Read** `docs/PHASE-1.md` completely
2. **Set up** local database & Redis
3. **Research** 1C API docs (see resources in Phase 1)
4. **Build** 1C auth module
5. **Implement** inventory cache & webhooks
6. **Test** all 4 API endpoints

---

## Help

- **1C Questions:** Check `docs/PHASE-1.md` section 1.1 for resources
- **Architecture:** See `docs/AI-STOCK-KEEPER-PLAN.md`
- **Tools:** See `docs/TOOLS-RESEARCH.md`
- **Phase 1 Details:** See `docs/PHASE-1.md`

---

## Contact / Updates

- Push changes to GitHub
- Update docs as you learn
- Document blockers in `PHASE-1.md`

---

**Ready to start? Run:**
```bash
npm install
npm run dev
```

Then dive into `docs/PHASE-1.md` 🚀
