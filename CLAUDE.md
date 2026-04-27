# CLAUDE.md — Technical Briefing

## Project Overview
- **Monorepo Structure:** Managed via Turborepo and pnpm.
  - `apps/api`: Fastify backend.
  - `apps/admin`: React (Vite) administration dashboard.
  - `apps/storefront`: React (Vite) public storefront.
  - `packages/db`: Prisma schemas and clients for both databases.
- **Databases:** Two independent PostgreSQL instances.
  - `storePrisma`: Core e-commerce data (products, orders, users).
  - `rafflePrisma`: Raffle-specific data (raffles, ticket sales, raffle settings).
- **Tech Stack:** Fastify, React, TypeScript, Prisma, BullMQ, Redis, Zod.

## Module Status
- **Auth:** COMPLETE. JWT-based; users in `users` table are the only source.
- **Products:** COMPLETE. Full CRUD with status management in Admin.
- **Orders:** COMPLETE. Storefront checkout + Admin order management.
- **Raffles:** COMPLETE. CRUD operational in Admin; public listing active.
- **Ticket-Sales:** COMPLETE. Reservation logic with BullMQ release worker.
- **Settings:** COMPLETE. Key-value store for system configuration.
- **Payment-Channels:** COMPLETE. Configurable bank/payment details.
- **WhatsApp-Channels:** COMPLETE. Notification template management.
- **Shipping-Zones:** COMPLETE. State-based shipping cost calculation.

## Active Conventions
- **Route Prefix:** All API endpoints are prefixed with `/api/v1`.
- **Auth:** Protected routes use the `server.authenticate` preHandler.
- **Zod Validation:** **CRITICAL.** Always use local `try/catch` within the route handler to catch `ZodError`.
  ```typescript
  try {
    const body = schema.parse(request.body);
  } catch (error: any) {
    if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
    throw error;
  }
  ```
- **Admin Routing:** Admin routes use the same path structure as public routes, distinguished only by the `server.authenticate` preHandler (no `/admin` sub-prefix in the route definition).

## Known Issues / Watch Out For
- **Plugin Encapsulation:** Fastify's encapsulation blocks `ZodError` thrown in child plugins from reaching the root `setErrorHandler`. Local handling is mandatory.
- **Environment:** `RAFFLE_ENABLED=true` must be present in `apps/api/.env` for the raffle module to load.
- **Path Resolution:** `dotenv` in `apps/api/src/server.ts` uses an absolute path to ensure `.env` loads correctly when started from the monorepo root via Turbo.

## What NOT to change
- **`server.ts` setErrorHandler:** This is hardened for specific core errors. Do not attempt to centralize Zod handling here.
- **`raffle.plugin.ts`:** Do not change the registration order of raffle sub-modules.
- **Fixed Files:** Do not revert changes in any file mentioned as "fixed" or "resolved" in `PERPLEXITY.md`.
