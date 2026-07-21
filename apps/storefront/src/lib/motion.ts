export const STOREFRONT_MOTION_MS = {
  pulse: {
    half: 40,
    full: 80,
  },
  duration: {
    instant: 120,
    fast: 160,
    standard: 240,
    deliberate: 400,
    editorial: 720,
    ambient: 1120,
  },
  stagger: {
    compact: 40,
    standard: 80,
  },
} as const;

export const STOREFRONT_EASING = {
  standard: [0.23, 1, 0.32, 1] as const,
  reveal: [0.16, 1, 0.3, 1] as const,
  exit: [0.7, 0, 0.84, 0] as const,
  linear: "linear" as const,
};

export const STOREFRONT_REVEAL_CADENCE = {
  compact: {
    delayMs: 0,
    durationMs: STOREFRONT_MOTION_MS.duration.standard,
    distance: 8,
    amount: 0.4,
    staggerMs: STOREFRONT_MOTION_MS.stagger.compact,
  },
  standard: {
    delayMs: 0,
    durationMs: STOREFRONT_MOTION_MS.duration.deliberate,
    distance: 12,
    amount: 0.3,
    staggerMs: STOREFRONT_MOTION_MS.stagger.standard,
  },
  editorial: {
    delayMs: STOREFRONT_MOTION_MS.pulse.full,
    durationMs: STOREFRONT_MOTION_MS.duration.editorial,
    distance: 16,
    amount: 0.25,
    staggerMs: STOREFRONT_MOTION_MS.stagger.standard,
  },
} as const;

export type StorefrontRevealCadence =
  keyof typeof STOREFRONT_REVEAL_CADENCE;

export const HERO_MOTION_SEQUENCE_MS = {
  initial: {
    mediaDurationMs: STOREFRONT_MOTION_MS.duration.ambient,
    badgeDelayMs: STOREFRONT_MOTION_MS.pulse.full * 2,
    titleDelayMs: STOREFRONT_MOTION_MS.pulse.full * 3,
    titleDurationMs: STOREFRONT_MOTION_MS.duration.editorial,
    titleStaggerMs: STOREFRONT_MOTION_MS.stagger.compact,
    descriptionDelayMs: STOREFRONT_MOTION_MS.pulse.full * 6,
    progressDelayMs: STOREFRONT_MOTION_MS.pulse.full * 7,
    actionsDelayMs: STOREFRONT_MOTION_MS.pulse.full * 8,
  },
  transition: {
    mediaDurationMs: STOREFRONT_MOTION_MS.pulse.full * 11,
    badgeDelayMs: STOREFRONT_MOTION_MS.pulse.full,
    titleDelayMs: STOREFRONT_MOTION_MS.pulse.full * 2,
    titleDurationMs: STOREFRONT_MOTION_MS.pulse.full * 8,
    titleStaggerMs: STOREFRONT_MOTION_MS.stagger.compact,
    descriptionDelayMs: STOREFRONT_MOTION_MS.pulse.full * 4,
    progressDelayMs: STOREFRONT_MOTION_MS.pulse.full * 5,
    actionsDelayMs: STOREFRONT_MOTION_MS.pulse.full * 6,
  },
} as const;

export const STOREFRONT_DETAIL_MOTION_SEQUENCE_MS = {
  chromeDelayMs: STOREFRONT_MOTION_MS.pulse.full,
  coverDelayMs: 0,
  badgesDelayMs: STOREFRONT_MOTION_MS.pulse.full * 2,
  titleDelayMs: STOREFRONT_MOTION_MS.pulse.full * 3,
  priceDelayMs: STOREFRONT_MOTION_MS.pulse.full * 4,
  descriptionDelayMs: STOREFRONT_MOTION_MS.pulse.full * 6,
  noteDelayMs: STOREFRONT_MOTION_MS.pulse.full * 7,
  actionsDelayMs: STOREFRONT_MOTION_MS.pulse.full * 8,
  coverDurationMs: STOREFRONT_MOTION_MS.duration.ambient,
  contentDurationMs: STOREFRONT_MOTION_MS.duration.deliberate,
} as const;

export const STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS = {
  backdropEnterDurationMs: STOREFRONT_MOTION_MS.duration.standard,
  panelEnterDelayMs: STOREFRONT_MOTION_MS.pulse.half,
  panelEnterDurationMs: STOREFRONT_MOTION_MS.duration.deliberate,
  headerDelayMs: STOREFRONT_MOTION_MS.pulse.full * 2,
  headerCloseDelayMs:
    STOREFRONT_MOTION_MS.pulse.full * 2 + STOREFRONT_MOTION_MS.pulse.half,
  contentDelayMs: STOREFRONT_MOTION_MS.pulse.full * 3,
  footerDelayMs: STOREFRONT_MOTION_MS.pulse.full * 4,
  footerExitDelayMs: 0,
  contentExitDelayMs: STOREFRONT_MOTION_MS.pulse.half,
  headerCloseExitDelayMs: STOREFRONT_MOTION_MS.pulse.half,
  headerExitDelayMs: STOREFRONT_MOTION_MS.pulse.full,
  internalExitDurationMs: STOREFRONT_MOTION_MS.duration.fast,
  chromeExitDurationMs: STOREFRONT_MOTION_MS.duration.standard,
  panelExitDurationMs: STOREFRONT_MOTION_MS.duration.deliberate,
  backdropExitDelayMs: STOREFRONT_MOTION_MS.duration.fast,
  backdropExitDurationMs: STOREFRONT_MOTION_MS.duration.standard,
  reducedDurationMs: STOREFRONT_MOTION_MS.duration.instant,
} as const;

export const STOREFRONT_CHECKOUT_SEQUENCE_MS = {
  chromeDelayMs: 0,
  introDelayMs: STOREFRONT_MOTION_MS.pulse.full,
  contentDelayMs: STOREFRONT_MOTION_MS.pulse.full * 2,
  summaryDelayMs: STOREFRONT_MOTION_MS.pulse.full * 3,
  actionsDelayMs: STOREFRONT_MOTION_MS.pulse.full * 4,
  durationMs: STOREFRONT_MOTION_MS.duration.deliberate,
  stepDurationMs: STOREFRONT_MOTION_MS.duration.standard,
  stepHeaderDelayMs: STOREFRONT_MOTION_MS.pulse.full * 2,
  stepItemStaggerMs: STOREFRONT_MOTION_MS.pulse.full,
  stepItemDurationMs: STOREFRONT_MOTION_MS.duration.deliberate,
  reducedDurationMs: STOREFRONT_MOTION_MS.duration.instant,
} as const;

export const ROUTE_TRANSITION_SEQUENCE_MS = {
  coverDurationMs: STOREFRONT_MOTION_MS.duration.standard,
  identityDurationMs: STOREFRONT_MOTION_MS.duration.standard,
  identityHoldMs: STOREFRONT_MOTION_MS.duration.fast,
  identityExitDurationMs: STOREFRONT_MOTION_MS.duration.fast,
  revealDelayMs: STOREFRONT_MOTION_MS.duration.fast,
  handoffPreparationMs: STOREFRONT_MOTION_MS.pulse.half,
  revealDurationMs: STOREFRONT_MOTION_MS.duration.standard,
  reducedDurationMs: STOREFRONT_MOTION_MS.duration.instant,
  maximumRouteWaitMs: STOREFRONT_MOTION_MS.pulse.full * 60,
} as const;

export const toMotionSeconds = (milliseconds: number) => milliseconds / 1000;
