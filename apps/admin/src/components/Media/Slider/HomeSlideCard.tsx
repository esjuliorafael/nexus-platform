import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Edit2, Play, Trash2, X } from "lucide-react";
import { ASSET_BASE_URL } from "../../../api";
import { HomeSlide } from "../../../types";
import { NexusAutonomousBadge, NexusBadge } from "../../ui/NexusBadge";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusAutonomousCard } from "../../ui/NexusCard";
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

  useEffect(() => {
    if (showPreview) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => document.body.classList.remove("overflow-hidden");
  }, [showPreview]);

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

      {showPreview &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-[var(--padding-inner)]">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="flex items-center justify-center border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-90"
                style={{
                  width: "var(--size-button-section)",
                  height: "var(--size-button-section)",
                  borderRadius: "var(--radius-card-inner)",
                }}
                aria-label="Cerrar preview"
              >
                <X size={24} />
              </button>

              <div
                className="flex items-center"
                style={{ gap: "var(--space-sm)" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowPreview(false);
                    onEdit();
                  }}
                  className="flex items-center border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
                  style={{
                    height: "var(--size-button-section)",
                    gap: "var(--space-sm)",
                    paddingInline: "var(--space-md)",
                    borderRadius: "var(--radius-card-inner)",
                  }}
                >
                  <Edit2 size={16} />
                  <span className="hidden text-label uppercase tracking-[0.15em] sm:inline">
                    Editar
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreview(false);
                    onDelete();
                  }}
                  className="flex items-center justify-center border border-rose-500/30 bg-rose-500/20 text-white backdrop-blur-md transition-all hover:bg-rose-500/40 active:scale-90"
                  style={{
                    width: "var(--size-button-section)",
                    height: "var(--size-button-section)",
                    borderRadius: "var(--radius-card-inner)",
                  }}
                  aria-label="Eliminar slide"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="relative flex flex-1 items-center overflow-hidden">
              {isVideo ? (
                <video
                  src={mediaUrl}
                  poster={posterUrl || undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={slide.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
              <div
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent"
                style={{ height: "var(--space-3xl)" }}
              />

              <div
                className="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-[var(--padding-outer)]"
                style={{ gap: "var(--space-lg)" }}
              >
                <div
                  className="flex flex-wrap items-center"
                  style={{ gap: "var(--space-sm)" }}
                >
                  <NexusBadge
                    variant={slide.active ? "overlaySuccess" : "overlay"}
                  >
                    {slide.active ? "Publicado" : "Pausado"}
                  </NexusBadge>
                  <NexusBadge variant="overlay">
                    Orden {slide.sortOrder}
                  </NexusBadge>
                </div>

                <div
                  className="flex max-w-3xl flex-col"
                  style={{ gap: "var(--space-md)" }}
                >
                  {slide.eyebrow && (
                    <p className="text-label uppercase tracking-[0.15em] text-brand-300">
                      {slide.eyebrow}
                    </p>
                  )}
                  <h2 className="max-w-4xl text-4xl font-black uppercase leading-none tracking-tight text-white drop-shadow-md sm:text-6xl">
                    {slide.title}
                  </h2>
                  {slide.description && (
                    <p className="max-w-2xl text-body leading-relaxed text-stone-300">
                      {slide.description}
                    </p>
                  )}
                </div>

                {(slide.primaryText || slide.secondaryText) && (
                  <div
                    className="flex flex-wrap"
                    style={{ gap: "var(--space-base)" }}
                  >
                    {slide.primaryText && (
                      <span
                        className="inline-flex h-[var(--size-button-section)] items-center justify-center bg-brand-500 text-button-section text-white shadow-lg shadow-brand-500/20"
                        style={{
                          paddingInline: "var(--space-lg)",
                          borderRadius: "var(--radius-inner-visual)",
                        }}
                      >
                        {slide.primaryText}
                      </span>
                    )}
                    {slide.secondaryText && (
                      <span
                        className="inline-flex h-[var(--size-button-section)] items-center justify-center border border-white/20 bg-white/10 text-button-section text-white backdrop-blur-md"
                        style={{
                          paddingInline: "var(--space-lg)",
                          borderRadius: "var(--radius-inner-visual)",
                        }}
                      >
                        {slide.secondaryText}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
