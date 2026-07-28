export const ADMIN_MOTION_MS = {
  pulse: {
    half: 40,
    full: 80,
  },
  duration: {
    instant: 120,
    fast: 160,
    standard: 240,
    deliberate: 320,
  },
} as const;

export const ADMIN_EASING = {
  standard: [0.23, 1, 0.32, 1] as const,
  reveal: [0.16, 1, 0.3, 1] as const,
  exit: [0.7, 0, 0.84, 0] as const,
} as const;

export const ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS = {
  backdropEnterDurationMs: ADMIN_MOTION_MS.duration.standard,
  panelEnterDelayMs: ADMIN_MOTION_MS.pulse.half,
  panelEnterDurationMs: ADMIN_MOTION_MS.duration.deliberate,
  headerDelayMs: ADMIN_MOTION_MS.duration.instant,
  headerCloseDelayMs: ADMIN_MOTION_MS.duration.fast,
  contentDelayMs: ADMIN_MOTION_MS.duration.fast + ADMIN_MOTION_MS.pulse.half,
  footerDelayMs: ADMIN_MOTION_MS.duration.standard,
  footerExitDelayMs: 0,
  contentExitDelayMs: ADMIN_MOTION_MS.pulse.half,
  headerCloseExitDelayMs: ADMIN_MOTION_MS.pulse.half,
  headerExitDelayMs: ADMIN_MOTION_MS.pulse.full,
  internalExitDurationMs: ADMIN_MOTION_MS.duration.fast,
  panelExitDelayMs: ADMIN_MOTION_MS.pulse.full,
  panelExitDurationMs: ADMIN_MOTION_MS.duration.standard,
  backdropExitDelayMs: ADMIN_MOTION_MS.duration.fast,
  backdropExitDurationMs: ADMIN_MOTION_MS.duration.fast,
  totalExitDurationMs:
    ADMIN_MOTION_MS.pulse.full + ADMIN_MOTION_MS.duration.standard,
  reducedDurationMs: ADMIN_MOTION_MS.duration.instant,
} as const;

export const toMotionSeconds = (milliseconds: number) => milliseconds / 1000;
