# Storefront Motion System

This document defines the temporal hierarchy, sequencing, durations, stagger, and easing rules for Storefront motion.

Motion is part of the Storefront design system. It must communicate hierarchy, continuity, feedback, or spatial relationships. It must not be added only to make a surface feel animated.

## Core Intent

1. Motion follows semantic hierarchy: context appears before explanation, and explanation appears before action.
2. Related elements share a temporal rhythm instead of using arbitrary local delays.
3. Initial entrances may be editorial; repeated state transitions must be faster.
4. Persistent shell elements do not replay their entrance on every content change.
5. Motion never introduces arbitrary blocking and always respects reduced-motion
   preferences. A route transition may guard interaction only while navigation is
   committing.

## Temporal Foundation

The geometry system uses an 8-based spatial scale. Time uses a related but perceptible rhythm:

- Half pulse: `40ms`, derived from `5 x 8`.
- Full pulse: `80ms`, derived from `10 x 8`.

Do not use `8ms` as an atomic animation unit. At 60Hz, one rendered frame is approximately `16.67ms`; an `8ms` difference is normally imperceptible and may be rounded by the browser.

The 40/80ms pulse keeps timing related to the system of 8 without pretending that pixels and milliseconds are equivalent domains.

## Duration Tokens

| Semantic token | CSS token | Value | Use |
| --- | --- | ---: | --- |
| Instant | `--sf-motion-duration-instant` | `120ms` | Press feedback and immediate acknowledgement. |
| Fast | `--sf-motion-duration-fast` | `160ms` | Badges, icons, checks, and small state changes. |
| Standard | `--sf-motion-duration-standard` | `240ms` | Controls, hover transitions, and compact reveals. |
| Deliberate | `--sf-motion-duration-deliberate` | `400ms` | Component and grouped-content entrances. |
| Editorial | `--sf-motion-duration-editorial` | `720ms` | Hero typography and prominent editorial content. |
| Ambient | `--sf-motion-duration-ambient` | `1120ms` | Hero media and atmospheric scene transitions. |

JavaScript uses the corresponding values from `apps/storefront/src/lib/motion.ts` in milliseconds. Convert to seconds only at a GSAP or Framer Motion boundary with `toMotionSeconds`.

## Pulse And Stagger Tokens

| Token | Value | Use |
| --- | ---: | --- |
| `--sf-motion-pulse-half` | `40ms` | Fine editorial stagger, including hero words. |
| `--sf-motion-pulse` | `80ms` | Separation between consecutive hierarchy steps. |
| `--sf-motion-stagger-compact` | `40ms` | Similar compact siblings. |
| `--sf-motion-stagger-standard` | `80ms` | Larger repeated elements. |

Stagger is not a universal delay. Use it only when a set is perceived as a sequence. Controls that must be understood together should generally enter together.

## Visual Cadence Contract

Page-level reveals use semantic cadence presets from
`apps/storefront/src/lib/motion.ts`. A cadence describes the complete entrance
behavior of a hierarchy level: lead delay, duration, displacement, visibility
threshold, and sibling stagger.

| Cadence | Lead | Duration | Distance | Threshold | Stagger | Use |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `compact` | `0ms` | `240ms` | `8px` | `0.4` | `40ms` | Repeated facts, thumbnails, compact supporting elements. |
| `standard` | `0ms` | `400ms` | `12px` | `0.3` | `80ms` | Controls, pagination, and secondary functional regions. |
| `editorial` | `80ms` | `720ms` | `16px` | `0.25` | `80ms` | Narrative sections, prominent cards, and primary page blocks. |

Homologation means semantic equivalence, not identical choreography. Two
screens may contain different components and therefore reveal different
sequences, but components with the same hierarchy must use the same cadence.
For example, the raffle listing and raffle detail use `editorial` for their
primary narrative sections, `standard` for functional controls, and `compact`
for repeated supporting information.

`StorefrontRevealGroup` passes its cadence to every
`StorefrontRevealItem`. Override an individual timing value only when the
composition requires a documented hierarchy offset, never to tune a screen by
eye.

```tsx
<StorefrontReveal cadence="editorial">
  <NarrativeSection />
</StorefrontReveal>

<StorefrontRevealGroup cadence="compact">
  {facts.map((fact) => (
    <StorefrontRevealItem key={fact.label}>
      <Fact {...fact} />
    </StorefrontRevealItem>
  ))}
</StorefrontRevealGroup>
```

Hero scenes and branded route transitions remain bespoke sequences because
they coordinate a scene rather than reveal one reusable hierarchy level. They
must still use the shared duration, pulse, stagger, and easing tokens.

## Easing

`--sf-ease`
: Standard deceleration: `cubic-bezier(0.23, 1, 0.32, 1)`. Use for controls, component transitions, and standard reveals.

`--sf-ease-reveal`
: Strong reveal deceleration: `cubic-bezier(0.16, 1, 0.3, 1)`. Use for modal, viewer, drawer, or other decisive entrances.

`linear`
: Reserved for time representation, such as a progress indicator. Do not use it for spatial entrances.

Avoid bounce and elastic easing. They compete with the content and do not match the Storefront's visual character.

## Temporal Hierarchy

Use this order when the elements are present:

1. Context or scene.
2. Persistent identity.
3. Category or eyebrow.
4. Primary message.
5. Supporting explanation.
6. Orientation or progress.
7. Action.

This is a semantic sequence, not a requirement to animate every element. Skip absent steps without leaving empty delays.

## Hero Choreography

### Initial Entrance

| Element | Start | Duration |
| --- | ---: | ---: |
| Media | `0ms` | `1120ms` |
| Persistent identity | `80ms` | `240ms` |
| Badge | `160ms` | `400ms` |
| Title | `240ms` | `720ms` |
| Description | `480ms` | `400ms` |
| Indicator | `560ms` | `240ms` |
| CTA group | `640ms` | `400ms` |

The title uses a `40ms` word stagger. These animations overlap; one element does not wait for the previous animation to finish.

### Slide Transition

Repeated transitions use a shorter sequence:

| Element | Start | Duration |
| --- | ---: | ---: |
| Media | `0ms` | `880ms` |
| Badge | `80ms` | `400ms` |
| Title | `160ms` | `640ms` |
| Description | `320ms` | `400ms` |
| Indicator | `400ms` | `240ms` |
| CTA group | `480ms` | `400ms` |

The logo and global navigation are persistent shell elements. They do not replay when the slide changes.

## Primary Route Transition

The branded route transition is reserved for mobile navigation between the five
primary Storefront areas: Inicio, Tienda, Galería, Rifas, and Contacto. It does
not run for detail pages, drawers, modals, checkout steps, filters, pagination,
back navigation, or external links.

The same transition runs once on a direct mobile load or refresh of a primary
route when the brand logo is available. Direct loads and client-side navigation
use the same state sequence and timing.

| Stage | Start | Duration |
| --- | ---: | ---: |
| Viewport coverage | `0ms` | `240ms` |
| Brand identity entrance | `240ms` | `240ms` |
| Minimum identity hold | `480ms` | `160ms` |
| Brand identity exit | `640ms` | `160ms` |
| Destination reveal | `800ms` | `240ms` |

The destination route commits only after the viewport is covered. The logo does
not enter until coverage is complete, so it never competes visually with the
previous screen. The destination reveal starts only after the new route has
committed, the minimum identity sequence has completed, and the browser has
received two animation frames. Data-driven primary routes also report when the
content required for their first meaningful composition is ready. The
transition remains covered until both the identity sequence and that readiness
condition have completed.

Phase changes are completion-driven. Tokens define each animation's duration,
but an external timeout must not advance from coverage to identity before the
coverage animation has actually completed. This keeps the sequence stable when
a device drops or delays a frame.

The transition must not manufacture a delay when the brand logo is unavailable.
In that case, navigation remains immediate and no fallback identity is shown.

### Destination Choreography Handoff

The destination's initial choreography uses the start of the viewport reveal as
its temporal origin. It must not begin while the transition is still covering or
holding, because that would complete meaningful entrances behind the overlay.

One half pulse (`40ms`) before the panel begins to uncover the viewport, the
Storefront publishes a new reveal epoch. This preparation window lets React
commit every hidden initial state before any destination pixel becomes
visible, preventing a completed control or rail from flashing for one frame.
Choreographed destinations use that epoch to remount only their animated
presentation layer, not their data or request lifecycle. The route transition
and destination choreography therefore overlap as a single continuous
handoff:

1. The context layer establishes the destination.
2. The brand identity exits.
3. The destination scene begins while the viewport is uncovered.
4. Page-level hierarchy continues using its own documented timing.

Do not solve this relationship with a page-specific fixed delay. Network,
rendering, and route commit times are variable; the explicit reveal signal is
the source of truth.

### Loading Bridge

On mobile, a primary route that is still resolving its initial content uses the
same dark surface as the context transition. It must not expose a spinner,
navigation rail, empty page, or partially composed content before the reveal
handoff. On desktop, where the primary context transition is not used, a
conventional loading indicator may remain visible.

When a primary route is reached from one of its own depth routes, no context
transition is introduced. Its loading surface must therefore use the normal
application background rather than exposing the dark transition surface by
itself.

## Sequencing Rules

1. Cause precedes consequence. Establish the scene before introducing its message.
2. Visual hierarchy owns temporal hierarchy. High-priority content enters before supporting content.
3. Prefer overlap. A sequence should feel continuous, not like a checklist.
4. Keep adjacent hierarchy steps `40-160ms` apart unless an editorial pause is intentional.
5. Repeated transitions are faster than first entrances.
6. Exits should generally use approximately 75 percent of the corresponding entrance duration.
7. Actions enter after enough context exists to understand them.
8. Persistent controls remain stable unless their meaning changes.
9. Do not animate layout properties when opacity and transform can communicate the same relationship.
10. Start timed progress only when the represented content is ready.

### Detail Page Choreography

Product and raffle detail routes are depth navigation inside their respective
contexts, so they do not introduce another context transition. Their structural
composition begins immediately; the cover media resolves with its own opacity
transition when the asset is ready, without holding the rest of the page:

| Element | Start | Duration |
| --- | ---: | ---: |
| Mobile chrome or desktop return action | `80ms` | `400ms` |
| Cover media region | `0ms` | `1120ms` |
| Badges | `160ms` | `400ms` |
| Title | `240ms` | `400ms` |
| Price | `320ms` | `400ms` |
| Description | `480ms` | `400ms` |
| Supporting note | `560ms` | `400ms` |
| Primary action or mobile action rail | `640ms` | `400ms` |

1. The mobile chrome or desktop return action establishes orientation.
2. The cover establishes the visual subject.
3. Badges, title, price, description, and the shipping note follow in
   semantic order using the shared `80ms` pulse.
4. The desktop CTA and mobile action rail enter after enough context exists to
   understand them.
5. Gallery, information, supporting guidance, and the primary functional
   region reveal once as their blocks enter the viewport. These blocks use the
   shared `editorial` cadence. Repeated gallery thumbnails inherit `compact`
   cadence from their reveal group.

Dynamic content must not replay the page entrance. Product media changes use a
`standard` opacity transition; cart feedback retains its own interaction
motion. The raffle ticket grid is animated as one functional region, while
individual tickets remain stable when real-time availability changes. Bottom
sheets, drawers, and media viewers retain their own independent interaction
motion.

### Temporary Surface Choreography

Drawers and bottom sheets share one semantic sequence even though their spatial
direction changes by viewport. Desktop drawers enter from the right; mobile
bottom sheets enter from the bottom. Full-screen mobile flow drawers retain the
drawer sequence because they represent navigation within an active task.

The Storefront currently recognizes these temporary surfaces:

- Flow drawers: Mi carrito and Mi selección.
- Responsive filters: catálogo, rifas, boletos, and galería.

| Element | Start | Duration |
| --- | ---: | ---: |
| Backdrop | `0ms` | `240ms` |
| Drawer or sheet | `40ms` | `400ms` |
| Header identity | `160ms` | `240ms` |
| Header close control | `200ms` | `240ms` |
| Primary content | `240ms` | `400ms` |
| Footer actions | `320ms` | `240ms` |
| Mobile top rail | `160ms` | `400ms` |
| Mobile bottom rail | `320ms` | `400ms` |

The layers intentionally overlap. The backdrop establishes separation first,
the surface explains its spatial origin, and the user receives orientation
before controls and actions. Internal hierarchy uses opacity rather than a
second spatial transform because the surface itself is already moving. This
prevents compounded motion and a visible correction at the end of a bottom
sheet entrance. On close, the surface begins leaving immediately and the
backdrop follows after `40ms`; this preserves the inverse spatial relationship
without making dismissal feel slow.

Implement temporary surfaces through `StorefrontDrawerDialog`, `BottomSheet`,
`StorefrontFilterPanel`, and `StorefrontTemporarySurfaceItem`. Do not recreate
local overlay or panel animation values in feature components.

Full-screen mobile flow drawers use `StorefrontTemporarySurfaceChrome` for
their top and bottom rails. The top rail preserves the `-12px` orientation
entrance used by product and raffle detail chrome; the bottom rail preserves
the `16px` action entrance. Their timing belongs to the shorter temporary
surface sequence, not to the longer detail-page narrative.

Closing uses the same `400ms` surface duration as opening, but reverses both
hierarchy and easing:

| Exit element | Start | Duration |
| --- | ---: | ---: |
| Footer and mobile bottom rail | `0ms` | `160ms` / `240ms` |
| Primary content and close control | `40ms` | `160ms` |
| Header identity and mobile top rail | `80ms` | `160ms` / `240ms` |
| Drawer panel | `0ms` | `400ms` |
| Backdrop | `160ms` | `240ms` |

Entrance uses the reveal curve. Exit uses its temporal inverse, so equal
durations also feel equal instead of making dismissal appear faster.

When reduced motion is enabled, remove spatial translation, stagger, and
intentional delay. Use the shared `120ms` minimal opacity transition.

## Checkout Handoff

Checkout is the destination of the cart and raffle-selection drawers. During a
drawer-to-checkout navigation, the checkout prepares behind the temporary
surface but does not consume its entrance sequence. Its reveal begins only
after the drawer and backdrop finish their inverse exit.

| Checkout element | Start after handoff | Duration |
| --- | ---: | ---: |
| Mobile top rail / desktop back control | `0ms` | `400ms` |
| Checkout context | `80ms` | `400ms` |
| Form content | `160ms` | `400ms` |
| Desktop summary | `240ms` | `400ms` |
| Mobile purchase rail | `320ms` | `400ms` |

Direct checkout loads use the same sequence without waiting for a drawer.

### Mobile Checkout Steps

Mobile step changes do not replay the full checkout entrance. The top and
bottom rails remain mounted while each new step performs its own progressive
reveal:

| Step element | Start | Duration |
| --- | ---: | ---: |
| Rail title and progress | `0ms` | `240ms` |
| Section identity | `160ms` | `400ms` |
| Supporting explanation | `240ms` | `400ms` |
| Primary controls | `320ms` | `400ms` |
| Conditional or supporting content | `400ms` | `400ms` |

Direct children after the section identity continue with the shared `80ms`
pulse. The sequence overlaps intentionally: orientation is established first,
then the step explains itself before exposing the decision controls. Nested
step content uses an `8px` translation and opacity; the persistent rails do not
repeat their spatial entrance. Desktop uses the same internal section
hierarchy during its initial entrance while retaining the complete
multi-section form. Consecutive desktop sections offset their section identity
by one additional `80ms` pulse so the page reads from top to bottom without
turning the form into a serial checklist.

## Reduced Motion

When `prefers-reduced-motion: reduce` is active:

1. Remove stagger and intentional delay.
2. Replace spatial movement with an immediate state change or minimal opacity transition.
3. Preserve state and hierarchy; do not hide information.
4. Keep progress semantically accurate even if its visual animation is removed.

## Implementation Rules

### CSS

Use semantic duration variables:

```css
.control {
  transition-duration: var(--sf-motion-duration-standard);
  transition-timing-function: var(--sf-ease);
}
```

### Framer Motion

Use a semantic cadence for page-level reveals:

```tsx
<StorefrontReveal cadence="editorial">
  <PrimarySection />
</StorefrontReveal>
```

For bespoke scene choreography, use millisecond tokens and convert at the
library boundary:

```tsx
transition={{
  duration: toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
  ease: STOREFRONT_EASING.standard,
}}
```

### GSAP

Use the same conversion for duration, delay, and stagger:

```ts
gsap.to(element, {
  duration: toMotionSeconds(STOREFRONT_MOTION_MS.duration.editorial),
  stagger: toMotionSeconds(STOREFRONT_MOTION_MS.stagger.compact),
  ease: "power4.out",
});
```

Do not introduce a new raw duration when an existing semantic token describes the interaction.

## Review Checklist

- Does the animation communicate hierarchy, continuity, feedback, or spatial relationship?
- Is its duration selected semantically rather than visually guessed?
- Are first entrance and repeated transition treated differently?
- Do delays follow the 40/80ms pulse?
- Does the sequence overlap naturally?
- Are persistent elements stable?
- Does progress start when content is ready?
- Are only performant properties animated?
- Does reduced motion preserve all information and interaction?
- Has the motion been verified in both desktop and mobile viewports?
