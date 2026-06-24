import React, { type CSSProperties, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Edit2, Trash2, X } from "lucide-react";
import { NexusCardBadge } from "./NexusBadge";
import { NexusAutonomousButton } from "./NexusButton";

type NexusMediaViewerPresentation = "gallery" | "hero";

interface NexusMediaViewerGalleryContent {
  category?: string;
  subcategories?: string[];
  title: string;
  description?: string;
  metadata?: {
    icon?: React.ReactNode;
    value: React.ReactNode;
    label?: React.ReactNode;
  };
}

interface NexusMediaViewerHeroContent {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryText?: string;
  secondaryText?: string;
  desktopObjectPosition?: string;
  mobileObjectPosition?: string;
}

interface NexusMediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  mediaType: "PHOTO" | "VIDEO";
  src: string;
  poster?: string;
  alt: string;
  presentation: NexusMediaViewerPresentation;
  gallery?: NexusMediaViewerGalleryContent;
  hero?: NexusMediaViewerHeroContent;
  editLabel?: string;
  deleteLabel?: string;
  zIndex?: number;
}

const viewerControlClassName =
  "shrink-0 border border-white/20 bg-white/10 text-white backdrop-blur-md hover:border-white/30 hover:bg-white/20";

export const NexusMediaViewer: React.FC<NexusMediaViewerProps> = ({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  mediaType,
  src,
  poster,
  alt,
  presentation,
  gallery,
  hero,
  editLabel = "Editar",
  deleteLabel = "Eliminar",
  zIndex = 200,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !viewerRef.current) return;
      const focusable = Array.from(
        viewerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
        ),
      ) as HTMLElement[];
      if (focusable.length === 0) return;

      const activeIndex = focusable.indexOf(
        document.activeElement as HTMLElement,
      );
      const nextIndex = event.shiftKey
        ? activeIndex <= 0
          ? focusable.length - 1
          : activeIndex - 1
        : activeIndex < 0 || activeIndex === focusable.length - 1
          ? 0
          : activeIndex + 1;

      event.preventDefault();
      focusable[nextIndex]?.focus();
    };

    document.body.classList.add("overflow-hidden");
    document.addEventListener("keydown", handleKeyDown);
    viewerRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.classList.remove("overflow-hidden");
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEdit = () => {
    onClose();
    onEdit?.();
  };

  const handleDelete = () => {
    onClose();
    onDelete?.();
  };

  const controls = (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex w-full items-start justify-between"
      style={{ padding: "var(--padding-inner)", gap: "var(--space-md)" }}
    >
      <NexusAutonomousButton
        type="button"
        variant="ghost"
        isIconOnly
        icon={X}
        onClick={onClose}
        className={`pointer-events-auto ${viewerControlClassName}`}
        aria-label="Cerrar visor"
      />

      {(onEdit || onDelete) && (
        <div
          className="pointer-events-auto flex min-w-0 items-center"
          style={{ gap: "var(--space-sm)" }}
        >
          {onEdit && (
            <NexusAutonomousButton
              type="button"
              variant="ghost"
              isIconOnly
              icon={Edit2}
              onClick={handleEdit}
              className={viewerControlClassName}
              aria-label={editLabel}
            />
          )}
          {onDelete && (
            <NexusAutonomousButton
              type="button"
              variant="ghost"
              isIconOnly
              icon={Trash2}
              onClick={handleDelete}
              className={`${viewerControlClassName} hover:border-rose-400/50 hover:bg-rose-500/30 hover:text-white`}
              aria-label={deleteLabel}
            />
          )}
        </div>
      )}
    </div>
  );

  const galleryMedia =
    mediaType === "VIDEO" ? (
      <video
        src={src}
        poster={poster}
        controls
        autoPlay
        playsInline
        className="block h-auto w-auto max-w-full object-contain"
        style={{
          maxHeight:
            "calc(100dvh - var(--padding-inner) - var(--size-button-autonomous) - (var(--space-md) * 2))",
        }}
      />
    ) : (
      <img
        src={src}
        alt={alt}
        className="block h-auto w-auto max-w-full object-contain"
        style={{
          maxHeight:
            "calc(100dvh - var(--padding-inner) - var(--size-button-autonomous) - (var(--space-md) * 2))",
        }}
      />
    );

  const heroPositionStyle = {
    "--nexus-viewer-mobile-object-position":
      hero?.mobileObjectPosition || "50% 44%",
    "--nexus-viewer-desktop-object-position":
      hero?.desktopObjectPosition || "50% 50%",
  } as CSSProperties;

  const heroMedia =
    mediaType === "VIDEO" ? (
      <video
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        className="nexus-media-viewer-hero-media absolute inset-0 h-full w-full object-cover opacity-50"
        style={heroPositionStyle}
      />
    ) : (
      <img
        src={src}
        alt={alt}
        className="nexus-media-viewer-hero-media absolute inset-0 h-full w-full object-cover opacity-50"
        style={heroPositionStyle}
      />
    );

  return createPortal(
    <div
      ref={viewerRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      tabIndex={-1}
      className="fixed inset-0 overflow-hidden bg-stone-950 text-white animate-in fade-in duration-300"
      style={{ zIndex }}
    >
      {controls}

      {presentation === "hero" ? (
        <div className="relative flex h-full min-h-full w-full items-center overflow-hidden">
          <div className="nexus-media-viewer-hero-stage absolute inset-0">
            {heroMedia}
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/45 to-transparent" />
          </div>

          {hero && (
            <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 lg:px-12">
              <div
                className="flex max-w-4xl flex-col"
                style={{ gap: "var(--space-lg)" }}
              >
                <div
                  className="flex max-w-4xl flex-col"
                  style={{ gap: "var(--space-md)" }}
                >
                  {hero.eyebrow && (
                    <NexusCardBadge variant="overlayBrand" className="w-fit">
                      {hero.eyebrow}
                    </NexusCardBadge>
                  )}

                  <div
                    className="flex max-w-4xl flex-col"
                    style={{ gap: "var(--space-base)" }}
                  >
                    <h2 className="text-hero uppercase tracking-normal text-white">
                      {hero.title}
                    </h2>

                    {hero.description && (
                      <p className="max-w-xl text-body text-stone-400">
                        {hero.description}
                      </p>
                    )}
                  </div>
                </div>

                {(hero.primaryText || hero.secondaryText) && (
                  <div
                    className="flex flex-wrap items-center"
                    style={{ gap: "var(--space-sm)" }}
                  >
                    {hero.primaryText && (
                      <span
                        className="inline-flex h-[var(--size-button-section)] items-center justify-center bg-brand-500 text-button-section text-white"
                        style={{
                          paddingInline: "var(--padding-button-inline)",
                          borderRadius: "var(--radius-inner-visual)",
                        }}
                      >
                        {hero.primaryText}
                      </span>
                    )}
                    {hero.secondaryText && (
                      <span
                        className="inline-flex h-[var(--size-button-section)] items-center justify-center border border-white/20 bg-transparent text-button-section text-white"
                        style={{
                          paddingInline: "var(--padding-button-inline)",
                          borderRadius: "var(--radius-inner-visual)",
                        }}
                      >
                        {hero.secondaryText}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-full overflow-hidden">
          <div
            className="mx-auto flex h-full w-full max-w-7xl items-center justify-center"
            style={{
              paddingTop:
                "calc(var(--padding-inner) + var(--size-button-autonomous) + var(--space-md))",
              paddingInline: "var(--space-md)",
              paddingBottom: "var(--space-md)",
            }}
          >
            <div
              className="relative w-fit max-w-full overflow-hidden"
              style={{ borderRadius: "var(--radius-inner-visual)" }}
            >
              {galleryMedia}

              {gallery && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-950/85 to-transparent pt-[var(--space-xl)]">
                  <div
                    className="flex w-full flex-col"
                    style={{
                      gap: "var(--space-md)",
                      paddingTop: "var(--space-lg)",
                      paddingInline: "var(--padding-inner)",
                      paddingBottom:
                        mediaType === "VIDEO"
                          ? "calc(var(--padding-inner) + var(--size-button-card))"
                          : "var(--padding-inner)",
                    }}
                  >
                    <div
                      className="flex min-w-0 flex-col"
                      style={{ gap: "var(--space-base)" }}
                    >
                      {(gallery.category || gallery.subcategories?.length) && (
                        <div
                          className="flex flex-wrap items-center"
                          style={{ gap: "var(--space-sm)" }}
                        >
                          {gallery.category && (
                            <NexusCardBadge variant="overlayBrand">
                              {gallery.category}
                            </NexusCardBadge>
                          )}
                          {gallery.subcategories?.map((subcategory) => (
                            <NexusCardBadge key={subcategory} variant="overlay">
                              {subcategory}
                            </NexusCardBadge>
                          ))}
                        </div>
                      )}

                      <div
                        className="flex min-w-0 flex-col"
                        style={{ gap: "var(--space-xs)" }}
                      >
                        <h2 className="text-h1 tracking-normal text-white">
                          {gallery.title}
                        </h2>
                        {gallery.description && (
                          <p className="max-w-2xl text-secondary text-stone-300">
                            {gallery.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {gallery.metadata && (
                      <div
                        className="flex items-center text-stone-400"
                        style={{ gap: "var(--space-xs)" }}
                      >
                        {gallery.metadata.icon}
                        <span
                          className="inline-flex items-baseline"
                          style={{ gap: "var(--space-xs)" }}
                        >
                          <strong className="text-secondary font-bold text-white">
                            {gallery.metadata.value}
                          </strong>
                          {gallery.metadata.label && (
                            <span className="text-secondary text-stone-300">
                              {gallery.metadata.label}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};
