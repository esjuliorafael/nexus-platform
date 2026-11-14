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
  title: "Aprovecha el 15% de descuento",
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
