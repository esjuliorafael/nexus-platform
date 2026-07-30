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
  MoreVertical,
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
  canManageOperations: boolean;
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
  canManageOperations,
  onViewDetail,
  onMarkAsPaid,
  onCancel,
}) => {
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
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
  const canManagePendingTransfer = canManageOperations && isPendingTransfer;
  const methodLabel = participation.paymentMethod === "MERCADOPAGO" ? "Tarjeta" : "Dep. / Trans.";

  return (
    <NexusAutonomousCard
      swipeable={canManagePendingTransfer}
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
      <div
        role="button"
        tabIndex={0}
        onClick={onViewDetail}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onViewDetail();
          }
        }}
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
              <NexusAutonomousBadge variant="muted" icon={CreditCard}>
                {methodLabel}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge variant="brand" icon={Hash} className="hidden sm:inline-flex">
                {participation.ticketCount > 0
                  ? `${participation.ticketCount} ${participation.ticketCount === 1 ? "boleto" : "boletos"}`
                  : "Selección liberada"}
              </NexusAutonomousBadge>
            </div>
            <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
              <h3 className="truncate text-h2 font-bold text-text-main">{participation.customerName}</h3>
              <p className="truncate text-secondary text-text-muted">{participation.raffleTitle}</p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center sm:hidden" style={{ gap: "var(--space-xs)" }}>
          <NexusAutonomousBadge variant="brand" icon={Hash}>
            {participation.ticketCount > 0
              ? `${participation.ticketCount} ${participation.ticketCount === 1 ? "boleto" : "boletos"}`
              : "Selección liberada"}
          </NexusAutonomousBadge>
        </div>

        <div
          className="flex w-full items-center justify-between border-t border-border-main pt-[var(--space-md)] sm:hidden"
          style={{ gap: "var(--space-md)" }}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
            <span className="text-label uppercase tracking-[0.15em] text-text-muted">Fecha</span>
            <span className="flex items-center text-secondary font-bold text-text-main" style={{ gap: "var(--space-xs)" }}>
              <Calendar style={{ width: "var(--size-inner-icon-badge)", height: "var(--size-inner-icon-badge)" }} />
              {formatDate(participation.createdAt)}
            </span>
          </div>
          <div className="flex flex-col items-end" style={{ gap: "var(--space-xs)" }}>
            <span className="text-label uppercase tracking-[0.15em] text-text-muted">Total</span>
            <span className="text-secondary font-bold text-text-main">
              {participation.ticketCount > 0 ? formatCurrency(participation.total) : "No disponible"}
            </span>
          </div>

        </div>

        <div
          className="nexus-card-divider-desktop relative hidden shrink-0 items-center pl-[var(--space-md)] sm:flex"
          style={{ minWidth: "var(--width-operation-card-summary)", minHeight: "var(--size-button-card)" }}
        >
          {isActionsOpen ? (
            <div
              className="animate-raffle-actions-enter absolute inset-y-0 right-0 flex items-center justify-end"
              style={{ gap: "var(--space-sm)", left: "var(--space-md)" }}
            >
            {canManagePendingTransfer && (
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
              <NexusAutonomousButton
                density="compact"
                variant="secondary"
                isIconOnly
                icon={MoreVertical}
                title="Cerrar acciones"
                aria-expanded
                onClick={(event) => {
                  event.stopPropagation();
                  setIsActionsOpen(false);
                }}
              />
            </div>
          ) : (
            <div
              className="animate-raffle-summary-enter absolute inset-y-0 right-0 flex items-center justify-end"
              style={{ gap: "var(--space-lg)", left: "var(--space-md)" }}
            >
              <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                <span className="text-label uppercase tracking-[0.15em] text-text-muted">Fecha</span>
                <span className="flex items-center text-secondary font-bold text-text-main" style={{ gap: "var(--space-xs)" }}>
                  <Calendar style={{ width: "var(--size-inner-icon-badge)", height: "var(--size-inner-icon-badge)" }} />
                  {formatDate(participation.createdAt)}
                </span>
              </div>
              <div
                className="flex flex-col items-end"
                style={{ gap: "var(--space-xs)", minWidth: "var(--width-operation-card-total)" }}
              >
                <span className="text-label uppercase tracking-[0.15em] text-text-muted">Total</span>
                <span className="text-secondary font-bold text-text-main">
                  {participation.ticketCount > 0 ? formatCurrency(participation.total) : "No disponible"}
                </span>
              </div>
              <NexusAutonomousButton
                density="compact"
                variant="secondary"
                isIconOnly
                icon={MoreVertical}
                title="Más acciones"
                aria-expanded={false}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsActionsOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
