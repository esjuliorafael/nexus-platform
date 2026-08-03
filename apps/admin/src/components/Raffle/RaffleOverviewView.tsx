import React from "react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  CircleX,
  Clock3,
  CreditCard,
  Eye,
  Hash,
  ReceiptText,
  Ticket,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Raffle, RaffleParticipation } from "../../types";
import { NexusCardBadge, type NexusBadgeVariant } from "../ui/NexusBadge";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusAutonomousCard } from "../ui/NexusCard";
import { EmptyState } from "../ui/EmptyState";
import { NexusAutonomousIcon } from "../ui/NexusIcon";
import { NexusSection } from "../ui/NexusSection";
import { NexusPaginator } from "../ui/NexusPaginator";
import { NexusSectionSearch } from "../ui/NexusSearchInput";
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

const formatParticipationCurrency = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatMxn = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

const HISTORY_PAGE_SIZE = 8;

const normalizeHistorySearch = (value: string) =>
  value
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const participationStatus = (
  participation: RaffleParticipation,
): {
  label: string;
  variant: NexusBadgeVariant;
  icon: LucideIcon;
} => {
  if (participation.status === "PAID")
    return { label: "Pagada", variant: "success", icon: CheckCircle2 };
  if (participation.status === "PENDING")
    return { label: "Apartada", variant: "warning", icon: Clock3 };
  if (participation.status === "PAYMENT_REVIEW")
    return { label: "En revisión", variant: "warning", icon: Clock3 };
  if (participation.status === "CANCELLED")
    return { label: "Cancelada", variant: "danger", icon: CircleX };
  if (participation.status === "NOT_COMPLETED")
    return { label: "No concretada", variant: "danger", icon: CircleX };
  return { label: "Estado mixto", variant: "muted", icon: Clock3 };
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
  const [historySearch, setHistorySearch] = React.useState("");
  const [historyPage, setHistoryPage] = React.useState(1);
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
  const participationHistory = overview?.participationHistory || [];
  const filteredParticipationHistory = React.useMemo(() => {
    const query = normalizeHistorySearch(historySearch);
    if (!query) return participationHistory;
    return participationHistory.filter((participation) =>
      normalizeHistorySearch(
        [
          participation.customerName,
          participation.customerPhone,
          participation.ticketNumbers.join(" "),
          participation.paymentMethod,
          participation.status,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query),
    );
  }, [historySearch, participationHistory]);
  const historyTotalPages = Math.max(
    1,
    Math.ceil(filteredParticipationHistory.length / HISTORY_PAGE_SIZE),
  );
  const visibleParticipationHistory = filteredParticipationHistory.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE,
  );

  React.useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, raffle.id]);

  React.useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages);
  }, [historyPage, historyTotalPages]);

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
        title="Costo de Mensajería Meta"
        subtitle="Estimación de plantillas Cloud API entregadas para esta rifa. No incluye la mensualidad de Kapso."
        icon={ReceiptText}
        iconVariant="emerald"
      >
        {isLoading ? (
          <div
            className="h-28 animate-pulse bg-bg-muted"
            style={{ borderRadius: "var(--radius-inner-visual)" }}
          />
        ) : (
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <div
              className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
              style={{ gap: "var(--space-md)" }}
            >
              <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                <span className="text-label uppercase text-text-muted">
                  Estimado acumulado
                </span>
                <span className="text-display font-black text-text-main tabular-nums">
                  {formatMxn(overview?.messagingCost?.estimatedMxn || 0)}
                </span>
              </div>
              <div className="text-secondary text-text-muted sm:text-right">
                {(overview?.messagingCost?.totalDelivered || 0).toLocaleString("es-MX")} entregas Cloud API
              </div>
            </div>

            {(overview?.messagingCost?.breakdown || []).length > 0 ? (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                style={{ gap: "var(--space-sm)" }}
              >
                {overview?.messagingCost.breakdown.map((item) => (
                  <div
                    key={`${item.country}-${item.category}`}
                    className="flex flex-col border border-border-main bg-bg-muted"
                    style={{
                      gap: "var(--space-xs)",
                      padding: "var(--space-sm)",
                      borderRadius: "var(--radius-inner-visual)",
                    }}
                  >
                    <span className="text-label uppercase text-text-muted">
                      {item.country === "UNKNOWN"
                        ? "Destino sin tarifa"
                        : item.country === "US"
                          ? "Norteamérica"
                          : item.country === "GT"
                            ? "Resto de Latinoamérica"
                          : item.country} · {item.category === "MARKETING" ? "Promocional" : "Operativa"}
                    </span>
                    <span className="text-secondary font-bold text-text-main tabular-nums">
                      {item.delivered} {item.delivered === 1 ? "entrega" : "entregas"}
                    </span>
                    <span className="text-secondary font-bold text-emerald-700 tabular-nums">
                      {formatMxn(item.estimatedMxn)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary text-text-muted">
                Aún no hay plantillas entregadas mediante Cloud API para esta rifa.
              </p>
            )}

            {(overview?.messagingCost?.unpriced || 0) > 0 && (
              <p className="text-secondary text-amber-700">
                {overview?.messagingCost.unpriced} entregas no se incluyen porque su destino o tarifa Meta aún no está configurado.
              </p>
            )}
            {(overview?.messagingCost?.exempt || 0) > 0 && (
              <p className="text-secondary text-emerald-700">
                {overview?.messagingCost.exempt} entregas operativas exentas por una conversación activa de 24 horas.
              </p>
            )}
            {(overview?.messagingCost?.delivered || 0) > 0 && (
              <p className="text-secondary text-text-muted">
                {overview?.messagingCost.delivered} entregas estimadas como facturables.
              </p>
            )}
            {(overview?.messagingCost?.legacy || 0) > 0 && (
              <p className="text-secondary text-amber-700">
                {overview?.messagingCost.legacy} entregas históricas no tenían snapshot y usan la tarifa de referencia actual.
              </p>
            )}
            <p className="text-secondary text-text-muted">
              Referencia de tarifas {overview?.messagingCost?.rateCardVersion}. Meta confirma el importe final en su facturación según mercado, categoría y condiciones de entrega.
            </p>
          </div>
        )}
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

      <RaffleInvitationSection
        raffle={raffle}
        canManageOperations={canManageOperations}
        showToast={showToast}
      />

      <RaffleResultCommunicationSection
        raffle={raffle}
        canManageOperations={canManageOperations}
        showToast={showToast}
        content="reminder"
      />

      <RaffleResultSection
        raffle={raffle}
        canManageOperations={canManageOperations}
        showToast={showToast}
        onRaffleChange={onRaffleChange}
        content="resolution"
      />

      <RaffleResultCommunicationSection
        raffle={raffle}
        canManageOperations={canManageOperations}
        showToast={showToast}
        content="results"
      />

      <RaffleResultSection
        raffle={raffle}
        canManageOperations={canManageOperations}
        showToast={showToast}
        onRaffleChange={onRaffleChange}
        content="history"
      />

      <NexusSection
        title="Historial de Participaciones"
        subtitle={`${participationHistory.length.toLocaleString("es-MX")} ${
          participationHistory.length === 1 ? "participación" : "participaciones"
        } registradas en esta rifa.`}
        icon={Clock3}
        action={
          <NexusSectionSearch
            value={historySearch}
            onValueChange={setHistorySearch}
            placeholder="Buscar participante o boleto..."
            aria-label="Buscar en el historial de participaciones"
          />
        }
      >
        {isLoading ? (
          <div
            className="h-36 animate-pulse bg-bg-muted"
            style={{ borderRadius: "var(--radius-inner-visual)" }}
          />
        ) : filteredParticipationHistory.length === 0 ? (
          <EmptyState
            level={2}
            icon={Ticket}
            title={participationHistory.length ? "Sin resultados" : "Sin participaciones"}
            description={
              participationHistory.length
                ? "Ajusta la búsqueda para consultar otra participación."
                : "Los apartados y pagos de boletos aparecerán aquí."
            }
          />
        ) : (
          <>
            <div className="divide-y divide-border-main">
              {visibleParticipationHistory.map((participation) => {
                const status = participationStatus(participation);
                const ticketPreview = participation.ticketNumbers.slice(0, 3).join(", ");
                const remainingTickets = participation.ticketNumbers.length - 3;
                return (
                  <article
                    key={participation.id}
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center py-[var(--space-md)] first:pt-0 last:pb-0 lg:grid-cols-[var(--size-icon-section-compact)_minmax(0,1.15fr)_minmax(0,1fr)_7.5rem_8rem_7.5rem]"
                    style={{ gap: "var(--space-md)" }}
                  >
                    <div
                      className="grid shrink-0 place-items-center border border-border-main bg-bg-muted text-brand-600"
                      style={{
                        width: "var(--size-icon-section-compact)",
                        height: "var(--size-icon-section-compact)",
                        borderRadius: "var(--radius-inner-visual)",
                      }}
                    >
                      <Ticket
                        style={{
                          width: "var(--size-inner-icon-section-compact)",
                          height: "var(--size-inner-icon-section-compact)",
                        }}
                        strokeWidth={2}
                      />
                    </div>

                    <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-sm)" }}>
                      <div className="flex min-w-0 flex-wrap items-center" style={{ gap: "var(--space-xs)" }}>
                        <NexusCardBadge variant={status.variant} icon={status.icon}>
                          {status.label}
                        </NexusCardBadge>
                        <NexusCardBadge variant="muted" icon={CreditCard}>
                          {participation.paymentMethod === "MERCADOPAGO" ? "Tarjeta" : "Dep. / Trans."}
                        </NexusCardBadge>
                      </div>
                      <strong className="truncate text-body font-bold text-text-main" title={participation.customerName}>
                        {participation.customerName}
                      </strong>
                    </div>

                    <div className="col-span-2 flex min-w-0 items-center lg:col-span-1" style={{ gap: "var(--space-xs)" }}>
                      <p className="min-w-0 flex-1 truncate text-secondary text-text-muted" title={participation.ticketNumbers.join(", ")}>
                        {ticketPreview}
                      </p>
                      {remainingTickets > 0 && (
                        <NexusCardBadge variant="muted">+{remainingTickets}</NexusCardBadge>
                      )}
                    </div>

                    <div className="hidden min-w-0 flex-col lg:flex" style={{ gap: "var(--space-xs)" }}>
                      <strong className="whitespace-nowrap text-body font-bold tabular-nums text-text-main">
                        {new Date(participation.createdAt).toLocaleDateString("es-MX")}
                      </strong>
                      <span className="text-secondary tabular-nums text-text-muted">
                        {new Date(participation.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="col-span-2 flex min-w-0 items-center justify-between lg:col-span-1 lg:flex-col lg:items-end" style={{ gap: "var(--space-sm)" }}>
                      <div className="flex min-w-0 flex-col lg:hidden" style={{ gap: "var(--space-xs)" }}>
                        <strong className="text-body font-bold tabular-nums text-text-main">
                          {new Date(participation.createdAt).toLocaleDateString("es-MX")}
                        </strong>
                        <span className="text-secondary tabular-nums text-text-muted">
                          {new Date(participation.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-col items-end" style={{ gap: "var(--space-xs)" }}>
                        <strong className="text-body font-bold tabular-nums text-text-main">
                          {formatParticipationCurrency(participation.total)}
                        </strong>
                        <span className="text-secondary text-text-muted">
                          {participation.ticketCount} {participation.ticketCount === 1 ? "boleto" : "boletos"}
                        </span>
                      </div>
                    </div>

                    <NexusSectionButton
                      type="button"
                      variant="secondary"
                      icon={Eye}
                      onClick={() => onOpenParticipation(participation)}
                      className="col-span-2 w-full lg:col-span-1"
                      aria-label={`Ver detalle de ${participation.customerName}`}
                    >
                      Ver
                    </NexusSectionButton>
                  </article>
                );
              })}
            </div>
            <NexusPaginator
              currentPage={historyPage}
              totalPages={historyTotalPages}
              onPageChange={setHistoryPage}
              context="section"
            />
          </>
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
