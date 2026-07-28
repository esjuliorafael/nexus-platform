# Admin Motion System

This document defines the temporal hierarchy and interaction rules for Nexus Admin.

Admin is an operational product. Motion must communicate state, continuity, focus, or spatial origin. It must never delay routine work or behave as decoration.

## Foundation

Admin shares Storefront's 40/80 ms pulse and easing vocabulary, but uses shorter deliberate transitions because administrators work through repeated tasks.

| Token | Value | Use |
| --- | ---: | --- |
| Instant | `120ms` | Press feedback and reduced-motion transitions. |
| Fast | `160ms` | Icons, badges, and internal exits. |
| Standard | `240ms` | Controls, overlays, and compact reveals. |
| Deliberate | `320ms` | Drawers, sheets, and modal panels. |
| Half pulse | `40ms` | Fine sequencing. |
| Full pulse | `80ms` | Separation between hierarchy levels. |

The TypeScript source of truth is `apps/admin/src/lib/motion.ts`.

## Easing

- Standard: `cubic-bezier(0.23, 1, 0.32, 1)`.
- Reveal: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Exit: `cubic-bezier(0.7, 0, 0.84, 0)`.

Do not use bounce or elastic easing. Do not animate layout properties when opacity and transform can express the relationship.

## Temporary Surfaces

Drawers, bottom sheets, full-screen mobile drawers, modals, and confirmation dialogs follow one lifecycle.

### Entrance

| Element | Start | Duration |
| --- | ---: | ---: |
| Backdrop | `0ms` | `240ms` |
| Panel | `40ms` | `320ms` |
| Header identity | `120ms` | `240ms` |
| Close control | `160ms` | `240ms` |
| Content | `200ms` | `240ms` |
| Footer/actions | `240ms` | `240ms` |

The phases overlap. The panel is usable as soon as its controls are visible; the sequence is not a checklist.

### Exit

| Element | Start | Duration |
| --- | ---: | ---: |
| Footer/actions | `0ms` | `160ms` |
| Content and close control | `40ms` | `160ms` |
| Header identity | `80ms` | `160ms` |
| Panel | `80ms` | `240ms` |
| Backdrop | `160ms` | `160ms` |

The component remains mounted and body scroll remains locked until the complete `320ms` exit finishes.

## Spatial Meaning

- Desktop drawer: enters from the right.
- Mobile bottom sheet: enters from the bottom.
- Desktop modal: short vertical displacement, opacity, and minimal scale.
- Full-screen mobile drawer: enters from the right.
- Confirmation dialog: modal on desktop, bottom sheet on mobile.

## Internal Ownership

The temporary surface owns its entrance. Inputs and other nested controls must not replay autonomous mount animations inside it. Dynamic feedback triggered after opening may animate independently when it communicates a new state.

## Accessibility

Every temporary surface must:

1. Expose `role="dialog"` or `role="alertdialog"` and `aria-modal="true"`.
2. Move focus inside after opening.
3. Trap Tab and Shift+Tab while present.
4. Close with Escape when dismissible.
5. Return focus to the control that opened it after the exit finishes.
6. Keep page scroll locked through the complete exit.
7. Respect `prefers-reduced-motion` by using a `120ms` opacity transition without spatial movement.

## Product Rules

1. Cause precedes consequence: backdrop, panel, identity, content, action.
2. Repeated operational transitions stay faster than Storefront editorial motion.
3. Opening and closing are both designed states; never unmount a visible panel immediately.
4. A surface type determines its trajectory. Breakpoints must not accidentally change its semantic role.
5. Specialized surfaces must use the shared primitives instead of inventing local delays.

## Scroll Locking

1. Reserve the native scrollbar channel with `scrollbar-gutter: stable`.
2. Keep the background locked for the complete surface presence, including exit motion.
3. Compensate the body inline end only when a browser still changes the layout viewport.
4. Reference-count nested locks so one surface cannot unlock another.
5. Restore the exact previous body geometry after the final surface exits.
