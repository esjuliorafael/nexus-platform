import React from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  ShoppingBag,
  Ticket,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NexusModal, NexusModalActions } from "../ui/NexusModal";
import { NexusSectionButton } from "../ui/NexusButton";
import type {
  DashboardMilestoneMetric,
  DashboardMilestoneProgress,
} from "../../types";
import {
  ADMIN_MOTION_MS,
  ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS,
} from "../../lib/motion";
import { useMilestoneSound } from "../../hooks/useMilestoneSound";

const money = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

const count = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0,
  }).format(value);

const CONFETTI = [
  {
    left: "8%",
    delay: "40ms",
    color: "var(--milestone-confetti-brand)",
    x: "-18px",
    rotate: "-18deg",
  },
  {
    left: "17%",
    delay: "130ms",
    color: "var(--milestone-confetti-teal)",
    x: "12px",
    rotate: "24deg",
  },
  {
    left: "29%",
    delay: "80ms",
    color: "var(--milestone-confetti-gold)",
    x: "-10px",
    rotate: "-34deg",
  },
  {
    left: "41%",
    delay: "210ms",
    color: "var(--milestone-confetti-rose)",
    x: "16px",
    rotate: "18deg",
  },
  {
    left: "53%",
    delay: "100ms",
    color: "var(--milestone-confetti-brand)",
    x: "-14px",
    rotate: "-28deg",
  },
  {
    left: "65%",
    delay: "180ms",
    color: "var(--milestone-confetti-teal)",
    x: "10px",
    rotate: "36deg",
  },
  {
    left: "77%",
    delay: "60ms",
    color: "var(--milestone-confetti-gold)",
    x: "-12px",
    rotate: "-12deg",
  },
  {
    left: "89%",
    delay: "240ms",
    color: "var(--milestone-confetti-rose)",
    x: "14px",
    rotate: "30deg",
  },
] as const;

const PRESENTATION: Record<
  DashboardMilestoneMetric,
  {
    eyebrow: string;
    label: string;
    icon: LucideIcon;
    iconTone: "brand" | "warning";
    title: (threshold: number) => string;
    copy: (threshold: number) => string;
    format: (value: number) => string;
  }
> = {
  REVENUE: {
    eyebrow: "Hito de ingresos desbloqueado",
    label: "Ingresos reconocidos",
    icon: BadgeDollarSign,
    iconTone: "warning",
    title: (threshold) => `¡Alcanzaste la meta de ${money(threshold)}!`,
    copy: (threshold) =>
      `Tu operación ya suma ${money(threshold)} en ingresos reconocidos.`,
    format: money,
  },
  STORE_ORDERS: {
    eyebrow: "Hito de tienda desbloqueado",
    label: "Órdenes completadas",
    icon: ShoppingBag,
    iconTone: "brand",
    title: (threshold) => `¡${count(threshold)} órdenes completadas!`,
    copy: (threshold) =>
      `Tu tienda ya completó ${count(threshold)} órdenes reconocidas.`,
    format: count,
  },
  RAFFLE_PARTICIPATIONS: {
    eyebrow: "Hito de rifas desbloqueado",
    label: "Participaciones confirmadas",
    icon: UsersRound,
    iconTone: "brand",
    title: (threshold) =>
      `¡${count(threshold)} participaciones confirmadas!`,
    copy: (threshold) =>
      `Tus rifas ya acumularon ${count(threshold)} participaciones confirmadas.`,
    format: count,
  },
  RAFFLE_TICKETS: {
    eyebrow: "Hito de rifas desbloqueado",
    label: "Boletos vendidos",
    icon: Ticket,
    iconTone: "brand",
    title: (threshold) => `¡${count(threshold)} boletos vendidos!`,
    copy: (threshold) =>
      `Tus rifas ya acumularon ${count(threshold)} boletos vendidos.`,
    format: count,
  },
};

interface DashboardMilestoneModalProps {
  isOpen: boolean;
  milestone: DashboardMilestoneProgress | null;
  onClose: () => void;
  onAfterClose?: () => void;
}

export const DashboardMilestoneModal: React.FC<DashboardMilestoneModalProps> = ({
  isOpen,
  milestone,
  onClose,
  onAfterClose,
}) => {
  const [displayedValue, setDisplayedValue] = React.useState(0);
  const [displayedProgress, setDisplayedProgress] = React.useState(0);
  const [showProgressStatus, setShowProgressStatus] = React.useState(false);
  const playMilestoneSound = useMilestoneSound();
  const wasOpenRef = React.useRef(false);
  const metric = milestone?.metric ?? "REVENUE";
  const presentation = PRESENTATION[metric];
  const threshold = milestone?.threshold ?? 1;
  const currentValue = milestone?.currentValue ?? 0;
  const progress =
    threshold > 0
      ? Math.min(100, (Math.max(0, currentValue) / threshold) * 100)
      : 0;

  const handleAfterClose = React.useCallback(() => {
    setDisplayedValue(0);
    setDisplayedProgress(0);
    setShowProgressStatus(false);
    onAfterClose?.();
  }, [onAfterClose]);

  React.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      playMilestoneSound();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, playMilestoneSound]);

  React.useEffect(() => {
    if (!isOpen) return;

    const target = Math.max(0, currentValue);
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setDisplayedValue(target);
      setDisplayedProgress(progress);
      setShowProgressStatus(true);
      return;
    }

    setDisplayedValue(0);
    setDisplayedProgress(0);
    setShowProgressStatus(false);

    const feedbackDelay =
      ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.contentDelayMs +
      ADMIN_MOTION_MS.duration.standard;
    const duration = ADMIN_MOTION_MS.duration.deliberate;
    let valueFrameId = 0;
    let progressFrameId = 0;
    let statusTimeoutId = 0;

    const startFeedback = () => {
      const startedAt = performance.now();

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const easedProgress = 1 - (1 - progress) ** 3;
        setDisplayedValue(target * easedProgress);
        if (progress < 1) valueFrameId = requestAnimationFrame(tick);
      };

      valueFrameId = requestAnimationFrame(tick);
      progressFrameId = requestAnimationFrame(() => {
        setDisplayedProgress(progress);
      });
      statusTimeoutId = window.setTimeout(() => {
        setShowProgressStatus(true);
      }, duration);
    };

    const feedbackTimeoutId = window.setTimeout(startFeedback, feedbackDelay);

    return () => {
      window.clearTimeout(feedbackTimeoutId);
      cancelAnimationFrame(valueFrameId);
      cancelAnimationFrame(progressFrameId);
      window.clearTimeout(statusTimeoutId);
    };
  }, [currentValue, isOpen, progress]);

  return (
    <NexusModal
      isOpen={isOpen}
      onClose={onClose}
      onAfterClose={handleAfterClose}
      context="milestone"
      titleLevel="h2"
      title={presentation.title(threshold)}
      eyebrow={presentation.eyebrow}
      icon={presentation.icon}
      iconTone={presentation.iconTone}
      size="standard"
      footer={
        <NexusModalActions className="flex-col sm:flex-row sm:justify-center">
          <NexusSectionButton
            type="button"
            variant="brand"
            icon={ArrowRight}
            className="w-full"
            onClick={onClose}
          >
            Continuar creciendo
          </NexusSectionButton>
        </NexusModalActions>
      }
    >
      <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
        <p className="text-center text-milestone-body text-text-main">
          {presentation.copy(threshold)}
        </p>

        <div
          className="nexus-milestone-surface relative overflow-hidden border"
          style={{
            padding: "var(--padding-inner)",
            borderRadius: "var(--radius-inner-visual)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-16 overflow-hidden"
          >
            {CONFETTI.map((piece, index) => (
              <span
                key={index}
                className="nexus-milestone-confetti absolute top-0 rounded-full"
                style={
                  {
                    left: piece.left,
                    backgroundColor: piece.color,
                    animationDelay: piece.delay,
                    transform: `rotate(${piece.rotate})`,
                    "--confetti-x": piece.x,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          <div
            className="relative flex flex-col"
            style={{ gap: "var(--space-md)" }}
          >
            <div
              className="flex justify-center"
            >
              <div
                className="flex min-w-0 flex-col items-center text-center"
                style={{ gap: "var(--space-xs)" }}
              >
                <strong className="text-milestone-value text-text-main">
                  {presentation.format(displayedValue)}
                </strong>
                <span className="text-milestone-meta text-text-muted">
                  {presentation.label}
                </span>
              </div>
            </div>

            <div
              className="flex flex-col"
              style={{ gap: "var(--space-sm)" }}
            >
              <div
                className="nexus-milestone-progress-track overflow-hidden"
                style={{
                  height: "var(--h-progress-milestone)",
                  borderRadius: "var(--radius-card-nested-compact)",
                }}
                role="progressbar"
                aria-label={`Progreso de ${presentation.label.toLowerCase()}`}
                aria-valuemin={0}
                aria-valuemax={threshold}
                aria-valuenow={Math.round(Math.min(currentValue, threshold))}
              >
                <div
                  className="nexus-milestone-progress-fill h-full"
                  style={{ transform: `scaleX(${displayedProgress / 100})` }}
                />
              </div>
              <div
                className={`nexus-milestone-progress-status flex items-center justify-between ${
                  showProgressStatus
                    ? "translate-y-0 opacity-100"
                    : "translate-y-1 opacity-0"
                }`}
                style={{ gap: "var(--space-md)" }}
              >
                <span className="text-milestone-meta text-text-muted">
                  {Math.round(progress)}% alcanzado
                </span>
                <span className="nexus-milestone-status text-milestone-meta">
                  Meta cumplida
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-secondary text-text-muted">
          Gracias por hacer crecer tu operación con Nexus Platform. Este logro merece celebrarse.
        </p>
      </div>
    </NexusModal>
  );
};
