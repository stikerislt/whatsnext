# What's Next — Strategy Execution Intelligence Platform

Production monorepo for the B2B SaaS platform connecting strategy, execution, talent, and AI intelligence.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** NestJS, BullMQ, Redis
- **Database:** PostgreSQL + Prisma + pgvector
- **Shared:** Calculation engine, RBAC, types

## Quick Start

**Prerequisite:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be installed and running (tray icon → "Engine running").

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional — defaults work with Docker)
cp .env.example .env

# 3. Start DB, migrate, and seed (one command)
npm run db:setup

# 4. Start API + web
npm run dev
```

If `docker compose up -d` fails with **port already allocated**, another Postgres/Redis may be running on 5432/6379. This project uses **5433** (Postgres) and **6381** (Redis) by default.

Manual steps (equivalent to `db:setup`):

```bash
docker compose up -d
# wait ~10s for Postgres
cd packages/database && npx prisma migrate dev --name init && npm run seed
```

- **Web:** http://localhost:3000
- **API:** http://localhost:3001/api/v1
- **Demo login:** `demo@example.com` / `demo12345`

## Project Structure

```
apps/
  api/          NestJS REST API (auth, strategy, talent, AI, sync)
  web/          Next.js UI (14 views matching HTML prototype)
packages/
  database/     Prisma schema, RLS, seed, load test
  shared/       Calculations, RBAC, types
docs/
  CALCULATION_SPEC.md
  DESIGN_SYSTEM.md
```

## Modules

| Module | Route | API |
|--------|-------|-----|
| Command Center | `/dashboard` | `GET /home/dashboard` |
| Strategy Alignment | `/dashboard/strategy` | `GET /strategy/alignment` |
| Talent Database | `/dashboard/talent` | `GET /employees` |
| Talent Marketplace | `/dashboard/marketplace` | `GET /marketplace/*` |
| Bonuses | `/dashboard/bonuses` | `GET /bonuses/preview` |
| AI Advisor | `/dashboard/fullai` | `POST /ai/chat` |
| Onboarding | Wizard overlay | `POST /onboarding/*` |

## Documentation

- [Calculation Specifications](docs/CALCULATION_SPEC.md)
- [Design System Mapping](docs/DESIGN_SYSTEM.md)
- HTML prototypes: `whatsnext_v4-2_Pilnas apps.html`, `whatsnext_onboardingas_CV ir irankiai.html`

## Load Testing

```bash
npm run load-test
```

Validates query performance with 1K employees / 10K tasks sample per tenant.
