import type { CSSProperties } from "react";
import { StorefrontAutonomousCard } from "../ui/Card";
import { StoreHero } from "../../types";
import { getAssetUrl } from "../../utils/formatters";

export function StoreHeroBanner({ hero }: { hero: StoreHero }) {
  const mediaUrl = getAssetUrl(hero.mediaUrl);
  const posterUrl = getAssetUrl(hero.posterUrl);
  const heroPositionStyle = {
    "--sf-hero-mobile-object-position": hero.mobileObjectPosition || "50% 50%",
    "--sf-hero-desktop-object-position": hero.desktopObjectPosition || "50% 50%",
  } as CSSProperties;

  return (
    <StorefrontAutonomousCard
      density="none"
      className="relative aspect-[1.95/1] overflow-hidden shadow-[0_1.5rem_4rem_rgba(80,55,38,0.16)] md:aspect-[3.6/1]"
      style={heroPositionStyle}
    >
      {hero.type === "VIDEO" ? (
        <video
          src={mediaUrl}
          poster={posterUrl || undefined}
          className="sf-hero-media h-full w-full object-cover"
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={mediaUrl}
          alt={hero.title}
          className="sf-hero-media h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/48 via-stone-950/18 to-transparent" />
      <div
        className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center text-white"
        style={{
          padding: "var(--sf-padding-inner)",
          gap: "var(--sf-space-xs)",
        }}
      >
        <h2 className="sf-text-h2 font-black leading-tight">{hero.title}</h2>
        {hero.description && (
          <p className="sf-text-body hidden max-w-md text-white/82 sm:block">
            {hero.description}
          </p>
        )}
      </div>
    </StorefrontAutonomousCard>
  );
}

export function StoreHeroSkeleton() {
  return (
    <div
      className="animate-pulse bg-stone-100"
      style={{
        aspectRatio: "1.95 / 1",
        borderRadius: "var(--sf-radius-outer)",
      }}
    />
  );
}
