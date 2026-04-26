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

## How to update this file

After each working session with Perplexity, ask Gemini CLI to append a new
## Session N block to this file with:
- Date
- What was decided or corrected
- What was built
- Any open questions

Then push to GitHub so Perplexity can review it in the next session.
