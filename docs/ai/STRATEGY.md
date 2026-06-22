# AI Strategy & Architectural Decisions

## Refactorización Arquitectónica de App.tsx [2026-05-23]

### Contexto
`App.tsx` ha superado las 1,200 líneas, convirtiéndose en un "God Component" que mezcla gestión de estado, enrutamiento manual y renderizado de Dashboard. Esto compromete la agilidad de desarrollo.

### Objetivos
1. **Reducción de Deuda Técnica:** Desacoplar responsabilidades.
2. **Estandarización UI:** Aplicar tokens premium y botones especializados en los componentes raíz.
3. **Mantenibilidad:** Extraer el Dashboard y el Header a componentes independientes.

### Fases de Ejecución
- **Fase 1: Estandarización de UI:** [COMPLETADA] Refactorizado `ConfirmModal` y títulos `<h1>`.
- **Fase 2: Desacoplamiento del Encabezado:** [COMPLETADA] Creado `PageHeader.tsx` y migrada la lógica de títulos dinámicos.
- **Fase 3: Desacoplamiento del Dashboard:** [COMPLETADA] Creado `DashboardView.tsx` y migrada la orquestación de widgets.

---

## Estrategia Multitenant (Single Image) [2026-06-13]

### Concepto
Para maximizar la escalabilidad y simplificar el mantenimiento, la plataforma utiliza un modelo de **Imagen Única (Generic Image)** para todos los clientes. Los frontends ya no tienen URLs grabadas en el build.

### Mecanismo de Resolución de API
1.  **Admin (Vite):** El cliente de API deriva la URL basándose en el hostname actual. Si el admin carga en `admin.cliente.com`, buscará la API en `api.cliente.com`.
2.  **Storefront (Next.js):** 
    *   **Lado Cliente (Browser):** Deriva `api.[domain]` igual que el Admin.
    *   **Lado Servidor (SSR):** Utiliza la variable de entorno `INTERNAL_API_URL` (configurada en Docker Compose) para comunicarse con el contenedor de API por la red interna del VPS.

### Reglas de Oro de Multitenancy
- **No Hardcoding:** Prohibido escribir nombres de clientes, dominios o marcas en el código. Todo debe venir de la tabla `settings` o del hook `useSettings`.
- **Aislamiento de DB:** Cada cliente tiene su propia base de datos física (`[cliente]_store`, `[cliente]_raffle`).
- **CI/CD Universal:** El archivo `deploy.yml` genera imágenes con el tag `latest` que son compatibles con cualquier dominio.

---

## High-End Editorial Design System (Admin) [2026-05-21]

### 1. Recursive Geometry (Nested Border Radius)
To maintain concentric harmony between containers and their children, we follow these formulas derived from the master `--radius-outer` (default `3rem` fluid):

- **Visual Formula (Padding > 40% of Radius):**
  `inner = outer - (padding * 0.75)`
  *Used for: Main components within sections (Cards, Section Icons, Section Buttons).*
  *CSS Token:* `--radius-inner-visual`

- **Simple Formula (Padding <= 30% of Radius or nested technical elements):**
  `inner = outer - padding`
  *Used for: Technical elements inside cards (Card Icons, Card Buttons, Pills).*
  *CSS Token:* `--radius-nested-simple` (clamped to a minimum of `0.5rem/8px`).

- **Autonomous Cards Context:** For Level 1 cards using `--padding-inner`, we use dedicated tokens:
  - `--radius-card-inner`: Concretic for thumbnails/icons.
  - `--radius-card-nested`: Technical radius for internal pills/buttons.

### 2. Modular Typography Scale (Major Third 1.25x)
Typography is 100% fluid via `clamp()`.
- **Ratio:** 1.250 (Major Third)
- **Hierarchy:** Hero (900) → Display (800) → H1 (700) → H2 (600) → Secondary (500) → Body (400).
- **Semantic Case:** `text-label` (10px) is no longer forced uppercase. Case is handled per component.
- **Tracking:** Refined to `0.08em` for readability in lowercase, while maintaining `0.15em` explicitly for technical uppercase labels.

### 3. Semantic Spacing (Gestalt Principles)
Spaces reflect relationships between elements (Base 4 grid):
Current expanded scale:
- `--space-xs` (4px): Intimate (Label to Value).
- `--space-sm` (8px): Close (Button to Button).
- `--space-base` (12px): Compact groups (Badge to Badge, CTA to CTA).
- `--space-md` (Fluid 16-24px): Module (Icon to Content).
- `--space-lg` (Fluid 24-40px): Group Boundary (Block to Block).
- `--space-xl` (Fluid 48-80px): Section breathing (Stage padding, large local whitespace).
- `--space-2xl` (Fluid 72-120px): Page rhythm (loading states, page endings).
- `--space-3xl` (Fluid 96-160px): Overlay depth (large gradients, empty state depth).

### 4. Component Standardization
- **NexusButton:** Context-aware (`section` vs `card`). Automatically adjusts height (`--h-button-section` vs `--h-button-card`), radius and typography.
- **NexusInputs:** Linked to `--h-input`. Uses `font-medium` for user data to avoid hierarchy competition.
- **NexusSpinner & NexusPaginator:** Shared utilities to homogenize loading and navigation across all management views.

---

## Investigation Discipline
- **Facts first:** Establish what is empirically true before hypothesizing.
- **Hypotheses second:** Formulate clear, testable assumptions based on facts.
- **Reproduce before fixing:** Confirm the failure state before applying changes.
- **Verify after every change:** Run builds, tests, or linters to confirm the outcome.

## Confirmed Facts
1. **Logo Standardization:** All logo-related configurations are unified under the `branding_logo_url` key, which stores a full Cloudflare R2 URL. Legacy keys like `sistema_logo` and `logoUrl` have been migrated and removed.
2. **Dashboard Integrity:** The `dashboardService.getStats()` API now returns a comprehensive dataset, including active products, categories, total media, latest items, and 7-day sales charts.
3. **English Alignment:** All data values for bird maturity (`COCK`, `STAG`, `HEN`, `PULLET`), purposes (`COMBAT`, `BREEDING`, `RAFFLES`), and shipping zones (`STANDARD`, `EXTENDED`) are now in English and enforced via Enums.
4. **File Naming:** All uploads are sanitized using `sanitizeFileName` (lowercase, slugified, with trailing timestamp).
5. **Cloud Storage (R2):** `storage.service.ts` uses the AWS S3 SDK to connect to Cloudflare R2.
6. **R2 Cleanup:** Automatic physical file deletion is implemented for Identity (Logo), Gallery, Store (Products), and Raffles during updates and deletions.
7. **R2 Settings:** Backend uses English keys: `r2_account_id`, `r2_access_key`, `r2_secret_key`, `r2_bucket_name`, `r2_public_domain`.
8. **Schema Integrity:** `packages/db/prisma/store/schema.prisma` correctly defines `BirdAge`, `BirdPurpose`, and `ShippingType` enums.
9. **Type Resolution:** `apps/api`, `apps/admin`, and `apps/storefront` build successfully.
10. **Golden Rule:** "Everything in English" is enforced across schema, physical database, application logic, and configuration keys.
11. **Smart Linking Verification:** WhatsApp connection flow includes a mandatory verification dialog that forces the user to confirm or update the contact number before vinculating the device, ensuring data consistency.
12. **Next.js 14 Storefront Migration:** Completed migration of `apps/storefront` from React Vite to Next.js 14 (App Router). The monorepo builds successfully.
13. **Local Dev & Standalone Stability:** Next.js standalone mode is made optional using environment variables (`NEXT_STANDALONE` or `IS_DOCKER`) to prevent EPERM symlink errors on Windows dev environments during builds, while remaining robust for Docker production containers.
14. **Dynamic Metadata SSR:** Dynamic pages for products (`/store/[id]`) and raffles (`/raffles/[id]`) are fully server-rendered (`ƒ` Dynamic) and dynamically inject rich Open Graph previews for WhatsApp/Telegram bot crawls.
15. **Hydration & Timezone Robustness:** Resolved React hydration mismatch risks in `/raffles/page.tsx` (by supporting client-side detection of `NEXT_PUBLIC_RAFFLE_ENABLED`) and `RaffleDetailsClient.tsx` (by introducing `suppressHydrationWarning` on locale-specific date formatting).
16. **Admin Settings View Integration:** Resolved a runtime `TypeError` in `App.tsx` by adding and exposing `handleSaveConfig` inside `PlatformSettingsView.tsx` via `useImperativeHandle`, matching the unified settings-saving API of all system tabs.
17. **Corrección de Selectores del Carrito:** Se identificó y corrigió un error crítico en el `storefront` donde los componentes `Header` y `BottomNav` utilizaban selectores que devolvían referencias a funciones (`getTotalItems`) en lugar de valores primitivos. Se estandarizó el uso de selectores que derivan el total directamente del estado de `items`, garantizando la reactividad y la correcta visualización del contador de productos.

## Hypotheses
**None.** All recent issues related to language mismatch and storage integration have been verified and fixed.

## Cloud Storage Strategy
- **Provider:** Cloudflare R2 (S3-compatible).
- **Pattern:** "Upload-then-Save". Assets are uploaded to R2 first, and only the resulting public URL is saved in the database.
- **Benefits:** Decouples storage from the VPS, utilizes Cloudflare CDN for fast delivery, and maintains a zero-egress cost profile.
- **Implementation:** Centralized in `storage.service.ts` for consistent error handling and URL normalization.

## Rediseño Premium del Storefront (Awwwards Style) [2026-05-21]
- **Identidad Visual:** Implementación de un stack tipográfico de alta gama: **Cabinet Grotesk** (Headers) y **Satoshi** (Body). Paleta de colores basada en OKLCH con neutros cálidos (`stone-950`, `brand-50`) y acentos tierra (`brand-500`).
- **Hero Cinematic:** Slider de pantalla completa (92vh) con animaciones de GSAP (revelación palabra por palabra) y una "Ficha Genética" en 3D interactivo con desenfoque de cristal.
- **Bento Grid Asimétrico:** Layout de alta densidad (1+2x2) para "Últimas Incorporaciones", con alineación matemática perfecta y alturas sincronizadas.
- **Galería Darkroom:** Sección visual inmersiva con paralaje 3D (desktop) y carrusel snap-center (mobile).
- **Secciones Especializadas:** Identidad diferenciada para Aves de Combate (oscura/agresiva) y Aves de Cría (clara/minimalista).
- **Scroll Reveal:** Sistema global de revelación suave de componentes al entrar al viewport para una navegación viva y fluida.

## Optimización de Medios (Smart Loading & Processing)
- **Componente SmartImage:** Implementación del patrón "Instagram" en el storefront. Las imágenes cargan con un efecto **Shimmer (Shine)** infinito y se revelan con un **Fade-in** suave solo tras la descarga completa del buffer.
- **Backend Sharp Integration:** Procesamiento automático en el servidor (`apps/api`) durante la subida a Cloudflare R2:
  - Conversión forzada a **WebP** (calidad 90).
  - Redimensionamiento inteligente a un máximo de **2000px** de ancho.
  - Remoción completa de metadatos EXIF.
  - Corregidón automática de orientación.

## Depuración Crítica del Admin
1. **Persistencia de Eliminación:** Corregido error donde productos eliminados seguían apareciendo al refrescar debido a que la ruta de administración ignoraba el filtro `active: true`.
2. **Auto-save Form Bug:** Corregido comportamiento donde el formulario de producto se guardaba solo al presionar el botón de "Galería Adicional". Se forzó `type="button"` en los botones de carga para evitar el envío accidental del formulario.
3. **TypeScript Build API:** Resuelta inconsistencia de tipos en `storage.service.ts` que impedía la compilación del backend.

## Future Cleanup: Full English Alignment
- **Goal:** Complete removal of Spanish from DB columns, Enums, and Settings keys to achieve 100% Golden Rule compliance.
## Full English Alignment
- **Status:** Completed [2026-05-02].
- **Scope:** All database columns, tables, enum values, Prisma variables, and frontend keys are now in English.
- **Key Renames:** 
  - `ARTICLE` -> `ITEM` (Backend/Frontend logic)
  - `articulo` -> `item` (DB Enum value)
  - `ave` -> `bird` (DB Enum value)
  - `subcategorias` -> `subcategories` (API/Frontend)
  - `nombre` -> `name` (DB/API/Frontend)
- **Golden Rule Implementation:** The rule "Everything in English" is now strictly enforced across the codebase.
- **UI Strategy:** "English Backend, Spanish Frontend". Use translation maps/labels in the UI.
- **Pre-migration Task (UI Audit):** Perform a comprehensive audit of all components in `apps/admin/src` to identify data-binding that relies on Spanish keys.
  - **Scope:** `Auth/`, `Media/`, `Orders/`, `Raffle/`, `Store/`, `System/`, `Widgets/`, and root components (`BottomNav`, `Header`, `QuickActions`, `useFavicon`).
  - **Admin naming:** `Medios` is the administrative module and navigation tab. `GalleryView` remains the specific view that manages the public Storefront gallery.
  - **Action:** Prepare labels/mappers for Enums (e.g., `BIRD` -> "Ave", `ITEM` -> "Artículo").

## WhatsApp Management Architecture (Deep Integration)
- **Centralized Control:** Nexus Admin is the source of truth and management interface for WhatsApp. Users never access Evolution Manager directly.
- **Backend Proxy:** `apps/api` acts as a proxy for Evolution API, handling instance creation, status checks, QR generation, and logout.
- **Automated Instance Naming:** Fixed technical names are derived from purpose: `nexus_general`, `nexus_combate`, `nexus_cria`, `nexus_rifas`.
- **Real-time UX:** Frontend polling ensures the UI reflects physical device scans immediately without manual refresh.
- **Smart Verification:** Linking flow includes a "same number?" verification step to keep storefront contact links synchronized with physical sender devices.

## Historical Decisions
- **Tooling Transition (2026-05-19):** Successfully migrated from Gemini CLI to Antigravity CLI and retired the legacy "Two-Window System" workflow. We adopted a modern, transactional Single-Agent system where strategy and direct execution occur unified in a single conversation.
- **Next.js Viability Resolution (2026-05-19):**
  - **`apps/storefront`:** Approved for Next.js App Router migration to leverage Server-Side Rendering (SSR) for dynamic Open Graph metadata (essential for sharing products/raffles on WhatsApp) and SEO optimizations.
  - **`apps/admin`:** Resolved to keep as a Vite React SPA, since it is 100% private and does not benefit from SSR, avoiding hydration issues.
  - **`apps/api`:** Resolved to maintain as a Fastify backend to support persistent background daemons like BullMQ, Redis, and Evolution API proxy connections.
- **Dynamic Payment Identity (2026-05-13):** Implemented support for dynamic `statement_descriptor` in Mercado Pago. This allows shop owners to configure their own brand name (up to 16 chars) to appear on customer bank statements, reducing chargebacks and improving professionalism.
- **Naming Convention (2026-05-02):** Decided to use `ITEM` as the standard term for non-bird products in the `ProductType` enum.
- **Centralized Evolution API Config (2026-04-30):** Moved Evolution URL and Key to global settings in the `store` database. Individual channels now only require an `instanceName`, simplifying management and reducing redundancy.
- **Phone Number Normalization (2026-04-30):** Implemented server-side normalization for Mexican phone numbers (10 digits -> 521XXXXXXXXXX) to improve UX and reduce API errors.
- **Consolidated Notifications (2026-04-30):** Modified the reservation flow to group multiple ticket purchases into a single WhatsApp message using an array of IDs in the queue.
- **WhatsApp/Evolution Type Resolution (2026-04-30):** Resolved conflict where `apps/api` was not seeing updated Prisma types.
- **Monorepo Strategy:** Turborepo + pnpm workspaces for isolation and performance.
- **Dual Schema:** Separate Store and Raffle databases to maintain modularity (Raffle is optional).
- **Prisma Output:** Clients generated to root `node_modules` to avoid workspace shadowing.
- **Price Hydration Strategy (MXN):** Estandarizamos el formateo de precios en la storefront usando la locale fija de pesos mexicanos `'es-MX'` (`formatPrice`). Esto garantiza consistencia absoluta de textos entre SSR y CSR, previniendo por completo cualquier discrepancia de hidratación de React generada por configuraciones regionales dinámicas de `.toLocaleString()`.

## Raffle Intelligence & Audience Capitalization [2026-05-26]

### Contexto
El modulo de rifas funciona como servicio opcional dentro del SaaS. El SaaS owner quiere usar la actividad de rifas para crear inteligencia comercial: segmentar participantes, medir confiabilidad de pago, detectar usuarios recurrentes, identificar abandonadores y exportar audiencias accionables.

### Decision
La primera version sera tenant-local y solo visible para `SUPERADMIN`, sin agregar contenedores ni bases nuevas en Contabo. Usara las tablas existentes de raffle (`raffles`, `ticket_sales`) y calculara metricas/segmentos desde el API actual.

### Arquitectura por fases
- **Fase 1:** `manzana-api` expone endpoints protegidos de inteligencia usando `server.rafflePrisma`; `manzana-admin` muestra la pantalla en Sistema solo para superadmin.
- **Fase 2:** Extraer el motor de scoring/segmentacion a un servicio portable que reciba un raffle Prisma client.
- **Fase 3:** Crear un servicio global `nexus-intelligence-api` o una base `nexus_intelligence` para consolidar multiples tenants.

### Documentacion
Ver `docs/ai/RAFFLE_INTELLIGENCE.md`.
