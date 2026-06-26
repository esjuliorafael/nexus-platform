# Storefront Geometry System

This document defines how Storefront UI components should use the recursive geometry tokens in `apps/storefront/src/index.css`.

The Storefront follows the same parent-owned geometry principle as Admin: choose radius, spacing, and typography from the visual owner of the element, not from the element's apparent size.

## Core Intent

The Storefront is public, commercial, and editorial. It can feel warmer and more immersive than Admin, but it must still be systematic:

1. Product, gallery, contact, checkout, and raffle surfaces must share the same token grammar.
2. Reusable components should own geometry. Page files should compose them, not recreate their radii or heights.
3. Local utility classes may tune layout, but they should not replace semantic tokens for radius, padding, height, or typography.
4. Cards must not be nested casually. A child surface only becomes a new card level when it has a real grouping purpose.

## Token Families

### Color Tokens

`--sf-bg-app`
: App background. Use for page-level background.

`--sf-bg-card`
: Elevated content surface background. Prefer component defaults before setting it manually.

`--sf-bg-muted`
: Muted panels and low-emphasis surfaces.

`--sf-text-main`
: Primary text color.

`--sf-text-muted`
: Secondary text color.

`--sf-border-main`
: Default structural border color.

### Level 1 Tokens

`--sf-radius-outer`
: Root radius for major surfaces: section shells, autonomous cards, modal shells, empty states, and large media stages.

`--sf-padding-outer`
: Generous padding for large owning surfaces.

`--sf-inset-page-mobile`
: Horizontal page/content inset on mobile. Use for page wrappers and public layout sections instead of raw `px-6`.

### Level 2 Tokens

`--sf-radius-inner`
: First child radius inside a level 1 section-style surface. Formula: `--sf-radius-outer - (--sf-padding-outer * 0.75)`.

`--sf-radius-inner-visual`
: Alias for `--sf-radius-inner`. Use when the code needs to clarify that the token is used for visual children.

`--sf-padding-inner`
: Standard internal padding for autonomous cards, modal content, overlays, and child surfaces.

### Level 3 Tokens

`--sf-radius-nested`
: Radius for elements inside level 2 children. Formula: `--sf-radius-inner - --sf-padding-inner`.

`--sf-radius-nested-simple`
: Alias for `--sf-radius-nested`.

### Autonomous Card Tokens

`--sf-radius-card-inner`
: Direct child radius inside an autonomous level 1 card. Formula: `--sf-radius-outer - (--sf-padding-inner * 0.75)`.

`--sf-radius-card-nested`
: Radius for elements inside an autonomous-card child. Formula: `--sf-radius-card-inner - --sf-padding-inner`.

`--sf-radius-card-nested-compact`
: Compact level 3 radius inside autonomous-card children that use `--sf-space-base` instead of `--sf-padding-inner`.

`--sf-radius-media-tile`
: Autonomous media tile radius for selectable media frames that live directly in page flow. It currently aliases `--sf-radius-outer`.

### Spacing Tokens

`--sf-space-xs`
: 4px. Tight internal relationships: icon to label in badges, title to metadata, small grouped controls.

`--sf-space-sm`
: 8px. Close sibling controls, small text groups, button groups.

`--sf-space-base`
: 12px. Compact card rhythm and small internal clusters.

`--sf-space-md`
: 16px to 24px. Module spacing: icon to text, header groups, media viewer chrome to content.

`--sf-space-lg`
: 24px to 40px. Boundary spacing between groups.

`--sf-space-xl`, `--sf-space-2xl`, `--sf-space-3xl`
: Large section rhythm. Use for page bands and editorial separation, not for small component internals.

### Heights And Sizes

`--sf-h-input`
: Standard input and select height.

`--sf-h-button-section`
: Primary CTA height for section-level or autonomous actions.

`--sf-h-button-card`
: Compact action height for card-level actions.

`--sf-h-mobile-nav`
: Fixed mobile bottom navigation height. The nav shell owns this height so page-level mobile chrome does not drift by label length or route count.

`--sf-size-mobile-nav-item`
: Derived icon-only item size inside mobile bottom navigation. Formula: `--sf-h-mobile-nav - (--sf-space-sm * 2)`.

`--sf-size-mobile-nav-icon`
: Icon size inside mobile fixed chrome controls: `BottomNav`, `ProductTopBar`, and `ProductPurchaseBar`.

`--sf-radius-mobile-nav-item`
: Radius for direct controls inside mobile bottom navigation and product purchase bars. Formula: `--sf-radius-outer - (--sf-space-sm * 0.75)`.

`--sf-inset-mobile-chrome`
: Horizontal inset for fixed mobile chrome. It derives from `--sf-inset-page-mobile` so fixed bars align with the mobile content rail.

`--sf-inset-mobile-chrome-block`
: Vertical inset for fixed mobile chrome such as `BottomNav`, `ProductTopBar`, and `ProductPurchaseBar`. It derives from `--sf-space-lg`.

`--sf-size-icon-section`
: Icon container size for section and autonomous direct-child icons.

`--sf-size-icon-card`
: Icon container size for card-level icons.

`--sf-size-inner-icon-section`
: Lucide icon size inside section/autonomous icon containers.

`--sf-size-inner-icon-card`
: Lucide icon size inside card icon containers and compact buttons.

`--sf-size-inner-icon-badge`
: Lucide icon size inside badges and compact inline controls.

`--sf-size-stage-container`, `--sf-size-stage-container-compact`
: Empty state and stage icon container sizes.

`--sf-size-stage-icon`, `--sf-size-stage-icon-compact`
: Icon sizes inside stage containers.

### Typography Tokens

Use utility classes instead of raw `font-size` values:

| Utility | Token | Use |
| --- | --- | --- |
| `sf-text-hero` | `--sf-text-hero` | First-viewport hero titles only. |
| `sf-text-display` | `--sf-text-display` | Section headings and high-emphasis editorial titles. |
| `sf-text-h1` | `--sf-text-h1` | Card titles, modal titles, media viewer titles. |
| `sf-text-h2` | `--sf-text-h2` | Secondary headings inside sections. |
| `sf-text-body` | `--sf-text-body` | Main readable copy. |
| `sf-text-secondary` | `--sf-text-secondary` | Supporting copy, metadata, descriptions. |
| `sf-text-secondary-strong` | `--sf-text-secondary` | Compact item titles that need stronger emphasis. |
| `sf-text-label` | `--sf-text-label` | Labels, badges, uppercase metadata. |
| `sf-text-caption` | `--sf-text-caption` | Very compact uppercase UI labels. |
| `sf-text-button-section` | `--sf-text-button-section` | Section-level buttons. |
| `sf-text-button-autonomous` | `--sf-text-button-autonomous` | Default autonomous buttons. |
| `sf-text-button-card` | `--sf-text-button-card` | Compact card buttons and segmented controls. |

Do not create local text sizes for component internals unless the token scale has a real gap.

## Level Model

The Storefront uses three visual levels:

1. Level 1: owning surfaces. Examples: page sections, autonomous product cards, contact cards, checkout panels, modal sheets, empty states, media viewer stages.
2. Level 2: first children inside level 1. Examples: direct icons, badges, buttons, thumbnails, segmented-control shells, child panels.
3. Level 3: elements inside level 2 children. Examples: buttons inside child panels, selected options inside segmented controls, compact metadata inside nested cards.

The key question is always: who owns this element visually?

If the owner is a section-style surface, use the section branch. If the owner is a standalone card, use the autonomous branch. If the element sits inside a card that is already inside a section, use the nested branch.

## Geometry Branches

### Section Branch

Use this when a page section or editorial band owns the content.

| Surface | Component | Radius |
| --- | --- | --- |
| Section wrapper | `StorefrontSection` or page section layout | Usually square page flow, spacing owned by `--sf-space-xl` |
| Section heading icon | `StorefrontIcon context="section"` | `--sf-radius-inner` |
| Section action | `Button context="section"` or `StorefrontSectionButton` | `--sf-radius-inner` |
| Card inside section | `StorefrontSectionCard` | `--sf-radius-card-inner` through `level={2}` |
| Button inside section card | `Button context="card"` or `StorefrontCardButton` | `--sf-radius-nested` |
| Badge inside section card | `Badge context="card"` or `StorefrontCardBadge` | `--sf-radius-nested` |

Use cases:

- Checkout form panels inside the checkout page.
- Informational rows inside a section.
- Raffle detail panels inside a product-like page.

### Autonomous Branch

Use this when a card lives as its own level 1 surface.

| Surface | Component | Radius |
| --- | --- | --- |
| Autonomous card shell | `StorefrontAutonomousCard` | `--sf-radius-outer` |
| Direct icon | `StorefrontIcon context="autonomous"` | `--sf-radius-card-inner` |
| Direct action | `Button context="autonomous"` or `StorefrontAutonomousButton` | `--sf-radius-card-inner` |
| Compact direct action | `Button context="autonomous" density="compact"` | `--sf-radius-card-nested-compact` |
| Direct badge | `Badge context="autonomous"` or `StorefrontAutonomousBadge` | `--sf-radius-card-inner` |
| Thumbnail/media shell inside card | Local element owned by card | `--sf-radius-card-inner` |
| Control inside thumbnail/media shell | `Button context="card"` or local level 3 control | `--sf-radius-card-nested` |

Use cases:

- `ProductCard`.
- Contact person cards.
- Gallery tiles if they are rendered as standalone cards rather than bare media tiles.
- Raffle list cards.

### Nested Branch

Use this when an element lives inside a level 2 child.

| Surface | Component | Radius |
| --- | --- | --- |
| Nested shell | `StorefrontNestedCard` | `--sf-radius-card-nested` |
| Nested action | `Button context="card"` | `--sf-radius-nested` or explicit nested token if inside section branch |
| Nested badge | `Badge context="card"` | `--sf-radius-nested` |

Use cases:

- A payment detail row inside a checkout card.
- A small metadata panel inside a raffle detail card.
- A compact state chip inside a product card's internal media shell.

Avoid level 3 unless the grouped content truly needs its own boundary.

### Modal Branch

`StorefrontModal` is a level 1 autonomous surface, not a section.

| Surface | Component | Radius |
| --- | --- | --- |
| Modal shell | `StorefrontModal` | `--sf-radius-outer` |
| Header icon | `StorefrontIcon context="section"` currently, visually level 2 | `--sf-radius-inner` |
| Close button | Modal internal close button | Should match level 2 control geometry |
| Default actions | `Button context="section"` | `--sf-radius-inner` |
| Confirm content | `StorefrontConfirmModal` | Compact modal, no custom local shell |

Desktop modal width is semantic:

- `width="compact"` uses `--sf-width-modal-compact`.
- `width="standard"` uses `--sf-width-modal-standard`.
- `width="wide"` uses `--sf-width-modal-wide`.

On mobile, modals behave as bottom sheets:

- Top corners keep `--sf-radius-outer`.
- Bottom corners should terminate flush against the viewport.
- Bottom spacing must account for safe areas when needed.

Use `StorefrontConfirmModal` for destructive or blocking decisions. Do not build one-off confirm dialogs with generic modal content.

### Media Viewer Branch

`MediaViewer` is a viewport-level inspection surface, not a modal card.

| Surface | Component | Rule |
| --- | --- | --- |
| Viewer viewport | `MediaViewer` | Full screen, no rounded shell |
| Viewer chrome buttons | `Button context="autonomous" size="icon"` | Floating level 2 controls |
| Media stage | Internal stage | `--sf-radius-card-inner`, `overflow-hidden` |
| Metadata overlay | Internal overlay | `--sf-padding-inner` and tokenized gaps |
| Navigation buttons | `Button context="autonomous" size="icon"` | Same geometry as close |

Rules:

1. Close, previous, and next controls belong to viewport chrome, not to the content rail.
2. The content rail uses `max-w-7xl`.
3. The media stage must avoid page scroll by using token-derived `max-height`.
4. Metadata lives inside the media stage with a gradient for legibility.
5. Mobile swipe navigation is valid when `canNavigate` is enabled.

### Mobile Navigation Branch

`BottomNav` is a floating mobile app-shell surface. It is not a section and it is not a content card.

| Surface | Component | Rule |
| --- | --- | --- |
| Navigation shell | `BottomNav` internal `nav` | Content-sized white surface for primary links, neutral border, `--sf-h-mobile-nav`, `--sf-radius-outer`, `--sf-space-sm` padding |
| Cart shell | `BottomNav` cart surface | Separate content-sized white surface, `--sf-space-sm` away from the navigation shell |
| Inactive action | Link or cart button | Icon only, `--sf-size-mobile-nav-item` width and height |
| Active action | Link or cart button | Soft brand fill, horizontal icon plus label, `--sf-space-sm` gap, content-sized width |
| Action radius | Direct internal item | `--sf-radius-mobile-nav-item` |
| Action icon | Direct internal icon | `--sf-size-mobile-nav-icon` |
| Label | Active item label | `sf-text-caption`, single line, truncate if needed |

Rules:

1. Inactive mobile nav actions show only the icon.
2. The selected action shows icon and label in a horizontal pill.
3. Do not place the label under the icon.
4. The nav height must come from `--sf-h-mobile-nav`, not from `min-h-*` utilities.
5. The cart lives in a separate level 1 shell and remains icon-only even when the cart drawer is open.
6. The outer wrapper should use content width with a viewport max. Do not force the rail to `w-full` or `w-[92%]`.
7. The nav shell is a level 1 autonomous rail, so it uses `--sf-radius-outer`.
8. Direct nav actions are level 2 children of the autonomous rail, so they use `--sf-radius-mobile-nav-item`, not `--sf-radius-card-nested`.
9. The active action should remain content-sized. Do not use `flex-1` because it creates excessive horizontal padding around the icon and label.
10. Keep the shell sober: white fill, gray border, and restrained elevation. Do not use experimental material effects by default.
11. Fixed mobile chrome must use `--sf-inset-mobile-chrome` for horizontal viewport bounds and `--sf-inset-mobile-chrome-block` for vertical viewport bounds.
12. If the mobile page inset changes, update `--sf-inset-page-mobile`; mobile chrome follows through `--sf-inset-mobile-chrome`.
13. Mobile chrome icons must use `--sf-size-mobile-nav-icon`, not local numeric Lucide sizes.

### Product Purchase Bar Branch

`ProductPurchaseBar` is the mobile replacement for `BottomNav` on product detail routes. It is contextual purchase chrome, not global navigation.

| Surface | Component | Rule |
| --- | --- | --- |
| Purchase shell | `ProductPurchaseBar` | Full available mobile width, white surface, neutral border, `--sf-h-mobile-nav`, `--sf-radius-outer`, `--sf-space-sm` padding |
| Price | Left content | Product price only, high emphasis, single line |
| Purchase action | Right content | `Button context="autonomous"`, height constrained to `--sf-size-mobile-nav-item`, radius set to `--sf-radius-mobile-nav-item` |
| Purchase action icon | Button icon | `--sf-size-mobile-nav-icon` through `--sf-button-icon-size` |

Rules:

1. Use this only on product detail routes.
2. Hide the global `BottomNav` while this bar is active.
3. Keep the height exactly aligned to `--sf-h-mobile-nav`.
4. Keep the desktop product CTA in the page content, but hide that duplicate CTA on mobile.
5. Add mobile bottom padding to the product page so the fixed purchase bar does not cover content.
6. The purchase action is a direct level 2 child of the purchase shell, so it uses `--sf-radius-mobile-nav-item` and `sf-text-button-autonomous`, not compact card geometry.
7. When the purchase bar is active on mobile, hide the duplicate price under the product title. Keep that title price visible on desktop.
8. Align the purchase shell to `--sf-inset-mobile-chrome`, matching the product page horizontal padding.
9. Prefer fixed `left/right` insets over `width: calc(100vw - ...)` for full-width mobile chrome, because `100vw` can include scrollbar width and visually exceed the content rail.
10. Position the purchase shell with `--sf-inset-mobile-chrome-block`, not hardcoded `bottom-*` utilities.

### Product Top Bar Branch

`ProductTopBar` is the mobile top chrome for product detail routes. It restores back navigation and cart access while the global `BottomNav` is hidden.

| Surface | Component | Rule |
| --- | --- | --- |
| Back rail | `ProductTopRail` | Separate white rail on the top-left, `--sf-h-mobile-nav`, `--sf-radius-outer`, `--sf-space-sm` padding |
| Product title | Center text | Single-line truncated product name between top rails |
| Cart rail | `ProductTopRail` | Separate white rail on the top-right, same geometry as back rail |
| Back action | Internal button | `--sf-size-mobile-nav-item`, `--sf-radius-mobile-nav-item`, icon only |
| Cart action | Internal button | `--sf-size-mobile-nav-item`, `--sf-radius-mobile-nav-item`, icon only, notification badge when cart has items |
| Top action icons | Internal icons | `--sf-size-mobile-nav-icon` |

Rules:

1. Use this only on product detail routes.
2. Keep both rails independent, mirroring the separated cart rail from mobile `BottomNav`.
3. The back action should call browser history when available and fall back to `/store`.
4. The cart action opens the shared cart drawer through cart UI state.
5. Hide the textual "back to catalog" link on mobile when this bar is active; keep it visible on desktop.
6. Add enough mobile top padding to the product detail page so this fixed top chrome does not overlap content.
7. Align the top rails to `--sf-inset-mobile-chrome`, matching the product page horizontal padding.
8. Product title text between rails must be single-line and truncated.
9. Position the top rails with `--sf-inset-mobile-chrome-block`, not hardcoded `top-*` utilities.

## Component Usage

### StorefrontCard

`StorefrontCard` is the primitive. Prefer semantic aliases in page code:

```tsx
<StorefrontAutonomousCard>...</StorefrontAutonomousCard>
<StorefrontSectionCard>...</StorefrontSectionCard>
<StorefrontNestedCard>...</StorefrontNestedCard>
```

Use `StorefrontCard` directly only when the level is dynamic or when a migration needs explicit `level`.

`density` rules:

- `default`: largest level-appropriate padding.
- `compact`: reduced padding for standalone commerce cards.
- `micro`: only for very compact level 2 or level 3 widgets.
- `none`: full-bleed media frames or controlled shells where the direct child owns all internal padding.

If media must be full-bleed, use `density="none"`. Do not rely on `p-0`, because `StorefrontCard` owns padding through inline styles.

### StorefrontAutonomousCard

Use for standalone commerce cards and public-facing cards that are not visually inside another card:

- Product cards.
- Contact cards.
- Raffle list cards.
- Skeleton cards in public listing pages.

Inside it, use autonomous context for direct child icons/actions/badges, and card context for controls inside child panels.

### StorefrontSectionCard

Use for cards that are visually owned by a larger section or form:

- Checkout input panels.
- Summary panels.
- Detail cards inside a section layout.

Inside it, use `context="card"` for buttons, badges, and icons.

### StorefrontNestedCard

Use sparingly. It represents a level 3 grouped element, not a generic way to add a border.

### StorefrontButton

`Button` is the primitive and `StorefrontButton` is its alias.

Context determines height, typography, and radius:

| Context | Use | Height | Radius |
| --- | --- | --- | --- |
| `section` | Main section actions and modal actions | `--sf-h-button-section` | `--sf-radius-inner` |
| `autonomous` | Direct actions inside autonomous cards or floating viewer chrome | `--sf-h-button-section` by default | `--sf-radius-card-inner` |
| `autonomous` + `density="compact"` | Compact direct actions in autonomous cards | `--sf-h-button-card` | `--sf-radius-card-nested-compact` |
| `card` | Actions inside section cards or level 2 child surfaces | `--sf-h-button-card` | `--sf-radius-nested` |
| `default` | Transitional fallback | Depends on size | Prefer explicit context |

Use `icon`, `isIconOnly`, and `isLoading` instead of hand-rolling icon alignment.

Important `asChild` rule:

When `asChild` is used, the component renders exactly one child through `Slot`. It does not inject `icon` or loading markup into the child. Put the icon inside the child anchor if needed.

### StorefrontBadge

Prefer explicit context:

| Wrapper or context | Use | Radius |
| --- | --- | --- |
| `StorefrontSectionBadge` or `context="section"` | Direct badge owned by section-level content | `--sf-radius-inner` |
| `StorefrontCardBadge` or `context="card"` | Badge inside cards or media overlays | `--sf-radius-nested` |
| `StorefrontAutonomousBadge` or `context="autonomous"` | Direct badge inside autonomous card | `--sf-radius-card-inner` |
| `context="default"` | Fallback only | `--sf-radius-nested` |

Overlay variants:

- `overlay`: neutral media overlay.
- `overlayBrand`: brand media overlay.
- `overlaySuccess`: success state overlay.

Badge typography is always `sf-text-label`. Do not override badge font size locally.

### StorefrontIcon

Use `StorefrontIcon` for icon containers, not raw rounded divs.

| Context | Use | Size | Radius |
| --- | --- | --- | --- |
| `section` | Section headers and modal visual anchors | `--sf-size-icon-section` | `--sf-radius-inner` |
| `autonomous` | Direct icon in autonomous cards | `--sf-size-icon-section` | `--sf-radius-card-inner` |
| `card` | Icon inside cards and child panels | `--sf-size-icon-card` | `--sf-radius-nested` |

Use raw Lucide icons only when they are inline text icons, such as metadata rows or badge icons.

### StorefrontField, StorefrontSelect, StorefrontTextarea

Use these for forms instead of raw inputs and selects.

Rules:

1. Inputs and selects use `--sf-h-input`.
2. Labels use `sf-text-label`.
3. Field gap uses `--sf-space-xs`.
4. Input radius currently uses `--sf-radius-inner`, which matches section-level form controls.
5. Inline error text uses label scale. Prefer toast or confirm flows for errors that would cause layout jumps in dense forms.

### SegmentedControl

Use for filter modes and small option sets.

Rules:

1. Shell is a compact level 2 control with `--sf-radius-card-inner`.
2. Options use `--sf-h-button-card`.
3. Selected option radius uses `--sf-radius-card-nested`.
4. Gap and padding use `--sf-space-xs`.

Do not replace segmented controls with raw pill button groups.

### StorefrontPaginator

Use for paginated public lists.

Rules:

1. Container gap uses `--sf-space-sm`.
2. Page buttons use `Button context="card"`.
3. Previous and next buttons use icon-only card buttons.
4. It returns `null` when `totalPages <= 1`; consumers should not add empty wrappers.

### EmptyState

Use for passive empty states.

Rules:

1. Shell is level 1 and uses `--sf-radius-outer`.
2. Padding is `--sf-padding-outer` or `--sf-padding-inner` when compact.
3. Stage icon container uses `--sf-radius-inner`.
4. Title uses `sf-text-h1`; description uses `sf-text-secondary`.
5. Action uses `Button context="card"` because it lives inside the empty-state content group.

### StorefrontConfirmModal

Use for irreversible or blocking decisions:

- Remove item from cart.
- Cancel checkout state.
- Confirm destructive actions.

It should remain visually simpler than an operational modal. Do not add secondary descriptions or unrelated content.

## Page Patterns

### Store

Use:

- `StorefrontField` for search.
- `SegmentedControl` for type and status filters.
- `ProductCard` for product results.
- `EmptyState` for no results.
- `Button context="section"` for filter application or high-level actions.

Product cards are autonomous. Their internal media frame is a level 2 child.

### Product Detail

Use:

- Level 1 or section cards for media and purchase panels.
- `Badge context="section"` for product-level labels near the title.
- `Button context="section"` for purchase CTAs.
- `StorefrontIcon context="card"` for benefit rows inside cards.
- On mobile product detail, hide the title price when `ProductPurchaseBar` is active.
- If additional product gallery media exists, show a horizontal thumbnail rail after the description and before technical product stats.
- Additional gallery thumbnails are autonomous media tiles, not mobile chrome controls. Use `--sf-radius-media-tile`, not `--sf-radius-mobile-nav-item`.
- Product cover media opens `MediaViewer` on click/tap. Additional gallery thumbnails open `MediaViewer` directly at their media index, even when they are not the active cover media.
- On mobile, horizontal swipe on the product cover media changes the active product media. Keep this gesture separate from tap-to-open so a swipe does not also open the viewer.
- Product bird metadata (`No. Anillo`, `Edad / Etapa`, `Proposito`) belongs in an autonomous information card when shown as a grouped editorial block.
- Product guidance copy (`Tiempo de Apartado`, `Envios`, `Atencion y Comunicacion`) should stay as a light editorial section unless it needs actions or form controls.

### Gallery

Use:

- Bare media tiles or autonomous cards depending on whether the tile includes card chrome.
- `Badge context="section"` for section-level filters and headings.
- `MediaViewer` for inspection.

The gallery pattern should preserve alternating visual rhythm. Do not flatten it into identical cards unless the content model changes.

### Contact

Contact cards are autonomous cards. The person icon is a direct child and should use `StorefrontIcon context="autonomous"`.

Contact actions can use `Button asChild`; remember to put icons inside the anchor child when using `asChild`.

### Checkout

Checkout uses section-owned cards and form controls:

- `StorefrontField`, `StorefrontSelect`, and `StorefrontTextarea` for form inputs.
- `StorefrontSectionCard` or `StorefrontCard level={2}` for grouped panels.
- `StorefrontConfirmModal` for removing products.
- Toasts for non-blocking validation.

Avoid custom dropdowns unless native select cannot satisfy the UX.

### Raffles

Raffle list cards are autonomous public cards. Ticket grids use pagination once the set is large enough to harm scanability or mobile performance.

Use `StorefrontPaginator` instead of local pagination controls.

## Motion And Interaction

Use `--sf-ease` for standard transitions and `--sf-ease-reveal` for modal or viewer reveal motion.

Allowed:

- Transform and opacity transitions.
- Small active scale on buttons.
- Hover elevation on interactive autonomous cards.

Avoid:

- Animating layout properties.
- Large decorative blur surfaces.
- Local transition curves that fight the system.

## Do And Do Not

Do:

- Prefer semantic wrappers over raw primitives.
- Use `context` explicitly when using `Button`, `Badge`, or `StorefrontIcon`.
- Use tokenized inline styles for spacing when Tailwind does not map cleanly to a token.
- Keep page composition gaps in the page or shell, not inside reusable components.
- Use `StorefrontConfirmModal` for decisions and `StorefrontModal` for operational content.

Do not:

- Add local `rounded-*` utilities to system components unless you are deliberately overriding a known edge case.
- Use raw `p-*`, `gap-*`, or `text-*` values for reusable component internals.
- Put cards inside cards without a real level change.
- Add local `max-w-*` to modals. Use semantic modal width.
- Override badge typography.
- Use `asChild` with `icon` expecting the icon to render automatically.

## Migration Checklist

When touching a Storefront screen:

1. Identify every level 1 surface.
2. Replace standalone cards with `StorefrontAutonomousCard`.
3. Replace section-owned cards with `StorefrontSectionCard`.
4. Replace raw buttons with `Button` and the correct `context`.
5. Replace raw badges with `Badge` and the correct `context`.
6. Replace raw icon containers with `StorefrontIcon`.
7. Replace raw inputs/selects with `StorefrontField`, `StorefrontSelect`, or `StorefrontTextarea`.
8. Replace custom empty panels with `EmptyState`.
9. Replace custom confirm dialogs with `StorefrontConfirmModal`.
10. Run TypeScript and inspect desktop plus mobile layouts.

## Validation Commands

Use these before finishing Storefront geometry work:

```powershell
node node_modules\typescript\bin\tsc -p apps/storefront/tsconfig.json --noEmit
git diff --check
```

For route smoke checks when the dev server is running:

```powershell
Invoke-WebRequest -Uri http://localhost:3000/store -UseBasicParsing -TimeoutSec 15
Invoke-WebRequest -Uri http://localhost:3000/gallery -UseBasicParsing -TimeoutSec 15
Invoke-WebRequest -Uri http://localhost:3000/contact -UseBasicParsing -TimeoutSec 15
Invoke-WebRequest -Uri http://localhost:3000/checkout -UseBasicParsing -TimeoutSec 15
Invoke-WebRequest -Uri http://localhost:3000/raffles -UseBasicParsing -TimeoutSec 15
```
