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
    color: "var(--brand-500)",
    x: "-18px",
    rotate: "-18deg",
  },
  { left: "17%", delay: "130ms", color: "#0f766e", x: "12px", rotate: "24deg" },
  {
    left: "29%",
    delay: "80ms",
    color: "#d97706",
    x: "-10px",
    rotate: "-34deg",
  },
  { left: "41%", delay: "210ms", color: "#e11d48", x: "16px", rotate: "18deg" },
  {
    left: "53%",
    delay: "100ms",
    color: "var(--brand-600)",
    x: "-14px",
    rotate: "-28deg",
  },
  { left: "65%", delay: "180ms", color: "#0f766e", x: "10px", rotate: "36deg" },
  {
    left: "77%",
    delay: "60ms",
    color: "#d97706",
    x: "-12px",
    rotate: "-12deg",
  },
  { left: "89%", delay: "240ms", color: "#e11d48", x: "14px", rotate: "30deg" },
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
    label: "INGRESOS RECONOCIDOS",
    icon: BadgeDollarSign,
    iconTone: "warning",
    title: (threshold) => `¡Meta de ${money(threshold)} alcanzada!`,
    copy: (threshold) =>
      `Tu operación ya alcanzó los ${money(threshold)} en ingresos reconocidos.`,
    format: money,
  },
  STORE_ORDERS: {
    eyebrow: "Hito de tienda desbloqueado",
    label: "ÓRDENES COMPLETADAS",
    icon: ShoppingBag,
    iconTone: "brand",
    title: (threshold) => `¡${count(threshold)} órdenes completadas!`,
    copy: (threshold) =>
      `Tu tienda ya completó ${count(threshold)} órdenes reconocidas.`,
    format: count,
  },
  RAFFLE_PARTICIPATIONS: {
    eyebrow: "Hito de rifas desbloqueado",
    label: "PARTICIPACIONES CONFIRMADAS",
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
    label: "BOLETOS VENDIDOS",
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
  nextMilestone: DashboardMilestoneProgress | null;
  onClose: () => void;
  onAfterClose?: () => void;
}

export const DashboardMilestoneModal: React.FC<DashboardMilestoneModalProps> = ({
  isOpen,
  milestone,
  nextMilestone,
  onClose,
  onAfterClose,
}) => {
  const [displayedValue, setDisplayedValue] = React.useState(0);
  const metric = milestone?.metric ?? "REVENUE";
  const presentation = PRESENTATION[metric];
  const threshold = milestone?.threshold ?? 1;
  const currentValue = milestone?.currentValue ?? 0;
  const nextPresentation = nextMilestone
    ? PRESENTATION[nextMilestone.metric]
    : null;

  React.useEffect(() => {
    if (!isOpen) {
      setDisplayedValue(0);
      return;
    }

    const target = Math.max(0, currentValue);
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setDisplayedValue(target);
      return;
    }

    const startedAt = performance.now();
    const duration = 900;
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const easedProgress = 1 - (1 - progress) ** 3;
      setDisplayedValue(target * easedProgress);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [currentValue, isOpen]);

  const progress = Math.min(
    100,
    (Math.max(0, currentValue) / threshold) * 100,
  );

  return (
    <NexusModal
      isOpen={isOpen}
      onClose={onClose}
      onAfterClose={onAfterClose}
      title={presentation.title(threshold)}
      eyebrow={presentation.eyebrow}
      icon={presentation.icon}
      iconTone={presentation.iconTone}
      size="standard"
      footer={
        <NexusModalActions className="flex-col sm:flex-row sm:justify-end">
          <NexusSectionButton
            type="button"
            variant="brand"
            icon={ArrowRight}
            className="w-full sm:w-auto"
            onClick={onClose}
          >
            Continuar creciendo
          </NexusSectionButton>
        </NexusModalActions>
      }
    >
      <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
        <div
          className="relative overflow-hidden border border-amber-200 bg-amber-50"
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
                className="nexus-milestone-confetti absolute top-0 h-2 w-1.5 rounded-full"
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
            <p className="text-body font-semibold text-text-main">
              {presentation.copy(threshold)}
            </p>

            <div
              className="border border-amber-200 bg-bg-card"
              style={{
                padding: "var(--padding-card-inner)",
                borderRadius: "var(--radius-card-inner)",
              }}
            >
              <div
                className="flex items-end justify-between"
                style={{ gap: "var(--space-md)" }}
              >
                <div
                  className="flex min-w-0 flex-col"
                  style={{ gap: "var(--space-xs)" }}
                >
                  <span className="text-label uppercase tracking-[0.08em] text-text-muted">
                    {presentation.label}
                  </span>
                  <strong className="text-display tabular-nums text-text-main">
                    {presentation.format(displayedValue)}
                  </strong>
                </div>
                <span className="shrink-0 text-secondary font-semibold text-emerald-700">
                  Meta cumplida
                </span>
              </div>

              <div
                className="mt-[var(--space-md)] h-2 overflow-hidden bg-amber-100"
                style={{ borderRadius: "var(--radius-card-nested-compact)" }}
                role="progressbar"
                aria-label={`Progreso de ${presentation.label.toLowerCase()}`}
                aria-valuemin={0}
                aria-valuemax={threshold}
                aria-valuenow={Math.round(Math.min(currentValue, threshold))}
              >
                <div
                  className="h-full bg-amber-500 transition-[width] duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {nextMilestone && nextPresentation && (
              <div
                className="flex items-center justify-between border border-border-main bg-bg-card"
                style={{
                  gap: "var(--space-md)",
                  padding: "var(--space-sm) var(--space-md)",
                  borderRadius: "var(--radius-card-inner)",
                }}
              >
                <div className="min-w-0">
                  <strong className="block text-secondary font-semibold text-text-main">
                    Siguiente hito
                  </strong>
                  <span className="block text-label text-text-muted">
                    Continúa construyendo tu historial
                  </span>
                </div>
                <strong className="shrink-0 text-h2 tabular-nums text-text-main">
                  {nextPresentation.format(nextMilestone.threshold)}
                </strong>
              </div>
            )}
          </div>
        </div>

        <p className="text-secondary text-text-muted">
          Gracias por seguir haciendo crecer tu operación con Nexus Platform.
        </p>
      </div>
    </NexusModal>
  );
};
