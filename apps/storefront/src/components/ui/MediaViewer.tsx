"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Video,
  X,
} from "lucide-react";
import { Media } from "../../types";
import { getAssetUrl } from "../../utils/formatters";
import { Badge } from "./Badge";
import { Button } from "./Button";

interface MediaViewerProps {
  isOpen: boolean;
  media: Media | null;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  canNavigate?: boolean;
}

const formatMediaDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

export function MediaViewer({
  isOpen,
  media,
  onClose,
  onPrevious,
  onNext,
  canNavigate = false,
}: MediaViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const mediaStageRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onPreviousRef = useRef(onPrevious);
  const onNextRef = useRef(onNext);

  onPreviousRef.current = onPrevious;
  onNextRef.current = onNext;

  useEffect(() => {
    if (!isOpen || !media) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (canNavigate && event.key === "ArrowLeft") {
        event.preventDefault();
        onPreviousRef.current?.();
        return;
      }

      if (canNavigate && event.key === "ArrowRight") {
        event.preventDefault();
        onNextRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !viewerRef.current) return;
      const focusable = Array.from(
        viewerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), video[controls], [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
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

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    viewerRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [canNavigate, isOpen, onClose]);

  if (!isOpen || !media) return null;

  const mediaUrl = getAssetUrl(media.mediaUrl || media.filePath);
  const posterUrl = media.posterUrl ? getAssetUrl(media.posterUrl) : undefined;
  const isVideo = media.mediaType === "VIDEO";
  const formattedDate = formatMediaDate(media.mediaDate);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!canNavigate || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const stageBounds = mediaStageRef.current?.getBoundingClientRect();
    const startedOnVideo = event.target instanceof HTMLVideoElement;
    const nativeControlsInset = 72;

    if (
      startedOnVideo &&
      stageBounds &&
      touch.clientY >= stageBounds.bottom - nativeControlsInset
    ) {
      touchStartRef.current = null;
      return;
    }

    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const stageWidth = mediaStageRef.current?.clientWidth || window.innerWidth;
    const threshold = Math.max(48, stageWidth * 0.12);

    if (
      Math.abs(deltaX) < threshold ||
      Math.abs(deltaX) <= Math.abs(deltaY) * 1.25
    ) {
      return;
    }

    if (deltaX < 0) onNext?.();
    else onPrevious?.();
  };

  return createPortal(
    <div
      ref={viewerRef}
      role="dialog"
      aria-modal="true"
      aria-label={media.title}
      tabIndex={-1}
      className="fixed inset-0 z-[200] overflow-hidden bg-stone-950 text-white outline-none"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start"
        style={{ padding: "var(--sf-padding-inner)" }}
      >
        <Button
          type="button"
          variant="ghost"
          context="autonomous"
          size="icon"
          icon={X}
          isIconOnly
          onClick={onClose}
          className="pointer-events-auto border border-white/20 bg-white/10 text-white backdrop-blur-md hover:border-white/30 hover:bg-white/20"
          aria-label="Cerrar visor"
        />
      </div>

      {canNavigate && (
        <>
          <Button
            type="button"
            variant="ghost"
            context="autonomous"
            size="icon"
            icon={ChevronLeft}
            isIconOnly
            onClick={onPrevious}
            className="absolute left-[var(--sf-padding-inner)] top-1/2 z-30 hidden -translate-y-1/2 border border-white/20 bg-white/10 text-white backdrop-blur-md hover:border-white/30 hover:bg-white/20 lg:inline-flex"
            aria-label="Ver medio anterior"
          />
          <Button
            type="button"
            variant="ghost"
            context="autonomous"
            size="icon"
            icon={ChevronRight}
            isIconOnly
            onClick={onNext}
            className="absolute right-[var(--sf-padding-inner)] top-1/2 z-30 hidden -translate-y-1/2 border border-white/20 bg-white/10 text-white backdrop-blur-md hover:border-white/30 hover:bg-white/20 lg:inline-flex"
            aria-label="Ver medio siguiente"
          />
        </>
      )}

      <div
        className="mx-auto flex h-full w-full max-w-7xl items-center justify-center px-[var(--sf-space-md)] lg:px-[calc(var(--sf-h-button-section)+var(--sf-space-lg))]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStartRef.current = null;
        }}
        style={{
          paddingTop:
            "calc(var(--sf-padding-inner) + var(--sf-h-button-section) + var(--sf-space-md))",
          paddingBottom: "var(--sf-space-md)",
        }}
      >
        <div
          ref={mediaStageRef}
          className="relative w-fit max-w-full overflow-hidden"
          style={{ borderRadius: "var(--sf-radius-card-inner)" }}
        >
          {isVideo ? (
            <video
              src={mediaUrl}
              poster={posterUrl}
              controls
              autoPlay
              playsInline
              className="block h-auto w-auto max-w-full object-contain"
              style={{
                maxHeight:
                  "calc(100dvh - var(--sf-padding-inner) - var(--sf-h-button-section) - (var(--sf-space-md) * 2))",
              }}
            />
          ) : (
            <img
              src={mediaUrl}
              alt={media.title}
              className="block h-auto w-auto max-w-full object-contain"
              style={{
                maxHeight:
                  "calc(100dvh - var(--sf-padding-inner) - var(--sf-h-button-section) - (var(--sf-space-md) * 2))",
              }}
            />
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-950/85 to-transparent pt-[var(--sf-space-xl)]">
            <div
              className="flex w-full flex-col"
              style={{
                gap: "var(--sf-space-md)",
                paddingTop: "var(--sf-space-lg)",
                paddingInline: "var(--sf-padding-inner)",
                paddingBottom: isVideo
                  ? "calc(var(--sf-padding-inner) + var(--sf-h-button-card))"
                  : "var(--sf-padding-inner)",
              }}
            >
              <div
                className="flex min-w-0 flex-col"
                style={{ gap: "var(--sf-space-sm)" }}
              >
                <Badge
                  variant="overlayBrand"
                  context="card"
                  icon={isVideo ? Video : Camera}
                  className="w-fit"
                >
                  {isVideo ? "Video" : "Fotografia"}
                </Badge>

                <div
                  className="flex min-w-0 flex-col"
                  style={{ gap: "var(--sf-space-xs)" }}
                >
                  <h2 className="sf-text-h1 text-white">{media.title}</h2>
                  {media.description && (
                    <p className="sf-text-secondary max-w-2xl text-stone-300">
                      {media.description}
                    </p>
                  )}
                </div>
              </div>

              {(media.location || formattedDate) && (
                <div
                  className="flex flex-wrap items-center text-stone-300"
                  style={{ gap: "var(--sf-space-md)" }}
                >
                  {media.location && (
                    <span
                      className="sf-text-secondary inline-flex items-center"
                      style={{ gap: "var(--sf-space-xs)" }}
                    >
                      <MapPin size={14} />
                      {media.location}
                    </span>
                  )}
                  {formattedDate && (
                    <span
                      className="sf-text-secondary inline-flex items-center"
                      style={{ gap: "var(--sf-space-xs)" }}
                    >
                      <CalendarDays size={14} />
                      {formattedDate}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
