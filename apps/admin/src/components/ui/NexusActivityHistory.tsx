import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleX,
  Clock3,
  CreditCard,
  History,
  MessageCircle,
  RotateCcw,
  ShoppingBag,
  UserRoundCog,
  PackageCheck,
  PackagePlus,
  PackageX,
  PauseCircle,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { ActivityEvent } from "../../types";
import { NexusBadge, type NexusBadgeVariant } from "./NexusBadge";
import { NexusSectionButton } from "./NexusButton";

type EventPresentation = {
  label: string;
  icon: LucideIcon;
  variant: NexusBadgeVariant;
};

const EVENT_PRESENTATION: Record<string, EventPresentation> = {
  ORDER_CREATED: { label: "Apartado creado", icon: ShoppingBag, variant: "brand" },
  PARTICIPATION_CREATED: { label: "Participación creada", icon: ShoppingBag, variant: "brand" },
  PAYMENT_CONFIRMED: { label: "Pago confirmado", icon: CheckCircle2, variant: "success" },
  CANCELLED: { label: "Cancelación", icon: CircleX, variant: "danger" },
  AUTO_CANCELLED: { label: "Cancelación automática", icon: Clock3, variant: "danger" },
  RESTORED: { label: "Apartado restaurado", icon: RotateCcw, variant: "brand" },
  PAYMENT_REFUNDED: { label: "Pago devuelto", icon: RotateCcw, variant: "warning" },
  PAYMENT_FAILED: { label: "Pago fallido", icon: CircleX, variant: "danger" },
  PAYMENT_EXPIRED: { label: "Pago expirado", icon: Clock3, variant: "danger" },
  PAYMENT_METHOD_CHANGED: { label: "Método de pago cambiado", icon: CreditCard, variant: "info" },
  CUSTOMER_UPDATED: { label: "Cliente actualizado", icon: UserRoundCog, variant: "info" },
  PARTICIPANT_UPDATED: { label: "Participante actualizado", icon: UserRoundCog, variant: "info" },
  WHATSAPP_RESENT: { label: "WhatsApp reenviado", icon: MessageCircle, variant: "success" },
  TICKET_SALE_DELETED: { label: "Registro eliminado", icon: CircleX, variant: "danger" },
  RESULT_PUBLISHED: { label: "Resultado publicado", icon: CheckCircle2, variant: "success" },
  DATE_CHANGE_QUEUED: { label: "Cambio de fecha preparado", icon: Clock3, variant: "info" },
  DRAW_REMINDER_QUEUED: { label: "Recordatorio preparado", icon: Clock3, variant: "info" },
  PRODUCT_CREATED: { label: "Producto creado", icon: PackagePlus, variant: "brand" },
  PRODUCT_UPDATED: { label: "Producto actualizado", icon: UserRoundCog, variant: "info" },
  PRODUCT_PUBLISHED: { label: "Producto publicado", icon: PackageCheck, variant: "success" },
  PRODUCT_PAUSED: { label: "Producto pausado", icon: PauseCircle, variant: "warning" },
  PRODUCT_FEATURED: { label: "Producto destacado", icon: Star, variant: "warning" },
  PRODUCT_UNFEATURED: { label: "Destacado retirado", icon: Star, variant: "muted" },
  PRODUCT_ARCHIVED: { label: "Producto archivado", icon: PackageX, variant: "danger" },
  SALE_CONFIRMED: { label: "Venta confirmada", icon: CheckCircle2, variant: "success" },
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const roleLabel = (role?: string | null) => {
  if (role === "SUPERADMIN") return "Superadmin";
  if (role === "ADMIN") return "Administrador";
  if (role === "STAFF") return "Colaborador";
  return null;
};

const originLabel = (origin: string) => {
  if (origin === "ADMIN") return "Admin";
  if (origin === "MERCADO_PAGO") return "Mercado Pago";
  if (origin === "STOREFRONT") return "Storefront";
  return "Sistema";
};

export const NexusActivityHistory = ({
  events,
  emptyMessage = "Aún no hay actividad registrada.",
}: {
  events?: ActivityEvent[];
  emptyMessage?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const sortedEvents = useMemo(
    () =>
      [...(events || [])].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [events],
  );
  const visibleEvents = expanded ? sortedEvents : sortedEvents.slice(0, 5);

  if (sortedEvents.length === 0) {
    return <p className="text-secondary text-text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
      <div className="flex flex-col">
        {visibleEvents.map((event, index) => {
          const presentation = EVENT_PRESENTATION[event.eventType] || {
            label: event.eventType.replaceAll("_", " "),
            icon: History,
            variant: "muted" as const,
          };
          const Icon = presentation.icon;
          const actor = event.actorName || "Responsable no registrado";
          const actorRole = roleLabel(event.actorRole);

          return (
            <div
              key={event.id}
              className="flex items-start border-b border-border-main last:border-b-0"
              style={{
                gap: "var(--space-md)",
                paddingBlock:
                  index === 0 ? "0 var(--space-md)" : "var(--space-md)",
              }}
            >
              <div
                className="flex shrink-0 items-center justify-center border border-border-main bg-bg-muted text-text-muted"
                style={{
                  width: "var(--h-button-card)",
                  height: "var(--h-button-card)",
                  borderRadius: "var(--radius-nested-simple)",
                }}
              >
                <Icon
                  strokeWidth={2}
                  style={{
                    width: "var(--size-inner-icon-card)",
                    height: "var(--size-inner-icon-card)",
                  }}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--space-xs)" }}>
                <div className="flex flex-wrap items-center" style={{ gap: "var(--space-xs)" }}>
                  <p className="text-secondary font-bold text-text-main">
                    {presentation.label}
                  </p>
                  <NexusBadge variant={presentation.variant}>
                    {originLabel(event.origin)}
                  </NexusBadge>
                </div>
                <p className="text-secondary text-text-muted">
                  {event.message || "Actividad registrada."}
                </p>
                <p className="text-label text-text-muted">
                  {actor}
                  {actorRole ? ` · ${actorRole}` : ""}
                  {` · ${formatDateTime(event.createdAt)}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {sortedEvents.length > 5 && (
        <NexusSectionButton
          type="button"
          variant="secondary"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Mostrar menos" : `Ver todo (${sortedEvents.length})`}
        </NexusSectionButton>
      )}
    </div>
  );
};
