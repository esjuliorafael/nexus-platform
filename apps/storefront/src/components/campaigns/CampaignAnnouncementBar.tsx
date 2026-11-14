"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useStorefrontCampaign } from "./StorefrontCampaignContext";

const themeClasses = {
  BRAND: "bg-stone-950 text-white",
  RED: "bg-red-800 text-white",
  PINE: "bg-emerald-950 text-white",
} as const;

interface CampaignAnnouncementBarProps {
  className?: string;
  mobileAfterCatalogRail?: boolean;
}

export function CampaignAnnouncementBar({
  className = "",
  mobileAfterCatalogRail = false,
}: CampaignAnnouncementBarProps) {
  const { campaign } = useStorefrontCampaign();

  if (!campaign) return null;

  const copy = (
    <>
      {campaign.eyebrow && (
        <span className="sf-campaign-ticker-eyebrow">{campaign.eyebrow}</span>
      )}
      <span className="sf-campaign-ticker-title">{campaign.title}</span>
      {campaign.message && (
        <span className="sf-campaign-ticker-message">{campaign.message}</span>
      )}
      <span className="sf-campaign-ticker-message">
        Ingresa {campaign.coupon.code} en el carrito o antes de finalizar tu
        pedido.
      </span>
      {campaign.ctaLabel && (
        <span className="sf-campaign-ticker-cta">
          {campaign.ctaLabel}
          <ArrowRight aria-hidden="true" />
        </span>
      )}
    </>
  );

  const tickerCopies: ReactNode[] = [
    <span className="sf-campaign-ticker-copy" key="primary">
      {copy}
    </span>,
    <span
      aria-hidden="true"
      className="sf-campaign-ticker-copy"
      key="duplicate"
    >
      {copy}
    </span>,
  ];

  const track = (
    <span aria-hidden="true" className="sf-campaign-ticker-track">
      {tickerCopies}
    </span>
  );

  const label = [
    campaign.eyebrow,
    campaign.title,
    campaign.message,
    `Ingresa ${campaign.coupon.code} en el carrito o antes de finalizar tu pedido`,
    campaign.ctaLabel,
  ]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.trim().replace(/[.!?]+$/, ""))
    .join(". ");

  return (
    <div
      className={`sf-campaign-ticker ${themeClasses[campaign.theme]} ${className}`}
      style={
        mobileAfterCatalogRail
          ? {
              marginInline: "var(--sf-inset-mobile-chrome)",
              marginTop:
                "calc(var(--sf-inset-mobile-chrome-block) + var(--sf-h-mobile-chrome-rail) + var(--sf-space-md))",
            }
          : undefined
      }
    >
      {campaign.ctaHref ? (
        <Link
          href={campaign.ctaHref}
          aria-label={label}
          className="sf-campaign-ticker-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {track}
        </Link>
      ) : (
        <div
          role="group"
          className="sf-campaign-ticker-link"
          aria-label={label}
        >
          {track}
        </div>
      )}
    </div>
  );
}
