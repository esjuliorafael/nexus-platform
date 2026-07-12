import React from "react";
import { Calendar, Edit2, Hash, Ticket, Trash2, Users } from "lucide-react";
import { ASSET_BASE_URL } from "../../api";
import { Raffle } from "../../types";
import { NexusAutonomousBadge } from "../ui/NexusBadge";
import { NexusAutonomousButton } from "../ui/NexusButton";
import { NexusAutonomousCard } from "../ui/NexusCard";
import { NexusSwitch } from "../ui/NexusSwitch";

interface RaffleCardProps {
  raffle: Raffle;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
  onTogglePublished: () => void;
  isTogglingPublished?: boolean;
}

const getAssetUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path;

  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${ASSET_BASE_URL}${cleanPath}`;
};

const statusConfig: Record<Raffle["status"], { label: string; variant: "success" | "muted" | "danger" }> = {
  ACTIVE: { label: "Activa", variant: "success" },
  FINISHED: { label: "Finalizada", variant: "muted" },
  CANCELLED: { label: "Cancelada", variant: "danger" },
};

const formatDrawDate = (drawDate?: string) => {
  if (!drawDate) return "Sin fecha";
  const date = new Date(drawDate);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const RaffleCard: React.FC<RaffleCardProps> = ({
  raffle,
  onEdit,
  onDelete,
  onViewDetail,
  onTogglePublished,
  isTogglingPublished,
}) => {
  const status = statusConfig[raffle.status];
  const isOpportunityRaffle = raffle.opportunities > 1;
  const imageUrl = getAssetUrl(raffle.image);
  const totalPotential = raffle.ticketPrice * raffle.ticketQuantity;

  return (
    <NexusAutonomousCard
      swipeable
      onEdit={onEdit}
      onDelete={onDelete}
      isMuted={raffle.status !== "ACTIVE" || !raffle.published}
      innerClassName="hover:shadow-xl hover:shadow-stone-200/40 active:scale-[0.995] transition-all duration-700"
    >
      <div
        className="grid grid-cols-1 items-stretch lg:grid-cols-[var(--size-slide-thumb-width)_1fr_auto]"
        style={{ gap: "var(--space-md)" }}
      >
        <button
          type="button"
          onClick={onViewDetail}
          className="group relative aspect-video w-full overflow-hidden bg-bg-muted text-left shadow-inner outline-none transition-transform duration-500 active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-brand-500/20 lg:h-[var(--size-slide-thumb-height)]"
          style={{ borderRadius: "var(--radius-card-inner)" }}
          aria-label={`Ver detalle de ${raffle.title}`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={raffle.title}
              className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-text-muted" style={{ gap: "var(--space-xs)" }}>
              <span
                className="inline-flex items-center justify-center border border-border-main bg-bg-card"
                style={{
                  width: "var(--size-button-card)",
                  height: "var(--size-button-card)",
                  borderRadius: "var(--radius-card-nested-compact)",
                }}
              >
                <Ticket style={{ width: "var(--size-inner-icon-card)", height: "var(--size-inner-icon-card)" }} />
              </span>
              <span className="text-caption font-bold uppercase tracking-[0.08em]">Sin portada</span>
            </div>
          )}

          <div
            className="absolute left-[var(--space-md)] top-[var(--space-md)] lg:hidden"
          >
            <NexusAutonomousBadge
              variant="overlay"
              icon={Calendar}
              className="border-white/15 bg-stone-950/50 text-white backdrop-blur-md"
            >
              {formatDrawDate(raffle.drawDate)}
            </NexusAutonomousBadge>
          </div>
        </button>

        <div className="flex min-w-0 flex-col justify-center lg:flex-row lg:items-center" style={{ gap: "var(--space-md)" }}>
          <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--space-sm)" }}>
            <div className="flex min-w-0 flex-wrap items-center" style={{ gap: "var(--space-xs)" }}>
              <NexusAutonomousBadge variant="muted" icon={isOpportunityRaffle ? Users : Ticket}>
                {isOpportunityRaffle ? `${raffle.opportunities} oportunidades` : "Rifa simple"}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge variant="brand" icon={Hash}>
                {raffle.id}
              </NexusAutonomousBadge>
              {raffle.status !== "ACTIVE" && (
                <NexusAutonomousBadge variant={status.variant}>{status.label}</NexusAutonomousBadge>
              )}
            </div>

            <h3 className="truncate text-h2 font-bold text-text-main">{raffle.title}</h3>
          </div>

          <div
            className="flex w-full shrink-0 items-center justify-between border-t border-border-main pt-[var(--space-md)] lg:hidden"
            style={{ gap: "var(--space-md)" }}
          >
            <div className="flex min-w-0 flex-col items-start" style={{ gap: "var(--space-xs)" }}>
              <span className="text-label uppercase tracking-[0.15em] text-text-muted">Total</span>
              <div className="flex items-baseline text-h1 font-black text-text-main">
                <span className="mr-0.5 text-secondary opacity-50">$</span>
                {totalPotential.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex flex-col items-center" style={{ gap: "var(--space-xs)" }}>
              <NexusSwitch
                checked={raffle.published}
                onChange={onTogglePublished}
                disabled={isTogglingPublished}
                aria-label={raffle.published ? "Pausar rifa" : "Publicar rifa"}
              />
              <span className="text-label uppercase tracking-[0.15em] text-text-muted">
                {raffle.published ? "Publicado" : "Pausado"}
              </span>
            </div>
          </div>

          <div
            className="hidden w-auto shrink-0 items-center justify-between border-l border-border-main pl-[var(--space-md)] lg:flex"
            style={{ gap: "var(--space-md)" }}
          >
            <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
              <span className="text-label uppercase tracking-[0.15em] text-text-muted">Sorteo</span>
              <div className="flex items-center text-secondary font-bold text-text-main" style={{ gap: "var(--space-xs)" }}>
                <Calendar style={{ width: "var(--size-inner-icon-badge)", height: "var(--size-inner-icon-badge)" }} className="text-text-muted" strokeWidth={2.5} />
                {formatDrawDate(raffle.drawDate)}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end" style={{ gap: "var(--space-xs)" }}>
              <span className="text-label uppercase tracking-[0.15em] text-text-muted">Total</span>
              <div className="flex items-baseline text-h1 font-black text-text-main">
                <span className="mr-0.5 text-secondary opacity-50">$</span>
                {totalPotential.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div
          className="hidden items-center justify-between border-l border-border-main pl-[var(--space-md)] lg:flex"
          style={{ gap: "var(--space-md)" }}
        >
          <div className="flex flex-col items-center" style={{ gap: "var(--space-xs)" }}>
            <NexusSwitch
              checked={raffle.published}
              onChange={onTogglePublished}
              disabled={isTogglingPublished}
              aria-label={raffle.published ? "Pausar rifa" : "Publicar rifa"}
            />
            <span className="text-label uppercase tracking-[0.15em] text-text-muted">
              {raffle.published ? "Publicado" : "Pausado"}
            </span>
          </div>

          <div className="flex shrink-0 items-center" style={{ gap: "var(--space-sm)" }}>
            <NexusAutonomousButton density="compact" variant="secondary" isIconOnly icon={Edit2} onClick={onEdit} aria-label="Editar rifa" />
            <NexusAutonomousButton
              density="compact"
              variant="secondary"
              isIconOnly
              icon={Trash2}
              onClick={onDelete}
              aria-label="Eliminar rifa"
              className="hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
            />
          </div>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
