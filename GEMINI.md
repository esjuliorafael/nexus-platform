# nexus-platform — Project Context

## What this is
A Single-Tenant White-Label platform unifying three legacy PHP/React repositories
into a single TypeScript monorepo. Each client gets their own independent
installation and isolated database. This is NOT SaaS. This is NOT multi-tenant.

## Golden rules (never violate these)
- No tenant_id, no shared databases, ever.
- No client names, domains, logos, or brand assets hardcoded anywhere in the codebase.
- All client identity comes from the `settings` table (DB) or `.env` file.
- Everything in English: tables, columns, routes, folders, variables.
- The raffle module is optional. Core system must work without it.
- Everything lives under the main domain. No subdomains are used for modules.

## Stack
- Monorepo: Turborepo v2 + pnpm workspaces
- Frontend: React + Vite + TypeScript (apps/admin, apps/storefront)
- Backend: Fastify + TypeScript (apps/api)
- ORM: Prisma with two separate schemas (store + raffle)
- Database: PostgreSQL (Docker in development, VPS in production)
- Queues: BullMQ + Redis
- Auth: JWT (Admin users in `users` table are the only auth source)

## Infrastructure
- Development: Docker Compose (PostgreSQL x2 + Redis)
- Production: VPS (Contabo or equivalent) with Docker Compose, no cPanel dependency

## Development Setup

### Prerequisites
- Docker Desktop running
- pnpm installed globally

### Starting the environment
1. Start PostgreSQL containers: `docker-compose up -d`
2. Generate Prisma clients: `pnpm db:generate`
3. Start the API: `pnpm -F @nexus/api dev`

### Prisma notes
- Both Prisma schemas output clients to the monorepo root `node_modules/`:
  - Store: `node_modules/@prisma/client-store`
  - Raffle: `node_modules/@prisma/client-raffle`
- Output path in schema: `../../../../node_modules/@prisma/client-{name}`
- After any schema change: run `pnpm db:generate` then `pnpm -F @nexus/db exec prisma migrate dev`
- The `packages/db/.env` must always be in sync with `apps/api/.env`

### Port map
- API: 3001
- Storefront: 3000
- Admin: 4000
- PostgreSQL Store: 5434
- PostgreSQL Raffle: 5433
- Redis: 6379 (shared with other projects)

## Current phase
Phase 4 complete — Public storefront implemented in React.

## Phase roadmap
- Phase 1 ✅ — Monorepo setup, dashboard → apps/admin, Fastify API foundation
- Phase 2 ✅ — Implement store API routes (products, orders, settings, media)
- Phase 3 ✅ — Implement raffle module API routes (raffles, tickets, ticket-sales)
- Phase 4 ✅ — Migrate PHP public frontend → apps/storefront (React)
- Phase 5 — Raffle section in apps/admin (create, edit raffles; manage tickets and payments; visible only when RAFFLE_ENABLED=true)
- Phase 6 — Raffle public section in apps/storefront (browse raffles, ticket selection grid, reservation flow)

## Settings keys
Canonical keys used in the `settings` table:
- `shipping_cost_normal`: Base shipping cost for normal zones.
- `shipping_cost_extended`: Base shipping cost for extended zones.
- `inventory_release_hours`: Hours before a pending order/ticket is cancelled.

## Naming map (Spanish → English)
rifas → raffles | ventas → ticket_sales | configuracion → settings
canales_pago → payment_channels | canales_whatsapp → whatsapp_channels
medios → media | ordenes → orders | ordenes_detalles → order_items
productos → products | zonas_envio → shipping_zones
