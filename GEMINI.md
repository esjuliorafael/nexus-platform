# nexus-platform — Project Context & Workflow

## Design Standards (Admin Panel)

### 1. High-End Editorial Design
All Admin components must follow the **Editorial Tech** aesthetic: technical precision, high-contrast typography, and fluid layouts.

- **Golden Rule (Radii):** Containers must maintain concentric harmony using **Recursive Geometry**.
  - **Visual Formula:** `inner = outer - (padding * 0.75)` (Use for main UI blocks).
  - **Simple Formula:** `inner = outer - padding` (Use for nested technical elements like icons).
- **Golden Rule (Spaces):** Use **Semantic Spacing** based on a Base 4 grid:
  - `--space-xs` (4px): Intimate relationships (Label ↔ Value).
  - `--space-sm` (8px): Close relationships (Buttons in a row).
  - `--space-md` (16-24px): Component internal modules (Icon ↔ Text).
  - `--space-lg` (24-40px): Section boundaries (Blocks ↔ Blocks).
- **Golden Rule (Typography):** Strictly follow the **Modular Scale (Major Third 1.25x)**.
  - Never use fixed pixel sizes for text; always use the `text-*` utility tokens which are 100% fluid via `clamp()`.
  - Use hierarchical weights to guide the eye: Hero(900) > H1(700) > H2(600) > Secondary(500) > Body(400).

### 2. Component Usage
- **NexusButton:** Always use `context="section"` for primary actions and `context="card"` for secondary/nested actions.
- **NexusInputs:** Data entered by the user should always be `font-medium` (500).
- **Responsiveness:** Eliminate `sm:p-*` or `md:gap-*` overrides. Prefer using global fluid tokens in `index.css`.
- **Assets:** Use `getFullUrl` utility with `ASSET_BASE_URL` for any media coming from the API.

## Workflow (Antigravity Single-Agent System)

### Unified Workspace (Strategy & Execution)
- **Scope:** Architecture, planning, research, code editing, and execution.
- **Rules:**
  - **Conversational Tone:** Transactions are direct and conversational between the User and the AI (Antigravity CLI). No second execution window is needed.
  - **Language:** Conversations must be in **Spanish** (español).
  - **Code Standard:** All code, routes, DB columns, tables, variables, and comments must be in **English**.
  - **Investigation Discipline:** MUST perform thorough research before proposing changes, labeling confirmed technical facts as **Fact** and uncertainties as **Hypothesis**.
  - **Action Flow:** Propose and execute actions directly in this workspace (subject to user approval).
  - **Documentation Maintenance:** Every strategic decision and session progress must be logged in the persistent memory files.

## Persistent Memory Index
- **Strategy & Decisions:** [docs/ai/STRATEGY.md](docs/ai/STRATEGY.md)
- **Session History:** [docs/ai/SESSION_LOG.md](docs/ai/SESSION_LOG.md)

## Golden rules (never violate these)
- No tenant_id, no shared databases, ever.
- No client names, domains, logos, or brand assets hardcoded anywhere in the codebase.
- All client identity comes from the `settings` table (DB) or `.env` file.
- Everything in English: tables, columns, routes, folders, variables.
- The raffle module is optional. Core system must work without it.
- Everything lives under the main domain. No subdomains are used for modules.

## Stack Summary
- **Monorepo:** Turborepo v2 + pnpm workspaces
- **Backend:** Fastify + TypeScript (`apps/api`)
- **ORM:** Prisma (Store + Raffle schemas)
- **Database:** PostgreSQL (Independent instances)
- **Queues:** BullMQ + Redis
- **Production Architecture:** See [docs/ai/INFRASTRUCTURE.md](docs/ai/INFRASTRUCTURE.md) for Contabo VPS details.

## Infrastructure & Setup
Refer to [docs/ai/STRATEGY.md](docs/ai/STRATEGY.md) for detailed setup instructions and architectural decisions.
