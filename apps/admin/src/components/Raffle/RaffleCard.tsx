import React from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  CircleX,
  Clock3,
  Edit2,
  KeyRound,
  MoreVertical,
  Star,
  Ticket,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ASSET_BASE_URL } from "../../api";
import { Raffle } from "../../types";
import { parseCalendarDate } from "../../utils/calendarDate";
import { NexusAutonomousBadge } from "../ui/NexusBadge";
import { NexusAutonomousButton } from "../ui/NexusButton";
import { NexusAutonomousCard } from "../ui/NexusCard";
import { NexusSwitch } from "../ui/NexusSwitch";

interface RaffleCardProps {
  raffle: Raffle;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
  onToggleFeatured: () => void;
  onMoveFeaturedUp?: () => void;
  onMoveFeaturedDown?: () => void;
  canMoveFeaturedUp?: boolean;
  canMoveFeaturedDown?: boolean;
  isTogglingPublished?: boolean;
  isTogglingFeatured?: boolean;
  isReorderingFeatured?: boolean;
}

const getAssetUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path;

  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${ASSET_BASE_URL}${cleanPath}`;
};

const statusConfig: Record<Raffle["status"], { label: string; variant: "success" | "muted" | "danger"; icon: LucideIcon }> = {
  ACTIVE: { label: "Activa", variant: "success", icon: CheckCircle2 },
  FINISHED: { label: "Finalizada", variant: "muted", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelada", variant: "danger", icon: CircleX },
};

const formatDrawDate = (drawDate?: string) => {
  const date = parseCalendarDate(drawDate);
  if (!date) return "Sin fecha";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const RaffleCard: React.FC<RaffleCardProps> = ({
  raffle,
  onOpen,
  onEdit,
  onDelete,
  onTogglePublished,
  onToggleFeatured,
  onMoveFeaturedUp,
  onMoveFeaturedDown,
  canMoveFeaturedUp,
  canMoveFeaturedDown,
  isTogglingPublished,
  isTogglingFeatured,
  isReorderingFeatured,
}) => {
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const status = statusConfig[raffle.status];
  const isOpportunityRaffle = raffle.opportunities > 1;
  const imageUrl = getAssetUrl(raffle.imagePoster || raffle.image);
  const totalPotential = raffle.ticketPrice * raffle.ticketQuantity;
  const now = Date.now();
  const startsAt = raffle.participationStartsAt ? new Date(raffle.participationStartsAt).getTime() : null;
  const endsAt = raffle.participationEndsAt ? new Date(raffle.participationEndsAt).getTime() : null;
  const participationBadge = raffle.status !== "ACTIVE" || !raffle.published
    ? null
    : endsAt && now >= endsAt
      ? { label: "Cerrada", variant: "muted" as const, icon: Clock3 }
      : startsAt && now < startsAt
        ? {
            label: raffle.earlyAccessEnabled ? "Acceso anticipado" : "Próximamente",
            variant: "warning" as const,
            icon: raffle.earlyAccessEnabled ? KeyRound : Clock3,
          }
        : { label: "Abierta", variant: "success" as const, icon: Clock3 };

  React.useEffect(() => {
    if (!isActionsOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsActionsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActionsOpen]);

  return (
    <NexusAutonomousCard
      swipeable
      onEdit={onEdit}
      onDelete={onDelete}
      isMuted={raffle.status !== "ACTIVE" || !raffle.published}
      className="h-full transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-stone-200/40 active:scale-[0.995]"
    >
      <div className="flex h-full flex-col" style={{ gap: "var(--space-md)" }}>
        <button
          type="button"
          onClick={onOpen}
          className="group relative aspect-[4/3] w-full overflow-hidden bg-bg-muted text-left shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          style={{ borderRadius: "var(--radius-card-inner)" }}
          aria-label={`Abrir resumen de ${raffle.title}`}
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

          <div className="absolute left-[var(--space-md)] top-[var(--space-md)]">
            <NexusAutonomousBadge
              variant="overlay"
              icon={Calendar}
              className="border-white/15 bg-stone-950/50 text-white backdrop-blur-md"
            >
              {formatDrawDate(raffle.drawDate)}
            </NexusAutonomousBadge>
          </div>
        </button>

        <div className="flex min-w-0 flex-wrap items-center" style={{ gap: "var(--space-xs)" }}>
          <NexusAutonomousBadge variant="muted" icon={isOpportunityRaffle ? Users : Ticket}>
            {isOpportunityRaffle ? "Oportunidades" : "Simple"}
          </NexusAutonomousBadge>
          {participationBadge && (
            <NexusAutonomousBadge variant={participationBadge.variant} icon={participationBadge.icon}>
              {participationBadge.label}
            </NexusAutonomousBadge>
          )}
          {raffle.status !== "ACTIVE" && (
            <NexusAutonomousBadge variant={status.variant} icon={status.icon}>{status.label}</NexusAutonomousBadge>
          )}
          {raffle.featured && (
            <NexusAutonomousBadge variant="warning" icon={Star}>
              Destacada {raffle.featuredOrder ?? ""}
            </NexusAutonomousBadge>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--space-xs)" }}>
          <span className="text-label uppercase tracking-[0.15em] text-text-muted">Rifa #{raffle.id}</span>
          <button type="button" onClick={onOpen} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <h3 className="line-clamp-2 text-h2 font-bold text-text-main transition-colors hover:text-brand-600">{raffle.title}</h3>
          </button>
        </div>

        <div className="border-t border-border-main pt-[var(--space-md)]">
          <div
            className="relative"
            style={{ minHeight: "calc(var(--size-button-card) + var(--space-md))" }}
          >
            {isActionsOpen ? (
              <div
                key="actions"
                className="animate-raffle-actions-enter absolute inset-0 flex items-center justify-end"
                style={{ gap: "var(--space-xs)" }}
              >
                <FeaturedControls
                  raffle={raffle}
                  onToggleFeatured={onToggleFeatured}
                  onMoveFeaturedUp={onMoveFeaturedUp}
                  onMoveFeaturedDown={onMoveFeaturedDown}
                  canMoveFeaturedUp={canMoveFeaturedUp}
                  canMoveFeaturedDown={canMoveFeaturedDown}
                  isTogglingFeatured={isTogglingFeatured}
                  isReorderingFeatured={isReorderingFeatured}
                />
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
                <NexusAutonomousButton
                  density="compact"
                  variant="secondary"
                  isIconOnly
                  icon={MoreVertical}
                  onClick={() => setIsActionsOpen(false)}
                  aria-label="Cerrar acciones"
                  aria-expanded
                />
              </div>
            ) : (
              <div
                key="summary"
                className="animate-raffle-summary-enter absolute inset-0 flex items-center justify-between"
                style={{ gap: "var(--space-md)" }}
              >
                <div className="flex min-w-0 flex-col items-start" style={{ gap: "var(--space-xs)" }}>
                  <span className="text-label uppercase tracking-[0.15em] text-text-muted">Total</span>
                  <div className="flex items-baseline text-h1 font-black text-text-main">
                    <span className="mr-0.5 text-secondary opacity-50">$</span>
                    {totalPotential.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex shrink-0 items-center" style={{ gap: "var(--space-sm)" }}>
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
                  <NexusAutonomousButton
                    density="compact"
                    variant="secondary"
                    isIconOnly
                    icon={MoreVertical}
                    onClick={() => setIsActionsOpen(true)}
                    aria-label="Más acciones"
                    aria-expanded={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};

function FeaturedControls({
  raffle,
  onToggleFeatured,
  onMoveFeaturedUp,
  onMoveFeaturedDown,
  canMoveFeaturedUp,
  canMoveFeaturedDown,
  isTogglingFeatured,
  isReorderingFeatured,
}: Pick<
  RaffleCardProps,
  | "raffle"
  | "onToggleFeatured"
  | "onMoveFeaturedUp"
  | "onMoveFeaturedDown"
  | "canMoveFeaturedUp"
  | "canMoveFeaturedDown"
  | "isTogglingFeatured"
  | "isReorderingFeatured"
>) {
  return (
    <>
      <NexusAutonomousButton
        density="compact"
        variant={raffle.featured ? "brand" : "secondary"}
        isIconOnly
        icon={Star}
        onClick={onToggleFeatured}
        disabled={isTogglingFeatured || !raffle.published || raffle.status !== "ACTIVE"}
        aria-label={raffle.featured ? "Quitar de destacadas" : "Destacar rifa"}
        className={raffle.featured
          ? "hover:border-amber-500 hover:bg-amber-500"
          : "hover:border-amber-100 hover:bg-amber-50 hover:text-amber-600"}
      />
      {raffle.featured && (
        <>
          <NexusAutonomousButton
            density="compact"
            variant="secondary"
            isIconOnly
            icon={ArrowUp}
            onClick={onMoveFeaturedUp}
            disabled={isReorderingFeatured || !canMoveFeaturedUp}
            aria-label="Subir rifa destacada"
          />
          <NexusAutonomousButton
            density="compact"
            variant="secondary"
            isIconOnly
            icon={ArrowDown}
            onClick={onMoveFeaturedDown}
            disabled={isReorderingFeatured || !canMoveFeaturedDown}
            aria-label="Bajar rifa destacada"
          />
        </>
      )}
    </>
  );
}
