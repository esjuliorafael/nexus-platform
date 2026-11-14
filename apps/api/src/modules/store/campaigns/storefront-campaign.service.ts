import { CouponDiscountType } from "@prisma/client-store";
import { storePrisma } from "@nexus/db/store";

type CampaignInput = {
  name?: string;
  eyebrow?: string | null;
  title?: string;
  message?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  theme?: string;
  active?: boolean;
  startsAt?: string;
  endsAt?: string;
  couponId?: number;
};

const fail = (message: string, statusCode = 400): never => {
  throw Object.assign(new Error(message), { statusCode });
};

function couponCanShowUnitPrices(coupon: {
  discountType: CouponDiscountType;
  discountValue: unknown;
  minSubtotal: unknown;
  maxDiscount: unknown;
}) {
  return (
    coupon.discountType === CouponDiscountType.PERCENTAGE &&
    Number(coupon.discountValue) > 0 &&
    Number(coupon.discountValue) <= 100 &&
    coupon.minSubtotal == null &&
    coupon.maxDiscount == null
  );
}

function isCouponWithinCampaign(
  coupon: {
    active: boolean;
    startsAt: Date | null;
    expiresAt: Date | null;
    usageLimit: number | null;
    usedCount: number;
  },
  startsAt: Date,
  endsAt: Date,
) {
  return (
    coupon.active &&
    (!coupon.startsAt || coupon.startsAt <= startsAt) &&
    (!coupon.expiresAt || coupon.expiresAt >= endsAt) &&
    (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit) &&
    couponCanShowUnitPrices(coupon as any)
  );
}

async function assertNoActiveOverlap(
  startsAt: Date,
  endsAt: Date,
  ignoreId?: number,
) {
  const activeCampaigns = await storePrisma.storefrontCampaign.findMany({
    where: { active: true, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true, startsAt: true, endsAt: true },
  });
  if (
    activeCampaigns.some(
      (item) => startsAt <= item.endsAt && endsAt >= item.startsAt,
    )
  ) {
    fail(
      "Ya existe otra campaña activa o programada durante ese periodo.",
      409,
    );
  }
}

async function validateAndNormalize(
  input: CampaignInput,
  current?: { startsAt: Date; endsAt: Date; couponId: number; active: boolean },
) {
  const startsAt = input.startsAt
    ? new Date(input.startsAt)
    : current?.startsAt;
  const endsAt = input.endsAt ? new Date(input.endsAt) : current?.endsAt;
  const couponId = input.couponId ?? current?.couponId;
  const active = input.active ?? current?.active ?? false;
  if (!startsAt || !endsAt || couponId === undefined)
    fail("Completa fechas y cupón para guardar la campaña.");
  const campaignStartsAt = startsAt as Date;
  const campaignEndsAt = endsAt as Date;
  const selectedCouponId = couponId as number;
  if (campaignEndsAt <= campaignStartsAt)
    fail("La fecha de cierre debe ser posterior al inicio.");
  const coupon = await storePrisma.coupon.findUnique({
    where: { id: selectedCouponId },
  });
  if (!coupon) fail("Selecciona un cupón existente.", 404);
  const selectedCoupon = coupon as NonNullable<typeof coupon>;
  if (!couponCanShowUnitPrices(selectedCoupon)) {
    fail(
      "La campaña requiere un cupón porcentual de 1 a 100%, sin subtotal mínimo ni descuento máximo.",
    );
  }
  if (
    active &&
    !isCouponWithinCampaign(selectedCoupon, campaignStartsAt, campaignEndsAt)
  ) {
    fail(
      "El cupón debe estar activo, disponible y cubrir todo el periodo de la campaña.",
    );
  }
  return {
    startsAt: campaignStartsAt,
    endsAt: campaignEndsAt,
    couponId: selectedCouponId,
    active,
  };
}

const couponSelection = {
  id: true,
  code: true,
  name: true,
  discountType: true,
  discountValue: true,
  scope: true,
  birdPurpose: true,
  minSubtotal: true,
  maxDiscount: true,
  usageLimit: true,
  usedCount: true,
  active: true,
  startsAt: true,
  expiresAt: true,
};

export const storefrontCampaignService = {
  async getPublicActive() {
    const now = new Date();
    const campaigns = await storePrisma.storefrontCampaign.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: { coupon: { select: couponSelection } },
      orderBy: { startsAt: "desc" },
    });
    const campaign = campaigns.find(
      ({ coupon }) =>
        coupon.active &&
        (!coupon.startsAt || coupon.startsAt <= now) &&
        (!coupon.expiresAt || coupon.expiresAt >= now) &&
        (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit) &&
        couponCanShowUnitPrices(coupon),
    );
    if (!campaign) return null;
    const { coupon, ...publicCampaign } = campaign;
    return {
      ...publicCampaign,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        scope: coupon.scope,
        birdPurpose: coupon.birdPurpose,
      },
    };
  },

  async getAdmin() {
    return storePrisma.storefrontCampaign.findMany({
      include: { coupon: { select: couponSelection } },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    });
  },

  async getAvailableCoupons(campaignId?: number) {
    const coupons = await storePrisma.coupon.findMany({
      include: { storefrontCampaign: { select: { id: true } } },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });
    return coupons
      .filter(
        (coupon) =>
          (!coupon.storefrontCampaign ||
            coupon.storefrontCampaign.id === campaignId) &&
          coupon.active &&
          (coupon.usageLimit === null ||
            coupon.usedCount < coupon.usageLimit) &&
          (!coupon.expiresAt || coupon.expiresAt >= new Date()) &&
          couponCanShowUnitPrices(coupon),
      )
      .map(({ storefrontCampaign: _campaign, discountValue, ...coupon }) => ({
        ...coupon,
        discountValue: Number(discountValue),
      }));
  },

  async create(input: CampaignInput) {
    const normalized = await validateAndNormalize(input);
    if (normalized.active)
      await assertNoActiveOverlap(normalized.startsAt, normalized.endsAt);
    return storePrisma.storefrontCampaign.create({
      data: {
        name: input.name!,
        eyebrow: input.eyebrow || null,
        title: input.title!,
        message: input.message || null,
        ctaLabel: input.ctaLabel || null,
        ctaHref: input.ctaHref || null,
        theme: input.theme || "BRAND",
        ...normalized,
      },
      include: { coupon: { select: couponSelection } },
    });
  },

  async update(id: number, input: CampaignInput) {
    const current = await storePrisma.storefrontCampaign.findUnique({
      where: { id },
    });
    if (!current) fail("No se encontró la campaña.", 404);
    const existing = current as NonNullable<typeof current>;
    const normalized = await validateAndNormalize(input, existing);
    if (normalized.active)
      await assertNoActiveOverlap(normalized.startsAt, normalized.endsAt, id);
    return storePrisma.storefrontCampaign.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.eyebrow !== undefined
          ? { eyebrow: input.eyebrow || null }
          : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.message !== undefined
          ? { message: input.message || null }
          : {}),
        ...(input.ctaLabel !== undefined
          ? { ctaLabel: input.ctaLabel || null }
          : {}),
        ...(input.ctaHref !== undefined
          ? { ctaHref: input.ctaHref || null }
          : {}),
        ...(input.theme !== undefined ? { theme: input.theme } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.couponId !== undefined ? { couponId: input.couponId } : {}),
        startsAt: normalized.startsAt,
        endsAt: normalized.endsAt,
      },
      include: { coupon: { select: couponSelection } },
    });
  },

  async delete(id: number) {
    const campaign = await storePrisma.storefrontCampaign.findUnique({
      where: { id },
    });
    if (!campaign) fail("No se encontró la campaña.", 404);
    return storePrisma.storefrontCampaign.delete({ where: { id } });
  },
};
