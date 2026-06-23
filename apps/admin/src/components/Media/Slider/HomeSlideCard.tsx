import React, { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Edit2, Play, Trash2 } from "lucide-react";
import { ASSET_BASE_URL } from "../../../api";
import { HomeSlide } from "../../../types";
import { NexusAutonomousBadge } from "../../ui/NexusBadge";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusAutonomousCard } from "../../ui/NexusCard";
import { NexusMediaViewer } from "../../ui/NexusMediaViewer";
import { NexusSwitch } from "../../ui/NexusSwitch";

interface HomeSlideCardProps {
  slide: HomeSlide;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isToggling?: boolean;
}

export const HomeSlideCard: React.FC<HomeSlideCardProps> = ({
  slide,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isToggling,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = slide.type === "VIDEO";

  const getFullUrl = (path?: string | null) => {
    if (!path) return "";
    if (
      path.startsWith("http") ||
      path.startsWith("blob:") ||
      path.startsWith("data:")
    ) {
      return path;
    }
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    return `${ASSET_BASE_URL}${cleanPath}`;
  };

  const mediaUrl = getFullUrl(slide.mediaUrl);
  const posterUrl = getFullUrl(slide.posterUrl);

  const handleMouseEnter = () => {
    if (!isVideo || !videoRef.current) return;
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) playPromise.catch(() => {});
  };

  const handleMouseLeave = () => {
    if (!isVideo || !videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  };

  return (
    <>
      <NexusAutonomousCard
        isMuted={!slide.active}
        innerClassName={`hover:shadow-xl hover:shadow-stone-200/40 active:scale-[0.995] transition-all duration-700 ${
          slide.active ? "border-border-main" : "border-border-main/70"
        }`}
      >
        <div
          className="grid grid-cols-1 items-stretch lg:grid-cols-[var(--size-slide-thumb-width)_1fr_auto]"
          style={{ gap: "var(--space-md)" }}
        >
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="relative aspect-video w-full overflow-hidden bg-stone-950 text-left shadow-inner outline-none transition-transform duration-500 active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-brand-500/20 lg:h-[var(--size-slide-thumb-height)]"
            style={{ borderRadius: "var(--radius-card-inner)" }}
            aria-label={`Previsualizar slide ${slide.title}`}
          >
            {isVideo ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                poster={posterUrl || undefined}
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <img
                src={mediaUrl}
                alt={slide.title}
                className="h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-105"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            {isVideo && (
              <div
                className="absolute flex items-center"
                style={{
                  left: "var(--space-md)",
                  top: "var(--space-md)",
                }}
              >
                <span
                  className="inline-flex items-center justify-center bg-white/15 text-white backdrop-blur-md"
                  style={{
                    width: "var(--size-button-card)",
                    height: "var(--size-button-card)",
                    borderRadius: "var(--radius-card-nested)",
                  }}
                >
                  <Play
                    fill="currentColor"
                    style={{
                      width: "var(--size-inner-icon-card)",
                      height: "var(--size-inner-icon-card)",
                    }}
                  />
                </span>
              </div>
            )}

            <div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent"
              style={{ height: "var(--space-xl)" }}
            />
          </button>

          <div
            className="flex min-w-0 flex-col justify-center"
            style={{ gap: "var(--space-sm)" }}
          >
            <div
              className="flex flex-wrap items-center"
              style={{ gap: "var(--space-sm)" }}
            >
              <NexusAutonomousBadge variant="muted">
                Orden {slide.sortOrder}
              </NexusAutonomousBadge>
            </div>

            <div className="min-w-0">
              {slide.eyebrow && (
                <p
                  className="truncate text-label uppercase tracking-[0.15em] text-brand-600"
                  style={{ marginBottom: "var(--space-xs)" }}
                >
                  {slide.eyebrow}
                </p>
              )}
              <h3 className="truncate text-h2 text-text-main">{slide.title}</h3>
            </div>
          </div>

          <div
            className="flex items-center justify-between border-t border-border-main pt-[var(--space-md)] lg:justify-end lg:border-l lg:border-t-0 lg:pl-[var(--space-md)] lg:pt-0"
            style={{ gap: "var(--space-md)" }}
          >
            <div
              className="flex flex-col items-center"
              style={{ gap: "var(--space-xs)" }}
            >
              <NexusSwitch
                checked={slide.active}
                onChange={() => onToggleActive()}
                disabled={isToggling}
                aria-label={slide.active ? "Pausar slide" : "Publicar slide"}
              />
              <span className="text-label uppercase tracking-[0.15em] text-text-muted">
                {slide.active ? "Publicado" : "Pausado"}
              </span>
            </div>

            <div
              className="flex shrink-0 items-center"
              style={{ gap: "var(--space-sm)" }}
            >
              <NexusAutonomousButton
                density="compact"
                variant="secondary"
                isIconOnly
                icon={ArrowUp}
                onClick={onMoveUp}
                disabled={!canMoveUp}
                aria-label="Subir slide"
              />
              <NexusAutonomousButton
                density="compact"
                variant="secondary"
                isIconOnly
                icon={ArrowDown}
                onClick={onMoveDown}
                disabled={!canMoveDown}
                aria-label="Bajar slide"
              />
              <NexusAutonomousButton
                density="compact"
                variant="secondary"
                isIconOnly
                icon={Edit2}
                onClick={onEdit}
                aria-label="Editar slide"
              />
              <NexusAutonomousButton
                density="compact"
                variant="secondary"
                isIconOnly
                icon={Trash2}
                onClick={onDelete}
                aria-label="Eliminar slide"
                className="hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
              />
            </div>
          </div>
        </div>
      </NexusAutonomousCard>

      <NexusMediaViewer
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        mediaType={isVideo ? "VIDEO" : "PHOTO"}
        src={mediaUrl}
        poster={posterUrl || undefined}
        alt={slide.title}
        presentation="hero"
        onEdit={onEdit}
        onDelete={onDelete}
        editLabel="Editar slide"
        deleteLabel="Eliminar slide"
        hero={{
          eyebrow: slide.eyebrow || undefined,
          title: slide.title,
          description: slide.description || undefined,
          primaryText: slide.primaryText || "Ver Catalogo",
          secondaryText: slide.secondaryText || "Explorar Rancho",
          desktopObjectPosition: slide.desktopObjectPosition || "50% 50%",
          mobileObjectPosition: slide.mobileObjectPosition || "50% 44%",
        }}
      />
    </>
  );
};
