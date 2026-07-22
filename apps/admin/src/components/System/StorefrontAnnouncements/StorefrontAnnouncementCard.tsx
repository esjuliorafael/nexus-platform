import React from "react";
import { BellRing, Edit2, Trash2 } from "lucide-react";
import type { StorefrontAnnouncement } from "../../../types";
import { NexusAutonomousBadge } from "../../ui/NexusBadge";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusAutonomousCard } from "../../ui/NexusCard";
import { NexusAutonomousIcon } from "../../ui/NexusIcon";
import { NexusSwitch } from "../../ui/NexusSwitch";

const scopeLabels: Record<StorefrontAnnouncement["scope"], string> = {
  GLOBAL: "Todo el Storefront",
  STORE: "Tienda",
  RAFFLES: "Rifas",
  RAFFLE: "Rifa específica",
  PRODUCT: "Producto específico",
  STORE_CHECKOUT: "Checkout de tienda",
  RAFFLE_CHECKOUT: "Checkout de rifas",
};

const variantLabels: Record<StorefrontAnnouncement["variant"], string> = {
  INFO: "Informativo",
  SUCCESS: "Confirmación",
  WARNING: "Advertencia",
  CRITICAL: "Crítico",
  PROMO: "Promoción",
};

interface Props {
  announcement: StorefrontAnnouncement;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
  isToggling?: boolean;
}

export const StorefrontAnnouncementCard: React.FC<Props> = ({
  announcement,
  onEdit,
  onDelete,
  onToggle,
  isToggling,
}) => (
  <NexusAutonomousCard swipeable onEdit={onEdit} onDelete={onDelete} isMuted={!announcement.active}>
    <div className="flex flex-col md:flex-row md:items-center" style={{ gap: "var(--space-lg)" }}>
      <div className="flex min-w-0 flex-1 items-center" style={{ gap: "var(--space-md)" }}>
        <NexusAutonomousIcon icon={BellRing} variant={announcement.active ? "brand" : "muted"} />
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--space-sm)" }}>
          <div className="flex flex-wrap" style={{ gap: "var(--space-xs)" }}>
            <NexusAutonomousBadge variant="brand">{scopeLabels[announcement.scope]}</NexusAutonomousBadge>
            <NexusAutonomousBadge variant="muted">{variantLabels[announcement.variant]}</NexusAutonomousBadge>
            <NexusAutonomousBadge variant="muted">Prioridad {announcement.priority}</NexusAutonomousBadge>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-h2 text-text-main">{announcement.title}</h3>
            <p className="line-clamp-2 text-secondary text-text-muted">{announcement.message}</p>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between border-t border-border-main pt-[var(--space-md)] md:border-t-0 md:pt-0"
        style={{ gap: "var(--space-lg)" }}
      >
        <div className="flex flex-col items-center" style={{ gap: "var(--space-xs)" }}>
          <NexusSwitch
            checked={announcement.active}
            onChange={onToggle}
            disabled={isToggling}
            aria-label={announcement.active ? "Pausar aviso" : "Publicar aviso"}
          />
          <span className="text-label uppercase text-text-muted">
            {announcement.active ? "Publicado" : "Pausado"}
          </span>
        </div>
        <div className="hidden items-center sm:flex" style={{ gap: "var(--space-sm)" }}>
          <NexusAutonomousButton isIconOnly icon={Edit2} variant="secondary" onClick={onEdit} aria-label="Editar aviso" />
          <NexusAutonomousButton
            isIconOnly
            icon={Trash2}
            variant="secondary"
            onClick={onDelete}
            aria-label="Eliminar aviso"
            className="hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          />
        </div>
      </div>
    </div>
  </NexusAutonomousCard>
);

