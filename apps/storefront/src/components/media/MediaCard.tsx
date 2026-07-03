"use client";

import { Camera, Image as ImageIcon, Video } from "lucide-react";
import { Media } from "../../types";
import { getAssetUrl } from "../../utils/formatters";
import { Badge } from "../ui/Badge";
import { StorefrontAutonomousCard } from "../ui/Card";

interface MediaCardProps {
  media: Media;
  isTall?: boolean;
  onOpen: () => void;
}

export function MediaCard({ media, isTall = false, onOpen }: MediaCardProps) {
  const isVideo = media.mediaType === "VIDEO";
  const mediaUrl = getAssetUrl(media.mediaUrl || media.filePath);
  const posterUrl = getAssetUrl(media.posterUrl);
  const thumbnailUrl = getAssetUrl(media.posterUrl || media.mediaUrl || media.filePath);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir ${media.title}`}
      className="group block w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
      style={{ borderRadius: "var(--sf-radius-outer)" }}
    >
      <StorefrontAutonomousCard
        interactive
        density="none"
        className={`relative overflow-hidden ${isTall ? "aspect-[3/4]" : "aspect-square"}`}
      >
        {thumbnailUrl ? (
          isVideo ? (
            <video
              src={mediaUrl}
              poster={posterUrl || thumbnailUrl || undefined}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
              muted
              loop
              playsInline
              preload="metadata"
              onMouseEnter={(event) => event.currentTarget.play()}
              onMouseLeave={(event) => {
                event.currentTarget.pause();
                event.currentTarget.currentTime = 0;
              }}
            />
          ) : (
            <img
              src={thumbnailUrl}
              alt={media.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
              loading="lazy"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-50 text-stone-300">
            <ImageIcon
              style={{
                width: "var(--sf-size-stage-icon-compact)",
                height: "var(--sf-size-stage-icon-compact)",
              }}
              strokeWidth={1.5}
            />
          </div>
        )}

        <div
          className="absolute z-10"
          style={{
            top: "var(--sf-padding-inner)",
            left: "var(--sf-padding-inner)",
          }}
        >
          <Badge
            variant="overlay"
            context="autonomous"
            icon={isVideo ? Video : Camera}
            className="shadow-xl"
          >
            {isVideo ? "Video" : "Foto"}
          </Badge>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/36 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </StorefrontAutonomousCard>
    </button>
  );
}
