import React from "react";
import {
  CheckCircle2,
  Flag,
  LockKeyhole,
} from "lucide-react";
import type {
  DashboardMilestoneMetric,
  DashboardMilestoneProgress,
  DashboardStats,
} from "../../types";
import { NexusAutonomousCard } from "../ui/NexusCard";
import { NexusAutonomousIcon } from "../ui/NexusIcon";
import { NexusSectionBadge } from "../ui/NexusBadge";
import {
  DASHBOARD_MILESTONE_METRIC_ORDER,
  DASHBOARD_MILESTONE_PRESENTATION,
} from "./dashboardMilestonePresentation";

interface DashboardMilestonesViewProps {
  isLoading: boolean;
  stats: DashboardStats | null;
}

const MilestoneSkeleton = () => (
  <div
    className="grid grid-cols-1 gap-[var(--space-lg)] xl:grid-cols-2"
    aria-label="Cargando hitos"
  >
    {Array.from({ length: 4 }).map((_, index) => (
      <NexusAutonomousCard key={index} className="animate-pulse">
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <div className="flex items-center" style={{ gap: "var(--space-md)" }}>
            <div
              className="shrink-0 bg-bg-muted"
              style={{
                width: "var(--size-icon-section)",
                height: "var(--size-icon-section)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            />
            <div className="flex flex-1 flex-col" style={{ gap: "var(--space-xs)" }}>
              <div className="h-5 w-48 rounded-full bg-bg-muted" />
              <div className="h-3 w-64 rounded-full bg-bg-muted" />
            </div>
          </div>
          <div className="h-12 w-36 rounded-full bg-bg-muted" />
          <div className="h-2 w-full rounded-full bg-bg-muted" />
          <div className="h-24 w-full rounded-[var(--radius-inner-visual)] bg-bg-muted" />
        </div>
      </NexusAutonomousCard>
    ))}
  </div>
);

const metricMilestones = (
  milestones: DashboardMilestoneProgress[] | undefined,
  metric: DashboardMilestoneMetric,
) => (milestones ?? []).filter((milestone) => milestone.metric === metric);

export const DashboardMilestonesView: React.FC<
  DashboardMilestonesViewProps
> = ({ isLoading, stats }) => {
  if (isLoading && !stats) return <MilestoneSkeleton />;

  const milestones = stats?.milestones ?? [];

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
      <div
        className="flex flex-col gap-[var(--space-sm)] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center" style={{ gap: "var(--space-sm)" }}>
          <Flag className="shrink-0 text-brand-600" size={20} strokeWidth={2.2} />
          <p className="text-secondary text-text-muted">
            Los hitos se calculan sobre el acumulado histórico reconocido de la cuenta.
          </p>
        </div>
        <NexusSectionBadge variant="muted">Acumulado histórico</NexusSectionBadge>
      </div>

      <div className="grid grid-cols-1 gap-[var(--space-lg)] xl:grid-cols-2">
        {DASHBOARD_MILESTONE_METRIC_ORDER.map((metric) => {
          const presentation = DASHBOARD_MILESTONE_PRESENTATION[metric];
          const items = metricMilestones(milestones, metric);
          const currentValue = items[0]?.currentValue ?? 0;
          const nextMilestone = items.find((milestone) => !milestone.reached);
          const progress = nextMilestone
            ? Math.min(100, (currentValue / nextMilestone.threshold) * 100)
            : 100;
          const completedCount = items.filter((milestone) => milestone.reached).length;

          return (
            <NexusAutonomousCard key={metric}>
              <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
                <div className="flex items-start" style={{ gap: "var(--space-md)" }}>
                  <NexusAutonomousIcon
                    icon={presentation.icon}
                    variant={presentation.iconVariant}
                    hoverGroup={`group/${metric.toLowerCase()}`}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-h2 text-text-main">{presentation.label}</h2>
                    <p className="text-secondary text-text-muted">
                      {presentation.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-end justify-between" style={{ gap: "var(--space-md)" }}>
                  <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
                    <span className="text-label uppercase tracking-[0.08em] text-text-muted">
                      Acumulado actual
                    </span>
                    <strong className="text-display tabular-nums text-text-main">
                      {presentation.format(currentValue)}
                    </strong>
                  </div>
                  <span className="shrink-0 text-secondary font-semibold text-text-muted">
                    {completedCount}/{items.length} completados
                  </span>
                </div>

                <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                  <div
                    className="h-2 overflow-hidden border border-border-main bg-bg-muted"
                    style={{ borderRadius: "var(--radius-card-nested-compact)" }}
                    role="progressbar"
                    aria-label={`Progreso de ${presentation.label.toLowerCase()}`}
                    aria-valuemin={0}
                    aria-valuemax={nextMilestone?.threshold ?? Math.max(currentValue, 1)}
                    aria-valuenow={Math.round(
                      Math.min(currentValue, nextMilestone?.threshold ?? currentValue),
                    )}
                  >
                    <div
                      className="h-full bg-brand-500 transition-[width] duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between" style={{ gap: "var(--space-sm)" }}>
                    <span className="text-label text-text-muted">
                      {nextMilestone
                        ? `Siguiente hito: ${presentation.format(nextMilestone.threshold)}`
                        : "Todos los hitos actuales completados"}
                    </span>
                    {nextMilestone && (
                      <span className="shrink-0 text-label font-semibold text-brand-600">
                        Faltan {presentation.format(Math.max(0, nextMilestone.threshold - currentValue))}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="grid grid-cols-1 gap-[var(--space-xs)] sm:grid-cols-2" aria-label={`Hitos de ${presentation.label}`}>
                  {items.map((milestone) => {
                    const isNext = milestone.id === nextMilestone?.id;
                    const statusIcon = milestone.reached
                      ? CheckCircle2
                      : isNext
                        ? Flag
                        : LockKeyhole;
                    const statusVariant = milestone.reached
                      ? "success"
                      : isNext
                        ? "brand"
                        : "muted";
                    const StatusIcon = statusIcon;

                    return (
                      <li
                        key={milestone.id}
                        className={`flex min-w-0 items-center justify-between border ${isNext ? "border-brand-200 bg-brand-50/50" : "border-border-main bg-bg-muted"}`}
                        style={{
                          gap: "var(--space-sm)",
                          padding: "var(--space-sm) var(--space-md)",
                          borderRadius: "var(--radius-card-nested-compact)",
                        }}
                      >
                        <span className="flex min-w-0 items-center" style={{ gap: "var(--space-xs)" }}>
                          <StatusIcon
                            aria-hidden="true"
                            className={milestone.reached ? "text-emerald-600" : isNext ? "text-brand-600" : "text-text-muted"}
                            size={16}
                            strokeWidth={2.2}
                          />
                          <span className="truncate text-secondary font-semibold text-text-main">
                            {presentation.format(milestone.threshold)}
                          </span>
                        </span>
                        <span
                          className="flex shrink-0 items-center"
                          style={{ gap: "var(--space-xs)" }}
                        >
                          {!milestone.reached && (
                            <span className="text-label font-semibold text-text-muted">
                              Faltan {presentation.format(Math.max(0, milestone.threshold - currentValue))}
                            </span>
                          )}
                          <NexusSectionBadge variant={statusVariant}>
                            {milestone.reached
                              ? "Completado"
                              : isNext
                                ? "Siguiente"
                                : "Pendiente"}
                          </NexusSectionBadge>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </NexusAutonomousCard>
          );
        })}
      </div>
    </div>
  );
};
