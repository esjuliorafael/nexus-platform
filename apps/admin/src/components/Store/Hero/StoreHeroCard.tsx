import React from "react";
import { ListOrdered, Pencil, Tags, Trash2 } from "lucide-react";
import { ASSET_BASE_URL } from "../../../api";
import type { StoreHero, StoreHeroScope } from "../../../types";
import { NexusAutonomousBadge } from "../../ui/NexusBadge";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusAutonomousCard } from "../../ui/NexusCard";
import { NexusSwitch } from "../../ui/NexusSwitch";

interface StoreHeroCardProps {
  hero: StoreHero;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isToggling?: boolean;
}

const SCOPE_LABELS: Record<StoreHeroScope, string> = {
  ALL: "Todo",
  BIRD: "Aves",
  ITEM: "Artículos",
};

export const StoreHeroCard: React.FC<StoreHeroCardProps> = ({
  hero,
  onEdit,
  onDelete,
  onToggleActive,
  isToggling,
}) => {
  const getFullUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path;
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    return `${ASSET_BASE_URL}${cleanPath}`;
  };

  const mediaUrl = getFullUrl(hero.mediaUrl);
  const posterUrl = getFullUrl(hero.posterUrl);

  return (
    <NexusAutonomousCard innerClassName="transition-all duration-500">
      <div
        className="grid grid-cols-1 items-stretch lg:grid-cols-[var(--size-slide-thumb-width)_1fr_auto]"
        style={{ gap: "var(--space-md)" }}
      >
        <div
          className="shrink-0 overflow-hidden border border-border-main bg-bg-muted lg:h-[var(--size-slide-thumb-height)]"
          style={{
            aspectRatio: "16 / 9",
            borderRadius: "var(--radius-card-inner)",
          }}
        >
          {hero.type === "VIDEO" ? (
            <video
              src={mediaUrl}
              poster={posterUrl || undefined}
              className="h-full w-full object-cover"
              muted
            />
          ) : (
            <img src={mediaUrl} className="h-full w-full object-cover" alt={hero.title} />
          )}
        </div>

        <div className="min-w-0 flex flex-col justify-center" style={{ gap: "var(--space-sm)" }}>
          <div className="flex flex-wrap items-center" style={{ gap: "var(--space-sm)" }}>
            <NexusAutonomousBadge variant="brand" icon={ListOrdered}>
              Orden {hero.sortOrder}
            </NexusAutonomousBadge>
            <NexusAutonomousBadge variant="muted" icon={Tags}>
              {SCOPE_LABELS[hero.scope]}
            </NexusAutonomousBadge>
          </div>

          <h4 className="max-w-[18ch] truncate text-h2 text-text-main sm:max-w-[28ch] lg:max-w-[34ch]">
            {hero.title}
          </h4>
          {hero.description && (
            <p className="line-clamp-1 max-w-[26ch] text-secondary text-text-muted sm:max-w-[42ch] lg:max-w-[52ch]">
              {hero.description}
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-between border-t border-border-main pt-[var(--space-md)] lg:justify-end lg:border-l lg:border-t-0 lg:pl-[var(--space-md)] lg:pt-0"
          style={{ gap: "var(--space-md)" }}
        >
          <div className="flex flex-col items-center" style={{ gap: "var(--space-xs)" }}>
            <NexusSwitch
              checked={hero.active}
              onChange={onToggleActive}
              disabled={isToggling}
              aria-label={hero.active ? "Pausar hero" : "Publicar hero"}
            />
            <span className="text-label uppercase tracking-[0.15em] text-text-muted">
              {hero.active ? "Publicado" : "Pausado"}
            </span>
          </div>

          <div className="flex shrink-0 items-center" style={{ gap: "var(--space-sm)" }}>
            <NexusAutonomousButton
              density="compact"
              variant="secondary"
              isIconOnly
              icon={Pencil}
              onClick={onEdit}
              aria-label="Editar hero"
            />
            <NexusAutonomousButton
              density="compact"
              variant="secondary"
              isIconOnly
              icon={Trash2}
              onClick={onDelete}
              aria-label="Eliminar hero"
              className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
            />
          </div>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
