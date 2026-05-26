# Raffle Intelligence & Audience Capitalization

## Purpose

Build a private intelligence layer for the SaaS owner to analyze raffle participants, discover valuable behavioral segments, and export audiences for commercial activation.

The first version is owner-only and visible only to `SUPERADMIN`. Later, a limited tenant-scoped version can be exposed to clients as part of the annual raffle service.

## Product Thesis

The raffle module should not only manage raffles and ticket sales. It should learn which participants are valuable, reliable, dormant, risky, regional, or campaign-ready.

The core product idea is an audience engine:

- Identify participants with high payment reliability.
- Identify repeat raffle participants.
- Identify high-volume ticket buyers.
- Detect users who reserve tickets but do not pay.
- Discover dormant participants worth reactivation.
- Export actionable audiences for WhatsApp or spreadsheet workflows.
- Compare tenant raffle health from the SaaS owner perspective.

## Permission Model

### Owner Intelligence

Visible only to the SaaS owner/superadmin.

Scope:

- Global intelligence across all tenants in the future.
- Tenant-level intelligence in the first implementation.
- Exportable participant segments.
- Tenant comparison once multiple raffle tenants exist.
- Strategic commercial insights for the SaaS owner.

### Client Raffle Insights

Possible later version for clients.

Scope:

- Only their own tenant data.
- No global participant visibility.
- No cross-tenant comparisons.
- Basic segments: frequent, paid, pending, dormant, high-value.
- Export limited to their own raffle participants.

## Privacy And Commercial Boundary

The system must distinguish between three classes of data:

1. Tenant-owned participant records: name, phone, state, ticket activity, payment status.
2. Aggregated global intelligence: trends, conversion rates, regions, cohorts, tenant performance.
3. Identifiable global audiences: exportable personal data across tenants.

The first two are safer and should be the default architecture. Identifiable global audiences are commercially powerful, but require clear terms, consent, or contractual coverage before being used for owner campaigns.

Implementation should make this boundary explicit in code and UI copy.

## Phase 1: Tenant-Local Superadmin Intelligence

No new Contabo service. No new database if avoidable.

Use existing tables:

- `raffles`
- `ticket_sales`

Deployment remains unchanged:

```txt
nexus-nginx
  -> manzana-admin
  -> manzana-api
       -> manzana_store
       -> manzana_raffle
       -> nexus-redis-global
```

The API computes analytics from `server.rafflePrisma`.

Recommended routes:

```txt
GET /api/v1/admin/raffle-intelligence/overview
GET /api/v1/admin/raffle-intelligence/segments
GET /api/v1/admin/raffle-intelligence/participants
GET /api/v1/admin/raffle-intelligence/export
```

All routes require:

- `server.authenticate`
- authenticated user role must be `SUPERADMIN`
- `RAFFLE_ENABLED=true`

## Phase 2: Portable Scoring Engine

Extract computation into a service that can run against any raffle Prisma client.

Example service shape:

```ts
buildRaffleIntelligence({
  rafflePrisma,
  tenantId,
  dateRange,
  filters,
})
```

This lets the current tenant-local feature later become a global intelligence service without rewriting the business logic.

## Phase 3: Global Intelligence Service

Once there are multiple tenants, introduce a global service or global data store.

Possible Contabo model:

```txt
nexus-intelligence-api
  -> nexus-postgres-global
       -> nexus_intelligence
  -> read/sync from tenant raffle databases
```

Optional worker:

```txt
nexus-intelligence-worker
  -> sync tenant raffle data periodically
  -> recalculate participant scores
  -> recalculate segment memberships
```

This phase supports:

- cross-tenant participant identity by normalized phone
- tenant comparison
- global cohort analysis
- saved audiences
- scheduled exports

## Initial Screen Strategy

Admin location:

- `Sistema > Inteligencia`
- or `Sistema > Audiencias`

Preferred naming:

- Internal: `Raffle Intelligence`
- UI label: `Audiencias`

Initial tabs:

1. `Resumen`
2. `Segmentos`
3. `Participantes`
4. `Exportaciones`

Later tabs:

1. `Cohortes`
2. `Oportunidades`
3. `Tenants`

## Overview Metrics

Suggested metrics:

- unique participants
- total reserved tickets
- total paid tickets
- payment conversion rate
- pending or cancelled tickets
- estimated paid revenue
- average tickets per participant
- repeat participants
- dormant participants
- top states
- top raffles by paid tickets

## Participant Aggregation

Participant identity should initially be based on normalized phone number.

Fields:

- `phone`
- `displayName`
- `state`
- `rafflesParticipated`
- `ticketsReserved`
- `ticketsPaid`
- `ticketsPending`
- `ticketsCancelled`
- `paymentRate`
- `estimatedRevenue`
- `firstSeenAt`
- `lastSeenAt`
- `averageTicketsPerRaffle`
- `segment`
- `score`

## Segments

Initial automatic segments:

- `VIP_PAYERS`: recurring participants with high payment rate.
- `REPEAT_ACTIVE`: participates in multiple raffles.
- `HIGH_VOLUME`: reserves or pays many tickets.
- `PROMISING_NEW`: new participant who paid.
- `DORMANT`: good prior activity but no recent participation.
- `NON_PAYER`: reserves but rarely or never pays.
- `LOW_ACTIVITY`: occasional or low-value participant.
- `REGIONAL_STRONG`: participants grouped by strong state performance.

Each segment should expose:

- size
- paid tickets
- payment rate
- estimated revenue
- last activity
- export action

## Scoring Draft

The score should be simple and explainable at first.

Inputs:

- paid tickets: positive
- raffle recurrence: positive
- payment rate: strong positive
- estimated revenue: positive
- recent activity: positive
- pending/cancelled tickets: negative
- inactivity: negative

Example:

```txt
score =
  paidTickets * 8
  + rafflesParticipated * 12
  + paymentRate * 40
  + revenueBucket * 8
  + recencyBonus
  - cancelledTickets * 10
  - unpaidTickets * 6
  - inactivityPenalty
```

The UI should show the resulting label, not only the numeric score.

## Export Strategy

First version:

- CSV export from API.
- Export filtered participants or one segment.
- Columns: name, phone, state, segment, score, paid tickets, reserved tickets, payment rate, last activity.

Later:

- XLSX export.
- WhatsApp-ready export.
- Saved audiences.
- Campaign templates.

## UI Design Direction

Use the existing Admin design system:

- `NexusHero` for the high-level intelligence summary.
- `NexusSection` for major blocks.
- `NexusAutonomousCard` for dashboard widgets.
- `NexusSectionCard` for segment rows.
- `NexusPaginator` for participant explorer.
- `NexusInput` and `NexusSelect` for filters.
- `NexusSectionButton` for export actions.

The screen should feel operational and analytical, not decorative.

Avoid:

- building a marketing-style page
- nested cards
- separate visual language from the current Nexus system
- exposing owner-only intelligence to tenant admins

## Implementation Roadmap

### Step 1

Create backend service and routes for tenant-local raffle intelligence.

### Step 2

Add Admin API client methods and TypeScript types.

### Step 3

Create `RaffleIntelligenceView` under `System`.

### Step 4

Add a superadmin-only quick action and System route entry.

### Step 5

Implement CSV export.

### Step 6

Run builds:

```bash
pnpm -F @nexus/api build
pnpm -F @nexus/admin build
```

### Step 7

Later, extract scoring into a portable engine for global multi-tenant intelligence.
