import React from "react";
import {
  BadgePercent,
  CalendarClock,
  Pencil,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import type { RaffleCouponRecord } from "../../../api";
import { NexusAutonomousBadge } from "../../ui/NexusBadge";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusAutonomousCard } from "../../ui/NexusCard";
import { NexusSwitch } from "../../ui/NexusSwitch";

interface RaffleCouponCardProps {
  coupon: RaffleCouponRecord;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isToggling?: boolean;
}

const formatCurrency = (value?: number | null) =>
  value === null || value === undefined
    ? ""
    : new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
      }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export const RaffleCouponCard: React.FC<RaffleCouponCardProps> = ({
  coupon,
  onEdit,
  onDelete,
  onToggleActive,
  isToggling,
}) => {
  const startsAt = formatDate(coupon.startsAt);
  const expiresAt = formatDate(coupon.expiresAt);
  const discount =
    coupon.discountType === "PERCENTAGE"
      ? `${coupon.discountValue}%`
      : formatCurrency(coupon.discountValue);
  const usage = coupon.usageLimit
    ? `${coupon.usedCount} / ${coupon.usageLimit} usos`
    : `${coupon.usedCount} usos`;

  return (
    <NexusAutonomousCard innerClassName="transition-all duration-500">
      <div
        className="grid grid-cols-1 items-stretch lg:grid-cols-[1fr_auto]"
        style={{ gap: "var(--space-md)" }}
      >
        <div
          className="min-w-0 flex flex-col justify-center"
          style={{ gap: "var(--space-sm)" }}
        >
          <div className="flex flex-wrap items-center" style={{ gap: "var(--space-sm)" }}>
            <NexusAutonomousBadge variant="brand" icon={BadgePercent}>
              {discount}
            </NexusAutonomousBadge>
            <NexusAutonomousBadge variant="muted" icon={Ticket}>
              {coupon.raffle?.title || "Todas las rifas"}
            </NexusAutonomousBadge>
            <NexusAutonomousBadge variant="muted" icon={Users}>
              {usage}
            </NexusAutonomousBadge>
            {(startsAt || expiresAt) && (
              <NexusAutonomousBadge variant="muted" icon={CalendarClock}>
                {startsAt || "Ahora"} - {expiresAt || "Sin fin"}
              </NexusAutonomousBadge>
            )}
          </div>

          <div className="min-w-0">
            <h4 className="max-w-[22ch] truncate text-h2 text-text-main sm:max-w-[34ch] lg:max-w-[42ch]">
              {coupon.code}
            </h4>
            {coupon.name && (
              <p className="line-clamp-1 max-w-[52ch] text-secondary text-text-muted">
                {coupon.name}
              </p>
            )}
          </div>

          {(coupon.minTickets || coupon.maxDiscount) && (
            <p className="text-label uppercase text-text-muted">
              {coupon.minTickets
                ? `Mínimo ${coupon.minTickets} ${coupon.minTickets === 1 ? "boleto" : "boletos"}`
                : ""}
              {coupon.minTickets && coupon.maxDiscount ? " · " : ""}
              {coupon.maxDiscount ? `Máximo ${formatCurrency(coupon.maxDiscount)}` : ""}
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-between border-t border-border-main pt-[var(--space-md)] lg:justify-end lg:border-l lg:border-t-0 lg:pl-[var(--space-md)] lg:pt-0"
          style={{ gap: "var(--space-md)" }}
        >
          <div className="flex flex-col items-center" style={{ gap: "var(--space-xs)" }}>
            <NexusSwitch
              checked={coupon.active}
              onChange={onToggleActive}
              disabled={isToggling}
              aria-label={coupon.active ? "Pausar cupón" : "Activar cupón"}
            />
            <span className="text-label uppercase text-text-muted">
              {coupon.active ? "Activo" : "Inactivo"}
            </span>
          </div>

          <div className="flex shrink-0 items-center" style={{ gap: "var(--space-sm)" }}>
            <NexusAutonomousButton
              density="compact"
              variant="secondary"
              isIconOnly
              icon={Pencil}
              onClick={onEdit}
              aria-label="Editar cupón"
            />
            <NexusAutonomousButton
              density="compact"
              variant="secondary"
              isIconOnly
              icon={Trash2}
              onClick={onDelete}
              aria-label="Eliminar cupón"
              className="hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
            />
          </div>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
