"use client";

import { ExternalLink, Sparkles, Wrench } from "lucide-react";
import { StorefrontSectionButton } from "../ui/Button";
import { StorefrontSectionBadge } from "../ui/Badge";
import { useBrandImageReady } from "../ui/BrandLogo";
import { StorefrontSectionIcon } from "../ui/Icon";
import { useFavicon } from "../../hooks/useFavicon";

interface StorefrontUnavailableViewProps {
  status: "MAINTENANCE" | "COMING_SOON";
  eyebrow: string;
  title: string;
  description: string;
  showLogo: boolean;
  logoUrl?: string | null;
  brandName: string;
  mediaUrl?: string;
  posterUrl?: string;
  mediaType?: "PHOTO" | "VIDEO";
  desktopObjectPosition?: string;
  mobileObjectPosition?: string;
  primaryText?: string;
  primaryHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}

export function StorefrontUnavailableView({
  status,
  eyebrow,
  title,
  description,
  showLogo,
  logoUrl,
  brandName,
  mediaUrl,
  posterUrl,
  mediaType,
  desktopObjectPosition = "50% 50%",
  mobileObjectPosition = "50% 50%",
  primaryText,
  primaryHref,
  secondaryText,
  secondaryHref,
}: StorefrontUnavailableViewProps) {
  useFavicon(logoUrl || null);
  const isBrandLogoReady = useBrandImageReady(logoUrl);

  const isLaunch = status === "COMING_SOON";
  const hasPrimaryCta = Boolean(primaryText && primaryHref);
  const hasSecondaryCta = Boolean(secondaryText && secondaryHref);
  const hasMedia = Boolean(mediaUrl);
  const Icon = isLaunch ? Sparkles : Wrench;
  const isVideo = mediaType === "VIDEO" || (mediaUrl ? isVideoUrl(mediaUrl) : false);

  return (
    <main
      className="relative flex min-h-screen overflow-hidden bg-stone-950 text-white"
      style={{ padding: "var(--sf-inset-page-mobile)" }}
    >
      {hasMedia ? (
        <div className="absolute inset-0">
          <MediaBackground
            mediaUrl={mediaUrl!}
            posterUrl={posterUrl}
            isVideo={isVideo}
            desktopObjectPosition={desktopObjectPosition}
            mobileObjectPosition={mobileObjectPosition}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(185,141,104,0.24),transparent_34%),linear-gradient(135deg,#0c0a09_0%,#292524_52%,#0c0a09_100%)]" />
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(12,10,9,0.16),rgba(12,10,9,0.84)_72%,rgba(12,10,9,0.96)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-stone-950 via-stone-950/76 to-transparent" />

      <section
        className="relative z-10 mx-auto flex min-h-[calc(100vh-(var(--sf-inset-page-mobile)*2))] w-full max-w-[var(--sf-max-width-content)] flex-col justify-between"
        style={{ gap: "var(--sf-space-xl)" }}
      >
        <header className="flex items-center justify-between">
          {showLogo && logoUrl && isBrandLogoReady ? (
            <img
              src={logoUrl}
              alt={brandName}
              className="sf-brand-logo-reveal max-h-16 w-auto max-w-[12rem] object-contain drop-shadow-[0_18px_38px_rgba(0,0,0,0.45)]"
            />
          ) : (
            <span />
          )}
          <StorefrontSectionBadge
            variant="overlay"
            icon={Icon}
            className="border-white/15 bg-white/10 text-white shadow-2xl shadow-black/20"
          >
            {isLaunch ? "Próximamente" : "Mantenimiento"}
          </StorefrontSectionBadge>
        </header>

        <div
          className="flex max-w-3xl flex-col"
          style={{ gap: "var(--sf-space-lg)" }}
        >
          <StorefrontSectionIcon
            icon={Icon}
            variant={isLaunch ? "warning" : "muted"}
            className="border-white/15 bg-white/10 text-white shadow-2xl shadow-black/20 backdrop-blur-xl"
          />

          <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
            <p className="sf-text-label uppercase tracking-[0.18em] text-brand-200">
              {eyebrow || brandName}
            </p>
            <h1 className="sf-text-hero max-w-2xl text-white">{title}</h1>
            <p className="sf-text-body max-w-xl leading-relaxed text-white/74">
              {description}
            </p>
          </div>

          {(hasPrimaryCta || hasSecondaryCta) && (
            <div className="flex flex-col sm:flex-row" style={{ gap: "var(--sf-space-sm)" }}>
              {hasPrimaryCta && (
                <StorefrontSectionButton
                  asChild
                  icon={ExternalLink}
                  className="w-fit border-white/15 bg-white text-stone-950 hover:bg-brand-100 hover:text-stone-950"
                >
                  <a href={primaryHref} target="_blank" rel="noreferrer">
                    {primaryText}
                  </a>
                </StorefrontSectionButton>
              )}
              {hasSecondaryCta && (
                <StorefrontSectionButton
                  asChild
                  variant="secondary"
                  icon={ExternalLink}
                  className="w-fit border-white/15 bg-white/10 text-white hover:bg-white/15"
                >
                  <a href={secondaryHref} target="_blank" rel="noreferrer">
                    {secondaryText}
                  </a>
                </StorefrontSectionButton>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-col border-t border-white/10 pt-[var(--sf-space-md)] text-white/52 md:flex-row md:items-center md:justify-between">
          <span className="sf-text-label uppercase tracking-[0.18em]">
            Storefront temporalmente limitado
          </span>
          <span className="sf-text-secondary">
            El panel administrativo permanece disponible.
          </span>
        </footer>
      </section>
    </main>
  );
}

interface MediaBackgroundProps {
  mediaUrl: string;
  posterUrl?: string;
  isVideo: boolean;
  desktopObjectPosition: string;
  mobileObjectPosition: string;
}

const MediaBackground: React.FC<MediaBackgroundProps> = ({
  mediaUrl,
  posterUrl,
  isVideo,
  desktopObjectPosition,
  mobileObjectPosition,
}) => {
  if (isVideo) {
    return (
      <>
        <video
          src={mediaUrl}
          poster={posterUrl}
          className="hidden h-full w-full object-cover md:block"
          style={{ objectPosition: desktopObjectPosition }}
          autoPlay
          muted
          loop
          playsInline
        />
        <video
          src={mediaUrl}
          poster={posterUrl}
          className="h-full w-full object-cover md:hidden"
          style={{ objectPosition: mobileObjectPosition }}
          autoPlay
          muted
          loop
          playsInline
        />
      </>
    );
  }

  return (
    <>
      <img
        src={mediaUrl}
        alt=""
        className="hidden h-full w-full object-cover md:block"
        style={{ objectPosition: desktopObjectPosition }}
        aria-hidden="true"
      />
      <img
        src={mediaUrl}
        alt=""
        className="h-full w-full object-cover md:hidden"
        style={{ objectPosition: mobileObjectPosition }}
        aria-hidden="true"
      />
    </>
  );
};
