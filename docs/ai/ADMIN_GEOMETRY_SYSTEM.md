# Admin Geometry System

This document defines how Admin UI components should use the recursive geometry tokens in `apps/admin/src/index.css`.

## Core Tokens

`--radius-outer`
: Root radius for level 1 surfaces: `NexusSection`, `NexusHero`, page-level cards, upload media stages, and `NexusAutonomousCard`.

`--padding-outer`
: Outer padding for section-level containers.

`--radius-inner-visual`
: First child radius inside a section-level container. Formula: `--radius-outer - (--padding-outer * 0.75)`.

`--padding-inner`
: Internal padding for autonomous cards and nested content.

`--radius-nested-simple`
: Level 3 radius inside section children. Formula: `--radius-inner-visual - --padding-inner`.

`--radius-card-inner`
: Level 2 radius inside an autonomous card. Formula: `--radius-outer - (--padding-inner * 0.75)`.

`--radius-card-nested`
: Level 3 radius inside autonomous-card children. Formula: `--radius-card-inner - --padding-inner`.

`--padding-card-micro`
: Compact padding for micro autonomous cards, such as mobile quick actions.

`--radius-card-micro-inner`
: Level 2 radius inside a micro autonomous card. Formula: `--radius-outer - (--padding-card-micro * 0.75)`.

`--padding-card-rail`
: Compact padding for autonomous rail/toolstrip containers, such as desktop quick actions.

`--radius-card-rail-inner`
: Level 2 radius inside an autonomous rail/toolstrip. Formula: `--radius-outer - (--padding-card-rail * 0.75)`.

`--padding-button-card-inline`
: Horizontal inset for card-context buttons. Formula: `--space-base * 2` (24px).

`--padding-button-inline`
: Horizontal inset for section and autonomous buttons. Formula: `(--space-base * 2) + --space-sm` (32px).

## Level Model

The Admin uses three visual levels:

1. Level 1: owning surfaces, such as `NexusSection`, `NexusHero`, `NexusModal`, `NexusAutonomousCard`, and large custom media upload cards.
2. Level 2: first children inside a level 1 surface, such as section cards, autonomous buttons, autonomous icons, thumbnails, and direct metadata badges.
3. Level 3: elements inside a level 2 child, such as controls inside section cards, icons inside nested cards, and technical controls inside autonomous-card child surfaces.

Do not choose a radius by visual size alone. Choose it from the parent/child level.

## Two Geometry Branches

### Section Branch

Use this when content lives inside `NexusSection`.

| Surface | Component | Radius |
| --- | --- | --- |
| Section shell | `NexusSection` | `--radius-outer` |
| Section header icon | `NexusSectionIcon` | `--radius-inner-visual` |
| Main section action | `NexusSectionButton` | `--radius-inner-visual` |
| Card inside section | `NexusSectionCard` | `--radius-inner-visual` |
| Icon/button/badge inside section card | `NexusCardIcon`, `NexusCardButton`, `NexusCardBadge` | `--radius-nested-simple` |
| Passive empty state icon, level 1 | `EmptyState level={1}` | `--radius-inner-visual` |
| Interactive empty/upload stage, level 1 | `InteractionStage level={1}` icon | `--radius-inner-visual` |

Example: `BillingView` uses `NexusSection` as the root surface, then `NexusSectionCard` for service rows and `NexusSectionButton` for the primary section action.

### Autonomous Branch

Use this when a card or media container lives as its own level 1 surface, not inside the visual hierarchy of a `NexusSection`.

| Surface | Component | Radius |
| --- | --- | --- |
| Autonomous card shell | `NexusAutonomousCard` or custom media card | `--radius-outer` |
| Main autonomous action/icon/badge | `NexusAutonomousButton`, `NexusAutonomousIcon`, `NexusAutonomousBadge` | `--radius-card-inner` |
| Compact action inside autonomous card | `NexusAutonomousButton density="compact"` | `--radius-card-inner` |
| Widget card inside autonomous card | `NexusWidgetCard`, `NexusControlRow` | `--radius-card-nested` |
| Loaded upload change affordance | `UploadPreviewOverlay context="autonomous"` | `--radius-card-inner` |

### Micro Autonomous Branch

Use this when an element behaves like a standalone autonomous card but needs denser padding than a standard `NexusAutonomousCard`.

| Surface | Component | Radius |
| --- | --- | --- |
| Micro autonomous shell | `NexusAutonomousCard density="micro"` or semantic button with the same tokens | `--radius-outer` |
| Direct child inside micro autonomous shell | Icon container, compact metadata | `--radius-card-micro-inner` |

Example: mobile `QuickActions` cards are micro autonomous surfaces. Their shell uses `--radius-outer`, their padding uses `--padding-card-micro`, and their icon container uses `--radius-card-micro-inner`.

### Autonomous Rail Branch

Use this when an element behaves like a compact autonomous toolbar or rail.

| Surface | Component | Radius |
| --- | --- | --- |
| Rail shell | `NexusAutonomousCard density="rail"` or semantic toolbar with the same tokens | `--radius-outer` |
| Direct action inside rail | Icon-only rail button, rail tooltip | `--radius-card-rail-inner` |

Example: desktop `QuickActions` is an autonomous rail. Its shell uses `--radius-outer`, its padding uses `--padding-card-rail`, and its buttons/tooltips use `--radius-card-rail-inner`.

Example: the loaded media area in `HomeSlideForm`, `MediaForm`, and `ProductForm` is a custom autonomous media card. Its shell uses `--radius-outer`; its floating `NexusAutonomousButton` controls and `UploadPreviewOverlay` icon container use `--radius-card-inner`.

### Modal Branch

`NexusModal` is treated as a level 1 autonomous surface, not as a `NexusSection`.

| Surface | Component | Radius |
| --- | --- | --- |
| Modal shell | `NexusModal` | `--radius-outer` |
| Modal header icon | `NexusModal iconTone` | `--radius-card-inner` |
| Close button | `NexusAutonomousButton density="compact"` | `--radius-card-inner` |
| Modal footer actions | `NexusModalActions` + `NexusAutonomousButton` | `--radius-card-inner` |
| Nested panels inside modal | Local cards/panels | `--radius-card-inner` or `--radius-card-nested`, depending on level |

`NexusModal` uses `--padding-inner`, not `--padding-outer`, because it behaves like an autonomous card. `NexusModalActions` centralizes the footer action gap so each modal does not invent its own spacing.

Use `NexusModal` for operational content and forms. Use `NexusConfirmModal` for decision dialogs such as discard changes, delete, cancel, or blocking confirmations. Confirm dialogs keep the same modal geometry but use a centered composition, no close X, and direct cancel/confirm actions.

Use `NexusMediaViewer` for image or video inspection. It is a viewport-level surface rather than an autonomous card, so it has no rounded modal shell. The component owns the portal, scroll lock, Escape behavior, focus restoration, media rendering, and every top action. Consumers pass `onEdit` and `onDelete`; they must not rebuild or restyle the close, edit, or delete controls.

`presentation="gallery"` is an inspection canvas aligned to one Admin rail (`mx-auto w-full max-w-7xl`). That rail constrains the media width, while the stage shrink-wraps the rendered media and the metadata lives inside it as a bottom overlay with a legibility gradient and `--padding-inner`. Gallery inspection must never introduce viewport scroll. Use bidirectional containment: the media has `width: auto`, `height: auto`, `max-width: 100%`, and a token-derived `max-height` based on `100dvh` minus viewer chrome. Its vertical geometry is explicit: `--padding-inner` places the controls, `--space-md` separates the controls from the media, and another `--space-md` separates the media from the viewport bottom. The viewer viewport is level 1 and remains square because it fills the screen; the media stage is its direct level 2 child and uses `--radius-inner-visual` with `overflow-hidden` to clip the media, gradient, and metadata together. Do not add an autonomous-card border or shadow. Inside the overlay use `--space-base` between badges and the text group, `--space-xs` between title and description, `--space-md` between the text group and metadata, and `--space-xs` between metadata icon, value, and label. The title uses `text-h1`, while description, value, and label use `text-secondary`; only the numeric value is bold. Badge typography remains owned globally by `NexusBadge`. Video overlays reserve additional bottom space for native controls.

`presentation="hero"` is a faithful Storefront hero preview. It owns responsive `object-position`, mobile and desktop vignette treatment, media opacity, content placement, eyebrow, title, description, and CTA representation. Its editorial rhythm is modular: eyebrow to text group uses `--space-md`, title to description uses `--space-base`, text group to CTAs uses `--space-lg`, and CTA to CTA uses `--space-sm`. The Admin and Storefront scales intentionally mirror each other: hero title uses `text-hero`, description uses `text-body`, CTA labels use `text-button-section`, and the eyebrow remains owned by `NexusBadge` through `text-label`. Do not add local font sizes, extra line-height overrides, or administrative badges such as publication state and sort order.

All viewer controls use `NexusAutonomousButton` with the same size, radius, border, translucent surface, and spacing. They belong to the viewport chrome, never to the `max-w-7xl` content rail: close occupies the upper-left corner, while edit and delete occupy the upper-right corner. Delete may add a semantic rose hover/focus response, but its default geometry and visual weight remain identical to close and edit. Initial focus belongs to the dialog container (`tabIndex="-1"`), not to the close button, so pointer-opened viewers do not show an arbitrary button focus ring. Keyboard users still receive the standard `focus-visible` ring after pressing Tab. Viewer chrome uses `--padding-inner`, action groups use `--space-sm`, and gallery content uses the App shell rail and spacing tokens.

### App Shell Branch

`App.tsx` is the Admin composition shell. It owns spacing between page regions, but it should not invent local component geometry.

| Responsibility | Rule |
| --- | --- |
| Page padding | Use space tokens for main shell padding, such as `--space-md` and `--space-lg`. |
| Region gaps | Use space tokens for gaps between `PageHeader`, `QuickActions`, and the active view. |
| QuickActions rail placement | The shell wrapper centers or places the rail; `QuickActions` owns only its internal rail/card geometry. |
| Global confirm dialogs | Use `NexusConfirmModal`. |
| Global fallback cards | Use `NexusAutonomousCard` instead of hand-rolled page-level cards. |
| Global toast | Treat the toast as a temporary autonomous surface and use autonomous child radius/buttons for its internal controls. |

Avoid adding external margins inside reusable components to solve page composition. The parent shell or owning view should create the gap between sibling regions.

## Component Usage Rules

1. Use `NexusSection` for major grouped page modules with a title, subtitle, icon, and optional action.
2. Inside `NexusSection`, use `NexusSectionButton` for the section-level action.
3. Inside `NexusSection`, use `NexusSectionCard` for repeated records or internal cards.
4. Inside `NexusSectionCard`, use `NexusCardButton`, `NexusCardIcon`, and `NexusCardBadge`.
5. Use `NexusAutonomousCard` for standalone cards that are not visually owned by a `NexusSection`.
6. Inside autonomous cards, use `NexusAutonomousButton` and `NexusAutonomousIcon` for primary floating or header controls.
7. Inside autonomous cards, use `NexusAutonomousButton density="compact"` for compact row actions that need `--size-button-card` but autonomous-card geometry.
8. Use the badge wrapper that matches ownership: `NexusSectionBadge`, `NexusCardBadge`, or `NexusAutonomousBadge`.
9. Use `InteractionStage` for an interactive empty/upload/select state.
10. Use `EmptyState` for passive empty states only.
11. Use `UploadPreviewOverlay` only when a media preview already exists and the hover action is to change that media.

## Badge Rules

`NexusBadge` is context-aware. Prefer wrappers over passing `context` manually:

| Wrapper | Context | Radius | Use case |
| --- | --- | --- | --- |
| `NexusSectionBadge` | `section` | `--radius-inner-visual` | Direct badge/action metadata owned by a section-level surface. |
| `NexusCardBadge` | `card` | `--radius-nested-simple` | Badge inside `NexusSectionCard`, such as `UsersView` username, role, and active state. |
| `NexusAutonomousBadge` | `autonomous` | `--radius-card-inner` | Direct badge inside `NexusAutonomousCard`, such as `ProductCard`, `HomeSlideCard`, and `CategoryCard` metadata. |
| `NexusBadge` default | `default` | `--radius-nested-simple` | Fallback only. Prefer an explicit wrapper. |

Do not expose or use a generic `nested` badge context unless there is a concrete level 3 badge case. Most metadata badges in autonomous cards are level 2, not level 3.

## Upload Media Pattern

For a large upload surface:

1. Empty state:
   - Use `InteractionStage level={1}`.
   - The shell radius is `--radius-outer`.
   - The icon container radius is `--radius-inner-visual`.

2. Loaded state:
   - The media shell is an autonomous card with `--radius-outer`.
   - Floating media/type and remove controls use `NexusAutonomousButton`.
   - Do not add a full-card dark overlay.
   - Hover change affordance uses `UploadPreviewOverlay` with default `context="autonomous"`.

Do not hand-roll a `bg-black/40 + rounded-full + PlusCircle` overlay in individual forms. Reuse `UploadPreviewOverlay`.

`UploadPreviewOverlay` must not paint a full-card darkening layer. It is only the reusable centered change affordance, comparable to a compact stage for an already-loaded media preview.

## Choosing The Radius

Ask first: "Who owns this element visually?"

If owned by a `NexusSection`:
: use the section branch.

If it is a standalone card/surface:
: use the autonomous branch.

If it is metadata or a small control inside a card:
: determine whether it is a direct child of the level 1 card or inside a level 2 child. Direct metadata in autonomous cards uses `--radius-card-inner`; metadata inside section cards uses `--radius-nested-simple`.

Avoid choosing a token by size alone. The correct token comes from parent ownership, not from whether the element looks small.
