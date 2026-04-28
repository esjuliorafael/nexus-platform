# nexus-platform — Perplexity Session Log

This file tracks architectural decisions, corrections, and progress made during
sessions with Perplexity (external AI assistant). Use it to restore context
when switching back to Claude or any other assistant.

---

## Session 1 — 2026-04-26

### Context
This session was held with Perplexity after a long planning session with Claude
(see chat_claridad_tecnica.md). The purpose was to review Claude's understanding
of the project, identify inconsistencies, and apply corrections before continuing
Phase 5 implementation.

### Corrections applied

**1. apps/raffle removed as standalone app**
Claude assumed apps/raffle would be a separate React frontend deployed at
rifas.client-domain.com for public ticket buyers. This was incorrect.

The correct architecture:
- apps/raffle does NOT exist.
- Raffle administration lives inside apps/admin as a gated section
  (visible only when RAFFLE_ENABLED=true, enabled by superadmin from Sistema).
- Raffle public view (browse raffles, reserve tickets) lives inside
  apps/storefront as an integrated section — NOT a separate app or subdomain.
- All raffle business logic stays in apps/api/modules/raffle as already built.

**2. Authentication simplified**
No raffle subdomain = no separate login. The users table in the store database
is the only auth source. JWT flow in apps/admin covers everything.

**3. .env exposure fixed**
packages/db/.env was committed to the repo with real credentials. Removed from
git tracking. packages/db/.env.example created with placeholder values.

**4. node_modules removed from repo**
node_modules/ directories were committed. Removed from git tracking.

**5. GEMINI.md updated**
Reflects corrected architecture: 2 frontend apps only (admin + storefront),
no raffle subdomain, updated phase roadmap.

### Phase roadmap (corrected)
- Phase 1 ✅ Monorepo scaffold + apps/admin + Fastify API foundation
- Phase 2 ✅ Store API routes (products, orders, settings, media)
- Phase 3 ✅ Raffle API routes (raffles, tickets, ticket-sales)
- Phase 4 ✅ apps/storefront — public React frontend
- Phase 5 🔲 Raffle section in apps/admin (RAFFLE_ENABLED gate)
- Phase 6 🔲 Raffle public section in apps/storefront

### Open questions at end of session
- What views does the Raffle section in apps/admin need?
  (Pending definition before Phase 5 starts)
- Phase 5 implementation not yet started.

---

## Session 2 — 2026-04-26

### Context
Continuation of Session 1. Phase 5 was implemented by Gemini CLI and reviewed
file-by-file with Perplexity. This session covers the full code review, all
corrections applied, and the final push to master.

### Architectural clarification (critical)
Before starting the review, Julio clarified the correct mental model for the
raffle module — which Claude had misunderstood:

- apps/raffle is NOT a second admin panel and NOT a public frontend.
- The correct model: apps/admin absorbs raffle management as a gated module.
  When VITE_RAFFLE_ENABLED=true, a "Rifas" tab appears in the existing admin
  panel. The admin communicates with apps/api/modules/raffle for all logic.
- This avoids duplicating UI, auth, layout, and deployment config.
- The raffle backend logic stays decoupled in apps/api — it is only registered
  as a Fastify plugin when the feature is enabled.

### Phase 5 — Files reviewed and corrections applied

**api.ts**
- Approved. apiRaffles added with correct /api/v1/raffles endpoints.

**App.tsx (RaffleView integration)**
- Approved. Rifas tab gated behind VITE_RAFFLE_ENABLED. raffleViewMode state
  machine (list → create → edit → detail) correctly implemented.

**RaffleView.tsx**
- Approved after fix: all setConfirmDialog close calls updated to spread pattern
  prev => ({ ...prev, isOpen: false }) to preserve required fields during the
  close animation.

**RaffleList.tsx**
- Approved after fix: useEffect added to reset currentPage to 1 whenever
  searchQuery changes, preventing stale pagination state.

**RaffleForm.tsx**
- Approved after two fixes:
  1. opportunities field was defined in state but had no input in the JSX.
     Fixed: "Números por Boleto" input added in the Formato section.
  2. Image field confirmed as URL string (not file upload). Consistent with
     ProductForm.tsx and the current Fastify JSON/Zod API contract.

**RaffleDetail.tsx**
- Approved after fix: isSettingsFormValid state added and onValidationChange
  passed to the embedded RaffleForm, so the external "Guardar Cambios" button
  correctly disables when the form is invalid.

**TicketGrid.tsx**
- Approved. Note logged as TODO: action buttons (Confirmar Pago, Liberar
  Boleto) use opacity-0/group-hover:opacity-100 — invisible on mobile touch
  devices. To be addressed in a future polish pass.

**Header.tsx**
- Rejected first pass: splice mutation on const array was fragile.
  Fixed to declarative spread pattern:
  [...(VITE_RAFFLE_ENABLED === 'true' ? ['Rifas'] : []), 'Sistema']
  Tab order confirmed: Inicio → Galería → Tienda → Órdenes → Rifas → Sistema.

**BottomNav.tsx**
- Approved. Interface updated to include 'Rifas' union type. Confirmed that
  BottomNav iterates over the tabs prop (not the internal items array), so
  render order is controlled by App.tsx.

**QuickActions.tsx**
- Approved. New 'Rifas' group added (Ver Rifas, Nueva Rifa) with conditional
  filtering when VITE_RAFFLE_ENABLED !== 'true'.

### Commit pushed to master
- SHA: a6eec624b1446b3ef356b3e568035e190c03b53e
- +1,156 lines added / -30 deleted across 13 files
- TypeScript compilation clean (tsc --noEmit passed)

### Phase roadmap (updated)
- Phase 1 ✅ Monorepo scaffold + apps/admin + Fastify API foundation
- Phase 2 ✅ Store API routes (products, orders, settings, media)
- Phase 3 ✅ Raffle API routes (raffles, tickets, ticket-sales)
- Phase 4 ✅ apps/storefront — public React frontend
- Phase 5 ✅ Raffle section in apps/admin (RAFFLE_ENABLED gate)
- Phase 6 🔲 Not yet defined — likely Raffle public section in apps/storefront

### Open questions at end of session
- Phase 6 scope not yet defined. Options:
  a) Raffle browsing section in apps/storefront (ticket reservation flow)
  b) Polish pass for TicketGrid mobile UX (hover-only action buttons)
  c) Other feature TBD by Julio

---

## How to update this file

After each working session with Perplexity, ask Gemini CLI to append a new
## Session N block to this file with:
- Date
- What was decided or corrected
- What was built
- Any open questions

Then push to GitHub so Perplexity can review it in the next session.

---

## Status as of April 26, 2026 — Phase 5 complete

### Permanent fixes implemented
- `apps/api/src/server.ts`: dotenv now loads with an absolute path:
  `dotenv.config({ path: path.resolve(__dirname, '../.env') })`
  Required because Turbo runs all processes from the monorepo root,
  not from `apps/api/`. Without this fix, RAFFLE_ENABLED and any
  other variable in apps/api/.env never reaches the process.

### Raffle module — operational state
- `RAFFLE_ENABLED=true` in `apps/api/.env` activates the raffle plugin
- `GET /api/v1/raffles` returns `200 []` — verified via curl
- Plugin registers in `apps/api/src/modules/raffle/raffle.plugin.ts`
- Raffle Prisma client generated from `packages/db/prisma/raffle/schema.prisma`

### packages/db — final structure
- Two independent schemas:
  - `prisma/store/schema.prisma` → client at `src/store.ts`
  - `prisma/raffle/schema.prisma` → client at `src/raffle.ts`
- `package.json` exports map:
  - `"./store"` → `./src/store.ts`
  - `"./raffle"` → `./src/raffle.ts`
- API imports: `import { rafflePrisma } from '@nexus/db/raffle'`

### Pending — Phase 6
- Phase 6 in progress: raffle creation route fixed.
  POST /api/v1/raffles is now active and JWT-protected.
  Route was previously registered as POST /raffles/admin — corrected to POST /.
- Nested tickets route added: GET /api/v1/raffles/:id/tickets is now active
  and JWT-protected. Corrects 404 when the frontend attempts to fetch tickets
  for a specific raffle.
- All raffle admin route mismatches resolved:
  - PUT /api/v1/raffles/:id and DELETE /api/v1/raffles/:id (removed /admin sub-prefix)
  - PATCH /api/v1/ticket-sales/:id/status (removed /admin sub-prefix)
- POST /api/v1/raffles/:id/tickets added for public ticket reservation.
  - Returns 400 with structured Zod validation errors.
  - Local try/catch used instead of global error handler due to Fastify plugin encapsulation.
- POST /api/v1/admin/settings/logo added for admin logo management.
- Phase 6 complete. All raffle admin routes operational.

---

## Post-Claude Review Fixes

- Fix 1: apiRaffles.getAll now uses /raffles/admin to fetch all statuses
- Fix 2: RaffleDetail.tsx � isSettingsFormValid state added, Guardar Cambios
  button disabled when form invalid
- Fix 3: Removed duplicate POST /ticket-sales/ reservation route and
  unused reserveTicketsSchema from ticket-sale.schema.ts
- Fix 4+5: ticketQuantity and opportunities locked in backend (409 UNIVERSE_LOCKED)
  and disabled in frontend when raffle has PAID or PENDING ticket sales
