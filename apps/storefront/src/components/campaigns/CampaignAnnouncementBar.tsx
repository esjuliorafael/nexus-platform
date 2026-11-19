"use client";

import type { ReactNode } from "react";
import { useStorefrontCampaign } from "./StorefrontCampaignContext";

const themeClasses = {
  BRAND: "bg-stone-950 text-white",
  RED: "bg-red-800 text-white",
  PINE: "bg-emerald-950 text-white",
} as const;

interface CampaignAnnouncementBarProps {
  className?: string;
  mobileAfterRail?: boolean;
}

export function CampaignAnnouncementBar({
  className = "",
  mobileAfterRail = false,
}: CampaignAnnouncementBarProps) {
  const { campaign } = useStorefrontCampaign();

  if (!campaign?.tickerEnabled || !campaign.tickerMessage?.trim()) return null;

  const copy = (
    <>
      <span className="sf-campaign-ticker-primary">
        {campaign.tickerMessage}
      </span>
      {campaign.tickerDetail && (
        <span className="sf-campaign-ticker-detail">
          {campaign.tickerDetail}
        </span>
      )}
      {campaign.tickerShowCouponCode && (
        <span className="sf-campaign-ticker-code">
          Cupón {campaign.coupon.code}
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
    campaign.tickerMessage,
    campaign.tickerDetail,
    campaign.tickerShowCouponCode ? `Cupón ${campaign.coupon.code}` : null,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim().replace(/[.!?]+$/, ""))
    .join(". ");

  return (
    <div
      className={`sf-campaign-ticker ${themeClasses[campaign.theme]} ${className}`}
      style={
        mobileAfterRail
          ? {
              marginInline: "var(--sf-inset-mobile-chrome)",
              marginTop:
                "calc(var(--sf-inset-mobile-chrome-block) + var(--sf-h-mobile-chrome-rail) + var(--sf-space-md))",
            }
          : undefined
      }
    >
      <div
        role="group"
        className="sf-campaign-ticker-content"
        aria-label={label}
      >
        {track}
      </div>
    </div>
  );
}
