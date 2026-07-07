"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  MapPin,
  Video,
  Volume2,
  VolumeX,
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

const formatVideoTime = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

function MediaViewerLayeredVideoControls({
  isPlaying,
  isMuted,
  isWaiting,
  isVisible,
  currentTime,
  duration,
  onPlayPause,
  onMuteToggle,
  onSeek,
}: {
  isPlaying: boolean;
  isMuted: boolean;
  isWaiting: boolean;
  isVisible: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onMuteToggle: () => void;
  onSeek: (value: number) => void;
}) {
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className={`absolute inset-0 z-20 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ transitionTimingFunction: "var(--sf-ease)" }}
    >
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <button
          type="button"
          onClick={onPlayPause}
          className="pointer-events-auto flex items-center justify-center border border-white/20 bg-white/20 text-white shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/15"
          style={{
            width: "var(--sf-h-mobile-chrome-rail)",
            height: "var(--sf-h-mobile-chrome-rail)",
            borderRadius: "var(--sf-radius-mobile-chrome-rail)",
          }}
          aria-label={isPlaying ? "Pausar video" : "Reproducir video"}
        >
          {isWaiting ? (
            <span
              className="block animate-spin rounded-full border-2 border-white/25 border-t-white"
              style={{
                width: "var(--sf-size-mobile-chrome-icon)",
                height: "var(--sf-size-mobile-chrome-icon)",
              }}
            />
          ) : isPlaying ? (
            <Pause
              style={{
                width: "var(--sf-size-mobile-chrome-icon)",
                height: "var(--sf-size-mobile-chrome-icon)",
              }}
            />
          ) : (
            <Play
              style={{
                width: "var(--sf-size-mobile-chrome-icon)",
                height: "var(--sf-size-mobile-chrome-icon)",
              }}
              fill="currentColor"
            />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onMuteToggle}
        className="pointer-events-auto absolute right-[var(--sf-space-sm)] top-[var(--sf-space-sm)] z-20 flex items-center justify-center border border-white/20 bg-white/20 text-white shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/15 md:right-[var(--sf-padding-inner)] md:top-[var(--sf-padding-inner)]"
        style={{
          width: "var(--sf-h-button-card)",
          height: "var(--sf-h-button-card)",
          borderRadius: "var(--sf-radius-card-nested-compact)",
        }}
        aria-label={isMuted ? "Activar sonido" : "Silenciar video"}
      >
        {isMuted ? (
          <VolumeX style={{ width: "var(--sf-size-inner-icon-card)", height: "var(--sf-size-inner-icon-card)" }} />
        ) : (
          <Volume2 style={{ width: "var(--sf-size-inner-icon-card)", height: "var(--sf-size-inner-icon-card)" }} />
        )}
      </button>

      <div
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex items-center"
        style={{
          gap: "var(--sf-space-sm)",
          paddingInline: "var(--sf-media-viewer-control-inset)",
          paddingBottom: "var(--sf-media-viewer-control-inset)",
        }}
      >
        <span className="sf-text-caption hidden shrink-0 tabular-nums text-stone-300 md:block">
          {formatVideoTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={duration ? currentTime : 0}
          onChange={(event) => onSeek(Number(event.currentTarget.value))}
          className="sf-media-viewer-range min-w-0 flex-1"
          style={{ "--sf-media-viewer-progress": `${progress}%` } as CSSProperties}
          aria-label="Progreso del video"
          disabled={!duration}
        />
        <span className="sf-text-caption hidden shrink-0 tabular-nums text-stone-300 md:block">
          {formatVideoTime(duration)}
        </span>
      </div>
    </div>
  );
}

function MediaViewerInfo({
  media,
  isVideo,
  formattedDate,
  className = "",
}: {
  media: Media;
  isVideo: boolean;
  formattedDate: string | null;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col ${className}`} style={{ gap: "var(--sf-space-md)" }}>
      <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-sm)" }}>
        <Badge
          variant="overlayBrand"
          context="card"
          icon={isVideo ? Video : Camera}
          className="w-fit"
        >
          {isVideo ? "Video" : "Fotografia"}
        </Badge>

        <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
          <h2 className="sf-text-h1 text-white">{media.title}</h2>
          {media.description && (
            <p className="sf-text-secondary max-w-2xl truncate text-stone-300">
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
  );
}

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onPreviousRef = useRef(onPrevious);
  const onNextRef = useRef(onNext);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoWaiting, setIsVideoWaiting] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [areVideoControlsVisible, setAreVideoControlsVisible] = useState(true);

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
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
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

  useEffect(() => {
    setIsVideoPlaying(false);
    setIsVideoWaiting(false);
    setIsVideoMuted(true);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setMediaAspectRatio(null);
    setAreVideoControlsVisible(true);
  }, [isOpen, media?.mediaUrl, media?.filePath]);

  useEffect(() => {
    if (!isOpen) return;

    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    if (isVideoPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setAreVideoControlsVisible(false);
      }, 1400);
    } else {
      setAreVideoControlsVisible(true);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    };
  }, [isOpen, isVideoPlaying]);

  if (!isOpen || !media) return null;

  const mediaUrl = getAssetUrl(media.mediaUrl || media.filePath);
  const posterUrl = media.posterUrl ? getAssetUrl(media.posterUrl) : undefined;
  const isVideo = media.mediaType === "VIDEO";
  const formattedDate = formatMediaDate(media.mediaDate);
  const isCompactMedia = mediaAspectRatio !== null && mediaAspectRatio >= 0.7;

  const handleVideoPlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          setIsVideoPlaying(false);
        });
      }
      return;
    }

    video.pause();
  };

  const handleVideoTap = () => {
    if (isVideoPlaying && !areVideoControlsVisible) {
      revealVideoControls();
      return;
    }

    handleVideoPlayPause();
  };

  const handleVideoMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsVideoMuted(video.muted);
  };

  const handleVideoSeek = (value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(value)) return;

    video.currentTime = value;
    setVideoCurrentTime(value);
  };

  const revealVideoControls = () => {
    setAreVideoControlsVisible(true);

    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    if (isVideoPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setAreVideoControlsVisible(false);
      }, 1400);
    }
  };

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
        style={{
          paddingInline: "var(--sf-inset-mobile-chrome)",
          paddingBlock: "var(--sf-inset-mobile-chrome-block)",
        }}
      >
        <div
          className="pointer-events-auto flex shrink-0 items-center justify-center border border-white/20 bg-white/10 text-white shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-md"
          style={
            {
              width: "var(--sf-h-mobile-chrome-rail)",
              height: "var(--sf-h-mobile-chrome-rail)",
              borderRadius: "var(--sf-radius-mobile-chrome-rail)",
              padding: "var(--sf-space-sm)",
            } as CSSProperties
          }
        >
          <Button
            type="button"
            variant="ghost"
            context="autonomous"
            size="icon"
            icon={X}
            isIconOnly
            onClick={onClose}
            className="border-transparent bg-transparent text-white hover:border-white/10 hover:bg-white/10 hover:text-white"
            style={
              {
                width: "var(--sf-size-mobile-chrome-action)",
                height: "var(--sf-size-mobile-chrome-action)",
                borderRadius: "var(--sf-radius-mobile-chrome-action)",
                "--sf-button-icon-size": "var(--sf-size-mobile-chrome-icon)",
              } as CSSProperties
            }
            aria-label="Cerrar visor"
          />
        </div>
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
        className={`sf-media-viewer-body scrollbar-hide mx-auto flex h-full w-full max-w-7xl flex-col items-center overflow-y-auto px-[var(--sf-inset-page-mobile)] md:overflow-hidden lg:px-[calc(var(--sf-h-button-section)+var(--sf-space-lg))]${
          isCompactMedia ? " sf-media-viewer-body--compact" : ""
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStartRef.current = null;
        }}
      >
        <div
          ref={mediaStageRef}
          className="sf-media-viewer-stage relative w-fit max-w-full overflow-hidden"
          style={{ borderRadius: "var(--sf-radius-card-inner)" }}
          onMouseEnter={isVideo ? revealVideoControls : undefined}
          onMouseMove={isVideo ? revealVideoControls : undefined}
          onFocusCapture={isVideo ? revealVideoControls : undefined}
          onPointerDown={isVideo ? revealVideoControls : undefined}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              poster={posterUrl}
              autoPlay
              playsInline
              muted={isVideoMuted}
              onClick={handleVideoTap}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              onWaiting={() => setIsVideoWaiting(true)}
              onPlaying={() => setIsVideoWaiting(false)}
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                setVideoDuration(video.duration || 0);
                setIsVideoMuted(video.muted);
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  setMediaAspectRatio(video.videoWidth / video.videoHeight);
                }
              }}
              onTimeUpdate={(event) => {
                setVideoCurrentTime(event.currentTarget.currentTime || 0);
              }}
              onEnded={() => setIsVideoPlaying(false)}
              className="sf-media-viewer-asset sf-media-viewer-asset--video block h-auto w-full max-w-full cursor-pointer object-contain"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={media.title}
              onLoad={(event) => {
                const image = event.currentTarget;
                if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                  setMediaAspectRatio(image.naturalWidth / image.naturalHeight);
                }
              }}
              className="sf-media-viewer-asset block h-auto w-full max-w-full object-contain"
            />
          )}

          {isVideo && (
            <MediaViewerLayeredVideoControls
              isPlaying={isVideoPlaying}
              isMuted={isVideoMuted}
              isWaiting={isVideoWaiting}
              isVisible={
                !isVideoPlaying || isVideoWaiting || areVideoControlsVisible
              }
              currentTime={videoCurrentTime}
              duration={videoDuration}
              onPlayPause={handleVideoPlayPause}
              onMuteToggle={handleVideoMuteToggle}
              onSeek={handleVideoSeek}
            />
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-stone-950 via-stone-950/85 to-transparent pt-[var(--sf-space-xl)] md:block">
            <div
              className="flex w-full flex-col"
              style={{
                paddingTop: "var(--sf-space-lg)",
                paddingInline: "var(--sf-padding-inner)",
                paddingBottom: isVideo
                  ? "calc(var(--sf-padding-inner) + var(--sf-h-button-card))"
                  : "var(--sf-padding-inner)",
              }}
            >
              <MediaViewerInfo
                media={media}
                isVideo={isVideo}
                formattedDate={formattedDate}
              />
            </div>
          </div>
        </div>

        <MediaViewerInfo
          media={media}
          isVideo={isVideo}
          formattedDate={formattedDate}
          className="w-full md:hidden"
        />
      </div>
    </div>,
    document.body,
  );
}
