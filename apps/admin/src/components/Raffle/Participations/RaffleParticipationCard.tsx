import React, { useMemo } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleX,
  Clock,
  CreditCard,
  Hash,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { RaffleParticipation } from "../../../types";
import { NexusAutonomousBadge, type NexusBadgeVariant } from "../../ui/NexusBadge";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusAutonomousCard } from "../../ui/NexusCard";
import { NexusAutonomousIcon } from "../../ui/NexusIcon";

interface RaffleParticipationCardProps {
  participation: RaffleParticipation;
  onViewDetail: () => void;
  onMarkAsPaid: () => void;
  onCancel: () => void;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatCurrency = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export const RaffleParticipationCard: React.FC<RaffleParticipationCardProps> = ({
  participation,
  onViewDetail,
  onMarkAsPaid,
  onCancel,
}) => {
  const status = useMemo<{
    label: string;
    icon: LucideIcon;
    iconVariant: "brand" | "emerald" | "orange" | "muted";
    badgeVariant: NexusBadgeVariant;
  }>(() => {
    if (participation.status === "PAID") {
      return { label: "Pagada", icon: CheckCircle2, iconVariant: "emerald", badgeVariant: "success" };
    }
    if (participation.status === "CANCELLED") {
      return { label: "Cancelada", icon: CircleX, iconVariant: "muted", badgeVariant: "danger" };
    }
    if (participation.status === "MIXED") {
      return { label: "Estado mixto", icon: Clock, iconVariant: "muted", badgeVariant: "muted" };
    }
    if (participation.status === "PAYMENT_REVIEW") {
      return { label: "En revisión", icon: Clock, iconVariant: "orange", badgeVariant: "warning" };
    }
    if (participation.status === "NOT_COMPLETED") {
      return { label: "No concretada", icon: CircleX, iconVariant: "muted", badgeVariant: "danger" };
    }
    return { label: "Apartada", icon: Clock, iconVariant: "brand", badgeVariant: "warning" };
  }, [participation.status]);

  const isPendingTransfer = participation.status === "PENDING" && participation.paymentMethod !== "MERCADOPAGO";
  const methodLabel = participation.paymentMethod === "MERCADOPAGO" ? "Tarjeta" : "Transferencia";

  return (
    <NexusAutonomousCard
      swipeable={isPendingTransfer}
      isMuted={["CANCELLED", "NOT_COMPLETED"].includes(participation.status)}
      className={["CANCELLED", "NOT_COMPLETED"].includes(participation.status) ? "opacity-70 grayscale-[0.5]" : ""}
      customSwipeLeft={
        <NexusAutonomousButton variant="success" icon={Check} onClick={onMarkAsPaid}>
          Confirmar pago
        </NexusAutonomousButton>
      }
      customSwipeRight={
        <NexusAutonomousButton
          variant="secondary"
          icon={CircleX}
          onClick={onCancel}
          className="border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
        >
          Cancelar apartado
        </NexusAutonomousButton>
      }
    >
      <button
        type="button"
        onClick={onViewDetail}
        className="flex w-full flex-col text-left sm:flex-row sm:items-center"
        style={{ gap: "var(--space-md)" }}
      >
        <div className="flex min-w-0 flex-1 items-center" style={{ gap: "var(--space-md)" }}>
          <NexusAutonomousIcon
            icon={Ticket}
            variant={status.iconVariant}
            isMuted={["CANCELLED", "NOT_COMPLETED"].includes(participation.status)}
            style={{ width: "var(--size-card-thumb)", height: "var(--size-card-thumb)" }}
          />

          <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--space-sm)" }}>
            <div className="flex min-w-0 flex-wrap items-center" style={{ gap: "var(--space-xs)" }}>
              <NexusAutonomousBadge variant={status.badgeVariant} icon={status.icon}>
                {status.label}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge variant="brand" icon={Hash}>
                {participation.ticketCount > 0
                  ? `${participation.ticketCount} ${participation.ticketCount === 1 ? "boleto" : "boletos"}`
                  : "Selección liberada"}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge variant="muted" icon={CreditCard}>
                {methodLabel}
              </NexusAutonomousBadge>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-h2 font-bold text-text-main">{participation.customerName}</h3>
              <p className="truncate text-secondary text-text-muted">{participation.raffleTitle}</p>
            </div>
          </div>
        </div>

        <div
          className="flex w-full items-center justify-between border-t border-border-main pt-[var(--space-md)] sm:nexus-card-divider-desktop sm:w-auto sm:border-t-0 sm:pt-0 sm:pl-[var(--space-md)]"
          style={{ gap: "var(--space-lg)" }}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
            <span className="text-label uppercase tracking-[0.15em] text-text-muted">Fecha</span>
            <span className="flex items-center text-secondary font-bold text-text-main" style={{ gap: "var(--space-xs)" }}>
              <Calendar size={12} /> {formatDate(participation.createdAt)}
            </span>
          </div>
          <div className="flex flex-col items-end" style={{ gap: "var(--space-xs)" }}>
            <span className="text-label uppercase tracking-[0.15em] text-text-muted">Total</span>
            <span className="text-h1 font-black text-text-main">
              {participation.ticketCount > 0 ? formatCurrency(participation.total) : "No disponible"}
            </span>
          </div>

          <div className="hidden items-center sm:flex" style={{ gap: "var(--space-sm)" }}>
            {isPendingTransfer && (
              <>
                <NexusAutonomousButton
                  density="compact"
                  variant="success"
                  isIconOnly
                  icon={Check}
                  title="Confirmar pago"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMarkAsPaid();
                  }}
                />
                <NexusAutonomousButton
                  density="compact"
                  variant="secondary"
                  isIconOnly
                  icon={CircleX}
                  title="Cancelar apartado"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCancel();
                  }}
                />
              </>
            )}
            <NexusAutonomousButton
              density="compact"
              variant="dark"
              isIconOnly
              icon={ChevronRight}
              title="Ver detalle"
              onClick={(event) => {
                event.stopPropagation();
                onViewDetail();
              }}
            />
          </div>
        </div>
      </button>
    </NexusAutonomousCard>
  );
};
