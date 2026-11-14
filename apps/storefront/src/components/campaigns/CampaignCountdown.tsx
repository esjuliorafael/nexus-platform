"use client";

import { useEffect, useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { useStorefrontCampaign } from "./StorefrontCampaignContext";

function remainingTime(endsAt: string, now: number) {
  const totalSeconds = Math.max(
    0,
    Math.floor((new Date(endsAt).getTime() - now) / 1000),
  );

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    ended: totalSeconds === 0,
  };
}

const themeStyles = {
  BRAND: {
    section: "bg-stone-950 text-white",
    eyebrow: "text-stone-300",
    muted: "text-stone-300",
    tile: "border-white/15 bg-white/10",
    code: "border-white/25 bg-white/10",
    accent: "text-amber-200",
  },
  RED: {
    section: "bg-red-900 text-white",
    eyebrow: "text-red-100/80",
    muted: "text-red-100/80",
    tile: "border-white/20 bg-red-800/70",
    code: "border-white/25 bg-red-950/35",
    accent: "text-red-100",
  },
  PINE: {
    section: "bg-emerald-950 text-white",
    eyebrow: "text-emerald-100/80",
    muted: "text-emerald-100/80",
    tile: "border-white/20 bg-emerald-900/70",
    code: "border-white/25 bg-emerald-950/50",
    accent: "text-emerald-100",
  },
} as const;

export function CampaignCountdown() {
  const { campaign } = useStorefrontCampaign();
  const { getBranding } = useSettings();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  if (!campaign) return null;

  const remaining = remainingTime(campaign.endsAt, now);
  if (remaining.ended) return null;

  const branding = getBranding();
  const brandName =
    branding.brand_name && branding.brand_name !== "Nexus Store"
      ? branding.brand_name
      : "Rancho Las Trojes";
  const campaignLabel = campaign.name.replace(/\s+\d{4}$/, "").trim();
  const heading = /^buen fin$/i.test(campaignLabel)
    ? `El ${campaignLabel} llegó a ${brandName}`
    : `${campaignLabel} en ${brandName}`;
  const theme = themeStyles[campaign.theme];
  const timeUnits = [
    { label: "Días", value: remaining.days },
    { label: "Horas", value: remaining.hours },
    { label: "Minutos", value: remaining.minutes },
  ];

  return (
    <section
      aria-labelledby="campaign-countdown-heading"
      className={`w-full ${theme.section}`}
      style={{
        borderRadius: "var(--sf-radius-outer)",
        padding: "var(--sf-padding-outer)",
      }}
    >
      <div className="mx-auto w-full max-w-5xl">
        <header
          className="text-center"
          style={{ marginBottom: "var(--sf-space-lg)" }}
        >
          {campaign.eyebrow && (
            <p
              className={`sf-text-label font-semibold uppercase ${theme.eyebrow}`}
              style={{ marginBottom: "var(--sf-space-sm)" }}
            >
              {campaign.eyebrow}
            </p>
          )}
          <h2
            id="campaign-countdown-heading"
            className="sf-text-display font-bold"
          >
            {heading}
          </h2>
          <p
            className={`sf-text-body ${theme.muted}`}
            style={{ marginTop: "var(--sf-space-sm)" }}
          >
            {campaign.message || campaign.title}
          </p>
        </header>

        <div
          className="grid grid-cols-3"
          role="timer"
          aria-label={`${remaining.days} días, ${remaining.hours} horas y ${remaining.minutes} minutos restantes`}
          aria-live="off"
          style={{ gap: "var(--sf-space-sm)" }}
        >
          {timeUnits.map(({ label, value }) => (
            <div
              key={label}
              className={`flex min-w-0 flex-col items-center justify-center border text-center ${theme.tile}`}
              style={{
                borderRadius: "var(--sf-radius-inner)",
                minHeight: "clamp(5.5rem, 12vw, 7.5rem)",
                padding: "var(--sf-space-md) var(--sf-space-sm)",
              }}
            >
              <span
                className={`font-bold tabular-nums ${theme.accent}`}
                style={{ fontSize: "2rem", lineHeight: 1.1 }}
              >
                {String(value).padStart(2, "0")}
              </span>
              <span
                className={`sf-text-secondary font-medium ${theme.muted}`}
                style={{ marginTop: "var(--sf-space-xs)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col items-center"
          style={{
            borderTop: "1px solid rgb(255 255 255 / 0.2)",
            marginTop: "var(--sf-space-lg)",
            paddingTop: "var(--sf-space-lg)",
          }}
        >
          <div
            className="flex w-full flex-col items-center justify-between sm:flex-row"
            style={{ gap: "var(--sf-space-md)" }}
          >
            <p className={`font-bold ${theme.accent}`}>
              <span style={{ fontSize: "2rem", lineHeight: 1.1 }}>
                {campaign.coupon.discountValue}%
              </span>{" "}
              <span className="sf-text-h2">de descuento</span>
            </p>
            <div
              className={`inline-flex items-center border border-dashed ${theme.code}`}
              style={{
                gap: "var(--sf-space-sm)",
                borderRadius: "var(--sf-radius-nested)",
                padding: "var(--sf-space-sm) var(--sf-space-md)",
              }}
            >
              <span
                className={`sf-text-label font-semibold uppercase ${theme.eyebrow}`}
              >
                Cupón
              </span>
              <span
                className={`font-bold font-mono ${theme.accent}`}
                style={{ fontSize: "1.25rem", lineHeight: 1.2 }}
              >
                {campaign.coupon.code}
              </span>
            </div>
          </div>
          <p
            className={`sf-text-secondary text-center ${theme.muted}`}
            style={{ marginTop: "var(--sf-space-sm)" }}
          >
            Ingresa {campaign.coupon.code} en el carrito o antes de finalizar tu
            pedido.
          </p>
        </div>
      </div>
    </section>
  );
}
