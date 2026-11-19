import assert from "node:assert/strict";
import test from "node:test";
import {
  createStorefrontCampaignSchema,
  updateStorefrontCampaignActiveSchema,
  updateStorefrontCampaignSchema,
} from "../src/modules/store/campaigns/storefront-campaign.schema";

const validCampaign = {
  name: "Buen Fin 2026",
  eyebrow: "Buen Fin · 13 al 17 de noviembre",
  cardLabel: "Buen Fin",
  tickerEnabled: true,
  tickerMessage: "Buen Fin en Rancho Las Trojes",
  tickerDetail: "Promoción vigente hasta el 17 de noviembre",
  tickerShowCouponCode: false,
  homeCardEnabled: true,
  title: "Aprovecha el 15% de descuento",
  titleEmphasis: "de descuento",
  message: "Promoción en ejemplares participantes.",
  ctaLabel: "Ver promociones",
  ctaHref: "/store?type=BIRD",
  theme: "RED",
  active: true,
  startsAt: "2026-11-13T06:00:00.000Z",
  endsAt: "2026-11-18T05:59:00.000Z",
  couponId: 7,
};

test("accepts a campaign with an internal destination and valid schedule", () => {
  assert.equal(
    createStorefrontCampaignSchema.safeParse(validCampaign).success,
    true,
  );
});

test("requires the highlighted phrase to occur exactly once in the title", () => {
  assert.equal(
    createStorefrontCampaignSchema.safeParse({
      ...validCampaign,
      titleEmphasis: "no está en el título",
    }).success,
    false,
  );
  assert.equal(
    createStorefrontCampaignSchema.safeParse({
      ...validCampaign,
      title: "de descuento y de descuento",
      titleEmphasis: "de descuento",
    }).success,
    false,
  );
  assert.equal(
    updateStorefrontCampaignSchema.safeParse({
      title: "Aprovecha el 15% de descuento",
      titleEmphasis: "de descuento",
    }).success,
    true,
  );
});

test("requires both CTA fields and rejects external or protocol-relative destinations", () => {
  assert.equal(
    createStorefrontCampaignSchema.safeParse({
      ...validCampaign,
      ctaHref: null,
    }).success,
    false,
  );
  assert.equal(
    createStorefrontCampaignSchema.safeParse({
      ...validCampaign,
      ctaHref: "https://example.com",
    }).success,
    false,
  );
  assert.equal(
    createStorefrontCampaignSchema.safeParse({
      ...validCampaign,
      ctaHref: "//example.com",
    }).success,
    false,
  );
  assert.equal(
    createStorefrontCampaignSchema.safeParse({
      ...validCampaign,
      ctaLabel: null,
      ctaHref: null,
    }).success,
    true,
  );
});

test("rejects an inverted campaign schedule and accepts partial updates", () => {
  assert.equal(
    createStorefrontCampaignSchema.safeParse({
      ...validCampaign,
      startsAt: validCampaign.endsAt,
      endsAt: validCampaign.startsAt,
    }).success,
    false,
  );
  assert.equal(
    updateStorefrontCampaignSchema.safeParse({ title: "Texto actualizado" })
      .success,
    true,
  );
  assert.equal(
    updateStorefrontCampaignActiveSchema.safeParse({ active: false }).success,
    true,
  );
});

test("allows the ticker and home card to be disabled independently", () => {
  const cardOnly = createStorefrontCampaignSchema.safeParse({
    ...validCampaign,
    tickerEnabled: false,
    tickerMessage: null,
  });
  const tickerOnly = createStorefrontCampaignSchema.safeParse({
    ...validCampaign,
    homeCardEnabled: false,
    cardLabel: null,
    title: undefined,
    titleEmphasis: null,
    message: null,
    ctaLabel: null,
    ctaHref: null,
  });

  assert.equal(cardOnly.success, true);
  assert.equal(tickerOnly.success, true);
  assert.equal(
    updateStorefrontCampaignSchema.safeParse({ homeCardEnabled: false })
      .success,
    true,
  );
  assert.equal(
    updateStorefrontCampaignSchema.safeParse({ tickerEnabled: false }).success,
    true,
  );
});

test("requires content only for each enabled surface", () => {
  assert.equal(
    createStorefrontCampaignSchema.safeParse({
      ...validCampaign,
      tickerMessage: "  ",
    }).success,
    false,
  );
  assert.equal(
    createStorefrontCampaignSchema.safeParse({
      ...validCampaign,
      cardLabel: null,
    }).success,
    false,
  );
});
