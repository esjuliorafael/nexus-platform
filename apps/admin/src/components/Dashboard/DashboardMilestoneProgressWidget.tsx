import React from "react";
import { ArrowRight, CheckCircle2, Flag } from "lucide-react";
import type { DashboardMilestoneProgress } from "../../types";
import { NexusAutonomousCard } from "../ui/NexusCard";
import { NexusAutonomousIcon } from "../ui/NexusIcon";
import { NexusSectionBadge } from "../ui/NexusBadge";
import { NexusSectionButton } from "../ui/NexusButton";
import {
  DASHBOARD_MILESTONE_METRIC_ORDER,
  DASHBOARD_MILESTONE_PRESENTATION,
} from "./dashboardMilestonePresentation";

interface DashboardMilestoneProgressWidgetProps {
  milestones?: DashboardMilestoneProgress[];
  isLoading?: boolean;
  onOpen: () => void;
}

export const DashboardMilestoneProgressWidget: React.FC<
  DashboardMilestoneProgressWidgetProps
> = ({ milestones, isLoading = false, onOpen }) => {
  const hasMilestones = Boolean(milestones?.length);

  return (
    <NexusAutonomousCard className={isLoading ? "animate-pulse" : ""}>
      <div
        className="flex flex-col"
        style={{ gap: "var(--space-lg)" }}
      >
        <div
          className="flex flex-col gap-[var(--space-md)] sm:flex-row sm:items-center sm:justify-between"
        >
          <div
            className="flex min-w-0 items-center"
            style={{ gap: "var(--space-md)" }}
          >
            <NexusAutonomousIcon
              icon={Flag}
              variant="brand"
              hoverGroup="group/milestones"
            />
            <div
              className="flex min-w-0 flex-col"
              style={{ gap: "var(--space-xs)" }}
            >
              <h3 className="text-h1 text-text-main">Progreso de hitos</h3>
              <p className="text-secondary text-text-muted">
                Sigue el avance acumulado de tu operación.
              </p>
            </div>
          </div>
          <NexusSectionButton
            type="button"
            variant="secondary"
            icon={ArrowRight}
            onClick={onOpen}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Ver todos los hitos
          </NexusSectionButton>
        </div>

        {isLoading ? (
          <div
            className="grid grid-cols-1 gap-[var(--space-sm)] sm:grid-cols-2 xl:grid-cols-4"
            aria-hidden="true"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 border border-border-main bg-bg-muted"
                style={{ borderRadius: "var(--radius-card-inner)" }}
              />
            ))}
          </div>
        ) : hasMilestones ? (
          <div className="grid grid-cols-1 gap-[var(--space-sm)] sm:grid-cols-2 xl:grid-cols-4">
            {DASHBOARD_MILESTONE_METRIC_ORDER.map((metric) => {
              const presentation = DASHBOARD_MILESTONE_PRESENTATION[metric];
              const metricMilestones = milestones.filter(
                (milestone) => milestone.metric === metric,
              );
              const currentValue = metricMilestones[0]?.currentValue ?? 0;
              const nextMilestone = metricMilestones.find(
                (milestone) => !milestone.reached,
              );
              const completedCount = metricMilestones.filter(
                (milestone) => milestone.reached,
              ).length;
              const Icon = presentation.icon;

              return (
                <div
                  key={metric}
                  className="flex min-w-0 flex-col border border-border-main bg-bg-muted"
                  style={{
                    gap: "var(--space-sm)",
                    padding: "var(--padding-card-nested)",
                    borderRadius: "var(--radius-card-inner)",
                  }}
                >
                  <div
                    className="flex min-w-0 items-center"
                    style={{ gap: "var(--space-sm)" }}
                  >
                    <div
                      className="grid shrink-0 place-items-center border border-border-main bg-bg-card text-brand-600"
                      style={{
                        width: "var(--size-icon-container-card-nested)",
                        height: "var(--size-icon-container-card-nested)",
                        borderRadius: "var(--radius-card-nested-control)",
                      }}
                    >
                      <Icon
                        style={{
                          width: "var(--size-inner-icon-card)",
                          height: "var(--size-inner-icon-card)",
                        }}
                        strokeWidth={2}
                      />
                    </div>
                    <span className="min-w-0 truncate text-secondary font-semibold text-text-main">
                      {presentation.label}
                    </span>
                  </div>

                  <div className="flex items-end justify-between" style={{ gap: "var(--space-sm)" }}>
                    <strong className="text-h2 tabular-nums text-text-main">
                      {presentation.format(currentValue)}
                    </strong>
                    <NexusSectionBadge
                      icon={CheckCircle2}
                      variant="success"
                    >
                      {completedCount}/{metricMilestones.length}
                    </NexusSectionBadge>
                  </div>

                  <p className="text-label text-text-muted">
                    {nextMilestone
                      ? `Siguiente: ${presentation.format(nextMilestone.threshold)}`
                      : "Todos los hitos actuales completados"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-secondary text-text-muted">
            Aún no hay hitos disponibles para esta cuenta.
          </p>
        )}
      </div>
    </NexusAutonomousCard>
  );
};
