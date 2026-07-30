import React from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  Hash,
  Ticket,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Raffle, RaffleParticipation } from "../../types";
import { NexusAutonomousBadge, type NexusBadgeVariant } from "../ui/NexusBadge";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusAutonomousCard, NexusSectionCard } from "../ui/NexusCard";
import { EmptyState } from "../ui/EmptyState";
import { NexusAutonomousIcon } from "../ui/NexusIcon";
import { NexusSection } from "../ui/NexusSection";
import { useRaffleOperationalOverview } from "./useRaffleOperationalOverview";
import { RaffleResultSection } from "./RaffleResultSection";
import { RaffleResultCommunicationSection } from "./RaffleResultCommunicationSection";
import { RaffleInvitationSection } from "./RaffleInvitationSection";

interface RaffleOverviewViewProps {
  raffle: Raffle;
  canManageOperations: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
  onRaffleChange: (raffle: Raffle) => void;
  onOpenTicketBoard: () => void;
  onOpenParticipation: (participation: RaffleParticipation) => void;
}

export type TicketOperationalStatus =
  | "available"
  | "reserved"
  | "paid"
  | "review";

const formatCurrency = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const participationStatus = (
  participation: RaffleParticipation,
): {
  label: string;
  variant: NexusBadgeVariant;
} => {
  if (participation.status === "PAID")
    return { label: "Pagada", variant: "success" };
  if (participation.status === "PENDING")
    return { label: "Apartada", variant: "warning" };
  if (participation.status === "PAYMENT_REVIEW")
    return { label: "En revisión", variant: "warning" };
  if (participation.status === "CANCELLED")
    return { label: "Cancelada", variant: "danger" };
  if (participation.status === "NOT_COMPLETED")
    return { label: "No concretada", variant: "danger" };
  return { label: "Estado mixto", variant: "muted" };
};

export const buildRaffleTicketNumbers = (raffle: Raffle) => {
  const startsFromZero = raffle.opportunities <= 1 && raffle.useZero;
  return Array.from({ length: raffle.ticketQuantity }, (_, index) => {
    const value = startsFromZero ? index : index + 1;
    return String(value).padStart(raffle.digits, "0");
  });
};

export const RaffleOverviewView: React.FC<RaffleOverviewViewProps> = ({
  raffle,
  canManageOperations,
  showToast,
  onRaffleChange,
  onOpenTicketBoard,
  onOpenParticipation,
}) => {
  const { overview, isLoading } = useRaffleOperationalOverview(
    raffle.id,
    showToast,
  );

  const ticketNumbers = React.useMemo(
    () => buildRaffleTicketNumbers(raffle),
    [raffle],
  );
  const ticketStatusByNumber = React.useMemo(() => {
    return new Map<string, TicketOperationalStatus>(
      (overview?.ticketStatuses || []).map((entry) => [
        entry.ticketNumber,
        entry.status,
      ]),
    );
  }, [overview?.ticketStatuses]);

  const metrics = overview?.metrics || {
    paid: 0,
    reserved: 0,
    review: 0,
    occupied: 0,
    available: raffle.ticketQuantity,
    revenue: 0,
    occupancy: 0,
  };

  const visibleTickets = ticketNumbers.slice(0, 30);
  const recentParticipations = overview?.recentParticipations || [];

  return (
    <div
      className="flex flex-col"
      style={{ gap: "var(--space-lg)" }}
    >
      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        style={{ gap: "var(--space-md)" }}
      >
        <OverviewMetricCard
          label="Total vendido"
          value={formatCurrency(metrics.revenue)}
          detail={`${metrics.paid} boletos pagados`}
          icon={WalletCards}
          variant="emerald"
          isLoading={isLoading}
        />
        <OverviewMetricCard
          label="Disponibles"
          value={metrics.available.toLocaleString("es-MX")}
          detail={`de ${raffle.ticketQuantity} boletos`}
          icon={Ticket}
          variant="brand"
          isLoading={isLoading}
        />
        <OverviewMetricCard
          label="Apartados"
          value={metrics.reserved.toLocaleString("es-MX")}
          detail="Pendientes de pago"
          icon={Clock3}
          variant="orange"
          isLoading={isLoading}
        />
        <OverviewMetricCard
          label="En revisión"
          value={metrics.review.toLocaleString("es-MX")}
          detail="Procesados con tarjeta"
          icon={CreditCard}
          variant="muted"
          isLoading={isLoading}
        />
      </div>

      <NexusSection
        title="Ocupación de la Rifa"
        subtitle={`${metrics.occupied} de ${raffle.ticketQuantity} boletos no están disponibles`}
        icon={Activity}
        iconVariant="brand"
      >
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          <div
            className="flex items-end justify-between"
            style={{ gap: "var(--space-md)" }}
          >
            <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
              <span className="text-label uppercase text-text-muted">
                Ocupación actual
              </span>
              <span className="text-display font-black text-text-main tabular-nums">
                {metrics.occupancy.toFixed(1)}%
              </span>
            </div>
            <span className="text-secondary font-bold text-text-main">
              {metrics.available} disponibles
            </span>
          </div>
          <div
            className="h-[var(--space-sm)] overflow-hidden bg-bg-muted"
            style={{ borderRadius: "var(--radius-pill)" }}
          >
            <div
              className="h-full bg-brand-500 transition-[width] duration-500"
              style={{
                width: `${Math.min(100, metrics.occupancy)}%`,
                borderRadius: "inherit",
                transitionTimingFunction: "var(--ease-emil)",
              }}
            />
          </div>
          <div
            className="grid grid-cols-2 lg:grid-cols-4"
            style={{ gap: "var(--space-sm)" }}
          >
            <StatusSummary
              label="Disponibles"
              value={metrics.available}
              color="bg-stone-200"
            />
            <StatusSummary
              label="Apartados"
              value={metrics.reserved}
              color="bg-amber-500"
            />
            <StatusSummary
              label="Pagados"
              value={metrics.paid}
              color="bg-emerald-500"
            />
            <StatusSummary
              label="En revisión"
              value={metrics.review}
              color="bg-blue-500"
            />
          </div>
        </div>
      </NexusSection>

      <NexusSection
        title="Boletera"
        subtitle="Vista resumida de los primeros 30 boletos"
        icon={Ticket}
        action={
          <NexusSectionButton
            variant="brand"
            icon={Eye}
            onClick={onOpenTicketBoard}
          >
            Ver Boletera Completa
          </NexusSectionButton>
        }
      >
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          <div
            className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12"
            style={{ gap: "var(--space-sm)" }}
          >
            {visibleTickets.map((number) => {
              const status = ticketStatusByNumber.get(number) || "available";
              return (
                <TicketCell key={number} number={number} status={status} />
              );
            })}
          </div>
          <div
            className="flex flex-wrap items-center"
            style={{ gap: "var(--space-md)" }}
          >
            <LegendItem label="Disponible" color="bg-bg-card" />
            <LegendItem label="Apartado" color="bg-amber-100" />
            <LegendItem label="Pagado" color="bg-emerald-100" />
            <LegendItem label="En revisión" color="bg-blue-100" />
          </div>
        </div>
      </NexusSection>

      <RaffleResultSection
        raffle={raffle}
        canManageOperations={canManageOperations}
        showToast={showToast}
        onRaffleChange={onRaffleChange}
      />

      <RaffleInvitationSection
        raffle={raffle}
        canManageOperations={canManageOperations}
        showToast={showToast}
      />

      <RaffleResultCommunicationSection
        raffle={raffle}
        canManageOperations={canManageOperations}
        showToast={showToast}
      />

      <NexusSection
        title="Actividad Reciente"
        subtitle="Últimas participaciones registradas en esta rifa"
        icon={Clock3}
      >
        {isLoading ? (
          <div
            className="h-36 animate-pulse bg-bg-muted"
            style={{ borderRadius: "var(--radius-inner-visual)" }}
          />
        ) : recentParticipations.length === 0 ? (
          <EmptyState
            level={2}
            icon={Ticket}
            title="Sin participaciones"
            description="La actividad aparecerá cuando se aparten o paguen boletos."
          />
        ) : (
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: "var(--space-md)" }}
          >
            {recentParticipations.map((participation) => {
              const status = participationStatus(participation);
              return (
                <NexusSectionCard
                  key={participation.id}
                  icon={Ticket}
                  title={participation.customerName}
                  subtitle={formatDateTime(participation.createdAt)}
                  onClick={() => onOpenParticipation(participation)}
                  rightContent={
                    <div
                      className="flex flex-col items-end"
                      style={{ gap: "var(--space-xs)" }}
                    >
                      <NexusAutonomousBadge variant={status.variant}>
                        {status.label}
                      </NexusAutonomousBadge>
                      <span className="text-secondary font-bold text-text-main">
                        {participation.ticketCount}{" "}
                        {participation.ticketCount === 1 ? "boleto" : "boletos"}
                      </span>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </NexusSection>
    </div>
  );
};

function OverviewMetricCard({
  label,
  value,
  detail,
  icon,
  variant,
  isLoading,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  variant: "brand" | "emerald" | "orange" | "muted";
  isLoading: boolean;
}) {
  return (
    <NexusAutonomousCard className="h-full">
      <div className="flex h-full flex-col" style={{ gap: "var(--space-md)" }}>
        <div
          className="flex items-center justify-between"
          style={{ gap: "var(--space-md)" }}
        >
          <NexusAutonomousIcon icon={icon} variant={variant} />
          <span className="text-label uppercase text-text-muted">{label}</span>
        </div>
        {isLoading ? (
          <div
            className="h-12 animate-pulse bg-bg-muted"
            style={{ borderRadius: "var(--radius-card-nested)" }}
          />
        ) : (
          <div
            className="flex flex-1 flex-col justify-end"
            style={{ gap: "var(--space-xs)" }}
          >
            <strong className="text-h1 font-black text-text-main tabular-nums">
              {value}
            </strong>
            <span className="text-secondary text-text-muted">{detail}</span>
          </div>
        )}
      </div>
    </NexusAutonomousCard>
  );
}

function StatusSummary({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center border border-border-main bg-bg-card"
      style={{
        gap: "var(--space-sm)",
        padding: "var(--space-sm)",
        borderRadius: "var(--radius-inner-visual)",
      }}
    >
      <span
        className={`h-[var(--space-base)] w-[var(--space-base)] shrink-0 rounded-full ${color}`}
      />
      <span className="min-w-0 flex-1 truncate text-secondary text-text-muted">
        {label}
      </span>
      <strong className="text-secondary font-bold text-text-main tabular-nums">
        {value}
      </strong>
    </div>
  );
}

function TicketCell({
  number,
  status,
}: {
  number: string;
  status: TicketOperationalStatus;
}) {
  const styles: Record<TicketOperationalStatus, string> = {
    available: "border-border-main bg-bg-card text-text-main",
    reserved: "border-amber-200 bg-amber-50 text-amber-700",
    paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
    review: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <div
      className={`flex aspect-square items-center justify-center border text-label font-black tabular-nums ${styles[status]}`}
      style={{ borderRadius: "var(--radius-nested-compact)" }}
      title={`${number}: ${status}`}
    >
      {number}
    </div>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="flex items-center text-secondary text-text-muted"
      style={{ gap: "var(--space-xs)" }}
    >
      <span
        className={`h-[var(--space-base)] w-[var(--space-base)] rounded-full border border-border-main ${color}`}
      />
      {label}
    </span>
  );
}
