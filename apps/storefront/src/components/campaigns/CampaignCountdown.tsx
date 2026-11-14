"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Clock3, Copy } from "lucide-react";
import Link from "next/link";
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

function campaignDateRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: "America/Mexico_City",
  });
  const startParts = Object.fromEntries(
    formatter
      .formatToParts(new Date(startsAt))
      .map(({ type, value }) => [type, value]),
  );
  const endParts = Object.fromEntries(
    formatter
      .formatToParts(new Date(endsAt))
      .map(({ type, value }) => [type, value]),
  );

  if (startParts.month === endParts.month) {
    return `${startParts.day}–${endParts.day} de ${endParts.month}`;
  }

  return `${startParts.day} de ${startParts.month} – ${endParts.day} de ${endParts.month}`;
}

function couponScopeLabel(scope: string, birdPurpose: string | null) {
  if (scope === "BIRD") {
    if (birdPurpose === "COMBAT") return "en aves de combate participantes";
    if (birdPurpose === "BREEDING") return "en aves de cría participantes";
    return "en aves participantes";
  }

  if (scope === "ITEM") return "en artículos participantes";
  return "en productos participantes";
}

export function CampaignCountdown() {
  const { campaign } = useStorefrontCampaign();
  const [now, setNow] = useState(() => Date.now());
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  if (!campaign) return null;

  const remaining = remainingTime(campaign.endsAt, now);
  if (remaining.ended) return null;

  const campaignLabel = campaign.name.replace(/\s+\d{4}$/, "").trim();
  const campaignEyebrow = campaign.eyebrow
    ?.split(/[·•|]/, 1)[0]
    .trim();
  const campaignDisplayName = campaignEyebrow || campaignLabel;
  const dateRange = campaignDateRange(campaign.startsAt, campaign.endsAt);
  const scopeLabel = couponScopeLabel(
    campaign.coupon.scope,
    campaign.coupon.birdPurpose,
  );
  const timeUnits = [
    { label: "días", value: remaining.days },
    { label: "hrs", value: remaining.hours },
    { label: "min", value: remaining.minutes },
  ];

  const copyCouponCode = async () => {
    try {
      await navigator.clipboard.writeText(campaign.coupon.code);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  const themeClass = `sf-campaign-promo--${campaign.theme.toLowerCase()}`;
  const emphasis = campaign.titleEmphasis?.trim();
  const emphasisStart = emphasis ? campaign.title.indexOf(emphasis) : -1;
  const emphasisIsUnique = emphasis
    ? emphasisStart !== -1 &&
      campaign.title.indexOf(emphasis, emphasisStart + 1) === -1
    : false;
  const title = emphasis && emphasisIsUnique ? (
    <>
      {campaign.title.slice(0, emphasisStart)}
      <em className="sf-campaign-promo__title-emphasis">{emphasis}</em>
      {campaign.title.slice(emphasisStart + emphasis.length)}
    </>
  ) : (
    campaign.title
  );

  return (
    <section
      aria-labelledby="campaign-countdown-heading"
      className={`sf-campaign-promo ${themeClass}`}
    >
      <div className="sf-campaign-promo__meta">
        <span className="sf-campaign-promo__name">
          {campaignDisplayName}
        </span>
        <span className="sf-campaign-promo__dates">{dateRange}</span>
      </div>

      <div className="sf-campaign-promo__copy">
        <h2 id="campaign-countdown-heading" className="sf-campaign-promo__title">
          {title}
        </h2>
        {campaign.message && (
          <p className="sf-campaign-promo__message">{campaign.message}</p>
        )}
        {campaign.ctaLabel && campaign.ctaHref && (
          <Link className="sf-campaign-promo__cta" href={campaign.ctaHref}>
            <span>{campaign.ctaLabel}</span>
            <ArrowRight aria-hidden="true" size={20} strokeWidth={1.8} />
          </Link>
        )}
      </div>

      <div className="sf-campaign-promo__ticket">
        <div className="sf-campaign-promo__ticket-offer">
          <p className="sf-campaign-promo__ticket-kicker">
            Una gran oportunidad
          </p>
          <div className="sf-campaign-promo__discount">
            <strong>{campaign.coupon.discountValue}</strong>
            <span>%</span>
          </div>
          <p className="sf-campaign-promo__discount-label">de descuento</p>
          <p className="sf-campaign-promo__scope">{scopeLabel}</p>
        </div>

        <div className="sf-campaign-promo__perforation" aria-hidden="true" />

        <div className="sf-campaign-promo__coupon">
          <div className="sf-campaign-promo__coupon-copy">
            <span className="sf-campaign-promo__coupon-label">
              Copia tu cupón
            </span>
            <strong>{campaign.coupon.code}</strong>
          </div>
          <button
            type="button"
            className="sf-campaign-promo__copy-button"
            onClick={copyCouponCode}
            aria-label={`Copiar código ${campaign.coupon.code}`}
            title="Copiar código"
          >
            {copyState === "copied" ? (
              <Check aria-hidden="true" size={18} />
            ) : (
              <Copy aria-hidden="true" size={18} />
            )}
          </button>
        </div>
        <p className="sf-campaign-promo__redeem">
          Úsalo al finalizar tu pedido.
        </p>
        <span className="sr-only" aria-live="polite">
          {copyState === "copied"
            ? "Código copiado"
            : copyState === "error"
              ? "No se pudo copiar el código"
              : ""}
        </span>
      </div>

      <div
        className="sf-campaign-promo__timer"
        role="timer"
        aria-label={`${remaining.days} días, ${remaining.hours} horas y ${remaining.minutes} minutos restantes`}
        aria-live="off"
      >
        <span className="sf-campaign-promo__timer-label">
          <Clock3 aria-hidden="true" size={16} strokeWidth={1.7} />
          Termina en
        </span>
        {timeUnits.map(({ label, value }) => (
          <span key={label} className="sf-campaign-promo__time-unit">
            <strong>{String(value).padStart(2, "0")}</strong>
            <span>{label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
