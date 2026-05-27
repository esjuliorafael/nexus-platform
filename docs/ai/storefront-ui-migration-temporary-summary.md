# Storefront UI Migration - Resumen Temporal

Fecha: 2026-05-27

Este documento resume la migracion tecnica aplicada al storefront para acercarlo al lenguaje del admin: geometria recursiva, escala tipografica modular, tokens relacionales de espaciado y componentes UI compartiendo una gramatica tecnica coherente.

No se hizo staging, commit ni push. Los cambios siguen en el working tree local.

## Objetivo

Normalizar el storefront para que hable el mismo idioma tecnico del admin sin copiar literalmente su apariencia. La intencion fue migrar fundamentos: tokens, primitivas, jerarquia, radios, alturas, espaciado, estados interactivos y estructura reusable.

## Sistema Agregado

Archivo principal:

- `apps/storefront/src/index.css`

Se agregaron tokens `--sf-*` para:

- Radios derivados: `--sf-radius-outer`, `--sf-radius-inner`, `--sf-radius-card-inner`, `--sf-radius-nested`.
- Padding relacional: `--sf-padding-outer`, `--sf-padding-inner`.
- Espaciado: `--sf-space-xs`, `--sf-space-sm`, `--sf-space-md`, `--sf-space-lg`, `--sf-space-xl`.
- Alturas: `--sf-h-input`, `--sf-h-button-section`, `--sf-h-button-card`.
- Iconos: `--sf-size-icon-*`, `--sf-size-inner-icon-*`.
- Tipografia: `--sf-text-hero`, `--sf-text-display`, `--sf-text-h1`, `--sf-text-h2`, `--sf-text-body`, `--sf-text-secondary`, `--sf-text-label`, `--sf-text-button-*`.
- Easing: `--sf-ease`, `--sf-ease-reveal`.

Utilidades agregadas:

- `.sf-text-hero`
- `.sf-text-display`
- `.sf-text-h1`
- `.sf-text-h2`
- `.sf-text-body`
- `.sf-text-secondary`
- `.sf-text-label`
- `.sf-text-button-section`
- `.sf-text-button-card`

## Componentes UI Nuevos

Se crearon:

- `apps/storefront/src/components/ui/Card.tsx`
  - `StorefrontCard`
  - Niveles de radio/padding derivados.
  - Modo `interactive`.

- `apps/storefront/src/components/ui/Icon.tsx`
  - `StorefrontIcon`
  - Variantes `brand`, `muted`, `dark`, `success`, `warning`.
  - Contextos `section` y `card`.

- `apps/storefront/src/components/ui/Field.tsx`
  - `StorefrontField`
  - `StorefrontTextarea`
  - Inputs con altura, radio, focus y labels tokenizados.

- `apps/storefront/src/components/ui/Section.tsx`
  - `StorefrontSection`
  - Header reusable para secciones.
  - Acepta props nativas de `<section>` como `id`, `style`, etc.

## Componentes UI Migrados

- `Button.tsx`
  - Variantes normalizadas.
  - Contextos `section`, `card`, `autonomous`, `default`.
  - Alturas/radios derivados por contexto.
  - Fix para `size="icon"` con `aspect-square p-0`.

- `Badge.tsx`
  - Tipografia `sf-text-label`.
  - Radios por contexto.

- `BottomSheet.tsx`
  - Radios, padding y easing del sistema.

- `EmptyState.tsx`
  - Geometria y tipografia tokenizada.

- `Countdown.tsx`
  - Migrado a `sf-text-label`.
  - Spacing tokenizado.
  - Dependencia `onExpire` corregida en `useEffect`.

- `FAQAccordion.tsx`
  - Texto corregido.
  - Migrado a `StorefrontCard`, `StorefrontIcon` y tokens `sf-*`.
  - Ahora se usa en home.

- `LayoutUtils.tsx`
  - `SectionReveal` y `SkeletonBento` alineados a easing/radios/spacing del sistema.

## Layout Global Migrado

- `components/layout/Header.tsx`
  - Nav desktop con estado activo consistente.
  - Carrito usando `Button`.
  - Geometria y timing del sistema.

- `components/layout/BottomNav.tsx`
  - Grid movil estable.
  - Radios/timing del sistema.
  - Fix de `setMounted(true)`.

- `components/layout/Footer.tsx`
  - Reestructurado con tokens.
  - Usa `StorefrontIcon`.
  - Se eliminaron links `href="#"`.
  - La columna "Politicas" paso a "Ayuda".
  - Link a `/#preguntas-frecuentes`.

- `components/layout/ClientLayout.tsx`
  - Shell base con fondo/texto del storefront.

## Pantallas Migradas

- `app/page.tsx`
  - Home reordenado con tokens.
  - Seccion "Ultimas incorporaciones" normalizada.
  - Se agrego FAQ en home usando `StorefrontSection` + `FAQAccordion`.

- `app/store/page.tsx`
  - Filtros, campos, botones y estados alineados.

- `app/store/[id]/ProductDetailsClient.tsx`
  - Detalle de producto migrado a cards/iconos/buttons/tokens.

- `app/store/[id]/page.tsx`
  - Metadata sin mojibake.
  - Estado "producto no encontrado" tokenizado y server-safe.

- `app/checkout/page.tsx`
  - Formulario, resumen, shipping zones, estados y botones migrados.
  - `catch` tipado como `unknown` con extractor seguro de mensaje.

- `app/gallery/page.tsx`
  - Galeria migrada a cards/tokens.
  - Fix de `.finally` hacia `async/await`.

- `app/raffles/page.tsx`
  - Lista de rifas migrada.
  - Fix de `.finally` hacia `async/await`.

- `app/raffles/[id]/RaffleDetailsClient.tsx`
  - Detalle de rifa migrado.

- `app/raffles/[id]/page.tsx`
  - Metadata sin mojibake.
  - Estado "sorteo no encontrado" tokenizado y server-safe.

## Componentes De Dominio Migrados

- `components/product/ProductCard.tsx`
  - Usa `StorefrontCard`, `Badge`, `Button`, `Countdown`.

- `components/product/ProductGrid.tsx`
  - Gap con `--sf-space-md`.

- `components/cart/CartDrawer.tsx`
  - Drawer migrado con cards, iconos y botones.

- `components/raffle/TicketSelectionGrid.tsx`
  - Selector y formulario migrados.
  - Iconos tipados con `LucideIcon`.

- `components/layout/ArticleShelf.tsx`
- `components/layout/BentoArrivals.tsx`
- `components/layout/BirdShowcase.tsx`
- `components/layout/GalleryFeatured.tsx`
- `components/layout/HeroSlider.tsx`
- `components/layout/RaffleSection.tsx`

Todos estos quedaron alineados a tokens, primitivas o tipografia `sf-*`.

## Tipado y API

- `api/orders.ts`
  - Se agrego `StoreOrderResponse`.
  - `create` ahora retorna ese tipo.

- `api/payments.ts`
  - Se agrego `PaymentPreferenceResponse`.
  - `getPreference` ahora retorna ese tipo.

Tipados corregidos durante revision:

- Props de iconos con `LucideIcon` en checkout, rifas, detalle de rifa, `BirdShowcase` y `TicketSelectionGrid`.

Quedan `any` heredados fuera del foco inmediato:

- `apps/storefront/src/api/products.ts`
- `apps/storefront/src/hooks/useProducts.ts`
- `apps/storefront/src/types/index.ts`
- Payload generico de `orderApi.create` en `api/orders.ts`

## Limpieza Realizada

- Se corrigio mojibake visible y metadata con caracteres rotos.
- Busqueda final sin coincidencias de `Ã`/`Â` en `apps/storefront/src`.
- Se eliminaron placeholders `href="#"`.
- Busqueda sin `TODO`, `FIXME`, `debugger`, `console.log` en storefront.

## Validaciones Ejecutadas

TypeScript:

```bash
pnpm -F @nexus/storefront exec tsc --noEmit
```

Resultado: limpio.

Rutas verificadas en dev:

- `http://localhost:3000/`
- `http://localhost:3000/#preguntas-frecuentes`
- `http://localhost:3000/store`
- `http://localhost:3000/gallery`
- `http://localhost:3000/raffles`
- `http://localhost:3000/checkout`
- `http://localhost:4000`
- `http://localhost:3001/api/v1/admin/settings`

Resultado: `200`.

Docker:

- `nexus-evolution-api`
- `nexus-raffle-db`
- `nexus-evolution-manager`
- `nexus-store-db`
- `nexus-evolution-db`
- `nexus-redis`

Resultado: todos `Up`.

`git diff --check`:

- Sin errores reales.
- Solo warnings de LF/CRLF normales en Windows.

## Build

Se hizo build controlado:

```bash
pnpm -F @nexus/storefront build
```

Resultado:

- Compila correctamente.
- Genera paginas.
- Falla al final copiando `standalone` por `EPERM` al crear symlinks en Windows.

Este error no apunta a TypeScript ni a la migracion UI. Es el bloqueo conocido del entorno Windows/symlinks con Next standalone.

Tambien aparece warning:

- `Failed to find font override values for font Bodoni Moda`

## Estado Actual Del Entorno

Dev fue levantado de nuevo despues del build:

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:4000`
- API: `http://localhost:3001`

Logs:

- `.turbo-dev.out.log`
- `.turbo-dev.err.log`

## Pendientes Sugeridos

1. Hacer una revision visual manual de:
   - Home completo.
   - Store desktop/mobile.
   - Checkout desktop/mobile.
   - Cart drawer.
   - Raffles y detalle de rifa.
   - Product detail.

2. Pulir decisiones visuales:
   - Uso de italicas en headings.
   - Densidad del hero.
   - Espaciado vertical entre secciones.
   - Footer oscuro y contraste.
   - Mobile bottom nav.

3. Revisar si `StorefrontSection` debe reemplazar headers manuales en mas pantallas.

4. Tipar deuda heredada:
   - `useProducts(filters?: any)`
   - `productsApi.getAll(params?: any)`
   - `types/index.ts` con `any`.
   - Payload de `orderApi.create`.

5. Resolver build standalone en Windows:
   - Activar Developer Mode o permisos de symlink.
   - O ajustar configuracion Next si no se requiere `standalone`.

6. Considerar paginas reales para:
   - Terminos.
   - Privacidad.
   - Politicas de envio.

Actualmente esas entradas fueron sustituidas por enlaces de ayuda reales para no dejar placeholders.

## Archivos Modificados Principales

Consultar:

```bash
git status --short
git diff --stat
```

No hay commit creado.

