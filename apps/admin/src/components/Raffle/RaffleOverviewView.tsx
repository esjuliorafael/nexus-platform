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
import { apiRaffleParticipations } from "../../api";
import { Raffle, RaffleParticipation } from "../../types";
import { NexusAutonomousBadge, type NexusBadgeVariant } from "../ui/NexusBadge";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusAutonomousCard, NexusSectionCard } from "../ui/NexusCard";
import { EmptyState } from "../ui/EmptyState";
import { NexusAutonomousIcon } from "../ui/NexusIcon";
import { NexusSection } from "../ui/NexusSection";

interface RaffleOverviewViewProps {
  raffle: Raffle;
  showToast: (message: string, type?: "success" | "error") => void;
  onOpenTicketBoard: () => void;
  onOpenParticipation: (participation: RaffleParticipation) => void;
}

export type TicketOperationalStatus = "available" | "reserved" | "paid" | "review";

export const RAFFLE_TICKET_STATUS_PRIORITY: Record<TicketOperationalStatus, number> = {
  available: 0,
  review: 1,
  reserved: 2,
  paid: 3,
};

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

const participationStatus = (participation: RaffleParticipation): {
  label: string;
  variant: NexusBadgeVariant;
} => {
  if (participation.status === "PAID") return { label: "Pagada", variant: "success" };
  if (participation.status === "PENDING") return { label: "Apartada", variant: "warning" };
  if (participation.status === "PAYMENT_REVIEW") return { label: "En revisión", variant: "warning" };
  if (participation.status === "CANCELLED") return { label: "Cancelada", variant: "danger" };
  if (participation.status === "NOT_COMPLETED") return { label: "No concretada", variant: "danger" };
  return { label: "Estado mixto", variant: "muted" };
};

const isProtectedPaymentHold = (participation: RaffleParticipation) => {
  if (participation.recordType !== "PAYMENT_HOLD") return false;
  if (!["ACTIVE", "PROCESSING"].includes(String(participation.holdStatus || "").toUpperCase())) return false;
  if (!participation.expiresAt) return true;
  return new Date(participation.expiresAt).getTime() > Date.now();
};

export const resolveRaffleTicketStatus = (participation: RaffleParticipation): TicketOperationalStatus | null => {
  if (participation.status === "PAID") return "paid";
  if (participation.status === "PENDING" || participation.status === "MIXED") return "reserved";
  if (participation.status === "PAYMENT_REVIEW" || isProtectedPaymentHold(participation)) return "review";
  return null;
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
  showToast,
  onOpenTicketBoard,
  onOpenParticipation,
}) => {
  const [participations, setParticipations] = React.useState<RaffleParticipation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    void apiRaffleParticipations.getAll()
      .then((records) => {
        if (!isMounted) return;
        setParticipations(records.filter((record) => Number(record.raffleId) === Number(raffle.id)));
      })
      .catch(() => {
        if (isMounted) showToast("No se pudo cargar el resumen de la rifa.", "error");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [raffle.id, showToast]);

  const ticketNumbers = React.useMemo(() => buildRaffleTicketNumbers(raffle), [raffle]);
  const ticketStatusByNumber = React.useMemo(() => {
    const statusMap = new Map<string, TicketOperationalStatus>();

    participations.forEach((participation) => {
      const nextStatus = resolveRaffleTicketStatus(participation);
      if (!nextStatus) return;

      participation.ticketNumbers.forEach((number) => {
        const currentStatus = statusMap.get(number) || "available";
        if (RAFFLE_TICKET_STATUS_PRIORITY[nextStatus] >= RAFFLE_TICKET_STATUS_PRIORITY[currentStatus]) {
          statusMap.set(number, nextStatus);
        }
      });
    });

    return statusMap;
  }, [participations]);

  const metrics = React.useMemo(() => {
    const paid = Array.from(ticketStatusByNumber.values()).filter((status) => status === "paid").length;
    const reserved = Array.from(ticketStatusByNumber.values()).filter((status) => status === "reserved").length;
    const review = Array.from(ticketStatusByNumber.values()).filter((status) => status === "review").length;
    const occupied = paid + reserved + review;
    const available = Math.max(0, raffle.ticketQuantity - occupied);
    const revenue = participations
      .filter((participation) => participation.status === "PAID")
      .reduce((total, participation) => total + Number(participation.total || 0), 0);

    return {
      paid,
      reserved,
      review,
      occupied,
      available,
      revenue,
      occupancy: raffle.ticketQuantity > 0 ? (occupied / raffle.ticketQuantity) * 100 : 0,
    };
  }, [participations, raffle.ticketQuantity, ticketStatusByNumber]);

  const visibleTickets = ticketNumbers.slice(0, 30);
  const recentParticipations = React.useMemo(
    () => [...participations]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 5),
    [participations],
  );

  return (
    <div className="flex flex-col pb-[var(--space-2xl)]" style={{ gap: "var(--space-lg)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: "var(--space-md)" }}>
        <OverviewMetricCard label="Total vendido" value={formatCurrency(metrics.revenue)} detail={`${metrics.paid} boletos pagados`} icon={WalletCards} variant="emerald" isLoading={isLoading} />
        <OverviewMetricCard label="Disponibles" value={metrics.available.toLocaleString("es-MX")} detail={`de ${raffle.ticketQuantity} boletos`} icon={Ticket} variant="brand" isLoading={isLoading} />
        <OverviewMetricCard label="Apartados" value={metrics.reserved.toLocaleString("es-MX")} detail="Pendientes de pago" icon={Clock3} variant="orange" isLoading={isLoading} />
        <OverviewMetricCard label="En revisión" value={metrics.review.toLocaleString("es-MX")} detail="Procesados con tarjeta" icon={CreditCard} variant="muted" isLoading={isLoading} />
      </div>

      <NexusSection
        title="Ocupación de la Rifa"
        subtitle={`${metrics.occupied} de ${raffle.ticketQuantity} boletos no están disponibles`}
        icon={Activity}
        iconVariant="brand"
      >
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          <div className="flex items-end justify-between" style={{ gap: "var(--space-md)" }}>
            <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
              <span className="text-label uppercase text-text-muted">Ocupación actual</span>
              <span className="text-display font-black text-text-main tabular-nums">{metrics.occupancy.toFixed(1)}%</span>
            </div>
            <span className="text-secondary font-bold text-text-main">{metrics.available} disponibles</span>
          </div>
          <div className="h-[var(--space-sm)] overflow-hidden bg-bg-muted" style={{ borderRadius: "var(--radius-pill)" }}>
            <div
              className="h-full bg-brand-500 transition-[width] duration-500"
              style={{ width: `${Math.min(100, metrics.occupancy)}%`, borderRadius: "inherit", transitionTimingFunction: "var(--ease-emil)" }}
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: "var(--space-sm)" }}>
            <StatusSummary label="Disponibles" value={metrics.available} color="bg-stone-200" />
            <StatusSummary label="Apartados" value={metrics.reserved} color="bg-amber-500" />
            <StatusSummary label="Pagados" value={metrics.paid} color="bg-emerald-500" />
            <StatusSummary label="En revisión" value={metrics.review} color="bg-blue-500" />
          </div>
        </div>
      </NexusSection>

      <NexusSection
        title="Boletera"
        subtitle="Vista resumida de los primeros 30 boletos"
        icon={Ticket}
        action={(
          <NexusSectionButton
            variant="secondary"
            icon={Eye}
            onClick={onOpenTicketBoard}
          >
            Ver boletera completa
          </NexusSectionButton>
        )}
        actionPlacement="below"
      >
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12" style={{ gap: "var(--space-sm)" }}>
            {visibleTickets.map((number) => {
              const status = ticketStatusByNumber.get(number) || "available";
              return <TicketCell key={number} number={number} status={status} />;
            })}
          </div>
          <div className="flex flex-wrap items-center" style={{ gap: "var(--space-md)" }}>
            <LegendItem label="Disponible" color="bg-bg-card" />
            <LegendItem label="Apartado" color="bg-amber-100" />
            <LegendItem label="Pagado" color="bg-emerald-100" />
            <LegendItem label="En revisión" color="bg-blue-100" />
          </div>
        </div>
      </NexusSection>

      <NexusSection
        title="Actividad Reciente"
        subtitle="Últimas participaciones registradas en esta rifa"
        icon={Clock3}
      >
        {isLoading ? (
          <div className="h-36 animate-pulse bg-bg-muted" style={{ borderRadius: "var(--radius-inner-visual)" }} />
        ) : recentParticipations.length === 0 ? (
          <EmptyState level={2} icon={Ticket} title="Sin participaciones" description="La actividad aparecerá cuando se aparten o paguen boletos." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "var(--space-md)" }}>
            {recentParticipations.map((participation) => {
              const status = participationStatus(participation);
              return (
                <NexusSectionCard
                  key={participation.id}
                  icon={Ticket}
                  title={participation.customerName}
                  subtitle={formatDateTime(participation.createdAt)}
                  onClick={() => onOpenParticipation(participation)}
                  rightContent={(
                    <div className="flex flex-col items-end" style={{ gap: "var(--space-xs)" }}>
                      <NexusAutonomousBadge variant={status.variant}>{status.label}</NexusAutonomousBadge>
                      <span className="text-secondary font-bold text-text-main">{participation.ticketCount} {participation.ticketCount === 1 ? "boleto" : "boletos"}</span>
                    </div>
                  )}
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
        <div className="flex items-center justify-between" style={{ gap: "var(--space-md)" }}>
          <NexusAutonomousIcon icon={icon} variant={variant} />
          <span className="text-label uppercase text-text-muted">{label}</span>
        </div>
        {isLoading ? (
          <div className="h-12 animate-pulse bg-bg-muted" style={{ borderRadius: "var(--radius-card-nested)" }} />
        ) : (
          <div className="flex flex-1 flex-col justify-end" style={{ gap: "var(--space-xs)" }}>
            <strong className="text-h1 font-black text-text-main tabular-nums">{value}</strong>
            <span className="text-secondary text-text-muted">{detail}</span>
          </div>
        )}
      </div>
    </NexusAutonomousCard>
  );
}

function StatusSummary({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center border border-border-main bg-bg-card" style={{ gap: "var(--space-sm)", padding: "var(--space-sm)", borderRadius: "var(--radius-inner-visual)" }}>
      <span className={`h-[var(--space-base)] w-[var(--space-base)] shrink-0 rounded-full ${color}`} />
      <span className="min-w-0 flex-1 truncate text-secondary text-text-muted">{label}</span>
      <strong className="text-secondary font-bold text-text-main tabular-nums">{value}</strong>
    </div>
  );
}

function TicketCell({ number, status }: { number: string; status: TicketOperationalStatus }) {
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
    <span className="flex items-center text-secondary text-text-muted" style={{ gap: "var(--space-xs)" }}>
      <span className={`h-[var(--space-base)] w-[var(--space-base)] rounded-full border border-border-main ${color}`} />
      {label}
    </span>
  );
}
