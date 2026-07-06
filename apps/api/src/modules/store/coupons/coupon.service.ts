import { storePrisma } from "@nexus/db/store";
import { ProductType } from "@prisma/client-store";

type CouponItemInput = {
  productId: number;
  quantity: number;
};

type CouponProduct = {
  id: number;
  name: string;
  type: ProductType;
  price: any;
};

const normalizeCode = (code: string) => code.trim().toUpperCase();

const createCouponError = (message: string, statusCode = 400) => {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
};

function isProductEligible(scope: string, productType: ProductType) {
  if (scope === "ALL") return true;
  return scope === productType;
}

function calculateEligibleSubtotal(items: CouponItemInput[], products: CouponProduct[], scope: string) {
  return items.reduce((total, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product || !isProductEligible(scope, product.type)) return total;
    return total + Number(product.price) * item.quantity;
  }, 0);
}

function calculateDiscount(coupon: any, eligibleSubtotal: number) {
  if (eligibleSubtotal <= 0) return 0;

  const discountValue = Number(coupon.discountValue);
  const rawDiscount = coupon.discountType === "PERCENTAGE"
    ? eligibleSubtotal * (discountValue / 100)
    : discountValue;
  const cappedBySubtotal = Math.min(rawDiscount, eligibleSubtotal);
  const maxDiscount = coupon.maxDiscount === null || coupon.maxDiscount === undefined
    ? cappedBySubtotal
    : Math.min(cappedBySubtotal, Number(coupon.maxDiscount));

  return Math.max(0, Math.round(maxDiscount * 100) / 100);
}

export async function validateCouponForItems(code: string, items: CouponItemInput[]) {
  const normalizedCode = normalizeCode(code);
  const now = new Date();

  const coupon = await storePrisma.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon || !coupon.active) {
    throw createCouponError("El cupón no existe o no está activo.", 404);
  }

  if (coupon.startsAt && coupon.startsAt > now) {
    throw createCouponError("El cupón todavía no está disponible.");
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw createCouponError("El cupón ya expiró.");
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw createCouponError("El cupón ya alcanzó su límite de uso.");
  }

  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const products = await storePrisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, type: true, price: true },
  });

  if (products.length !== productIds.length) {
    throw createCouponError("Uno o más productos del carrito no existen.");
  }

  const subtotal = items.reduce((total, item) => {
    const product = products.find((entry) => entry.id === item.productId)!;
    return total + Number(product.price) * item.quantity;
  }, 0);
  const eligibleSubtotal = calculateEligibleSubtotal(items, products, coupon.scope);

  if (coupon.minSubtotal !== null && subtotal < Number(coupon.minSubtotal)) {
    throw createCouponError(`El cupón requiere un subtotal mínimo de $${Number(coupon.minSubtotal).toFixed(2)}.`);
  }

  if (eligibleSubtotal <= 0) {
    throw createCouponError("El cupón no aplica para los productos seleccionados.");
  }

  const discountTotal = calculateDiscount(coupon, eligibleSubtotal);

  if (discountTotal <= 0) {
    throw createCouponError("El cupón no genera descuento para este pedido.");
  }

  return {
    coupon,
    code: coupon.code,
    name: coupon.name,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    scope: coupon.scope,
    eligibleSubtotal,
    discountTotal,
  };
}

export const couponService = {
  async validate(code: string, items: CouponItemInput[]) {
    const result = await validateCouponForItems(code, items);
    const { coupon: _coupon, ...publicResult } = result;
    return publicResult;
  },

  async getAll() {
    return storePrisma.coupon.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });
  },

  async create(data: any) {
    return storePrisma.coupon.create({
      data: {
        code: normalizeCode(data.code),
        name: data.name || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        scope: data.scope || "ALL",
        minSubtotal: data.minSubtotal ?? null,
        maxDiscount: data.maxDiscount ?? null,
        usageLimit: data.usageLimit ?? null,
        active: data.active ?? true,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  },

  async update(id: number, data: any) {
    return storePrisma.coupon.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: normalizeCode(data.code) } : {}),
        ...(data.name !== undefined ? { name: data.name || null } : {}),
        ...(data.discountType !== undefined ? { discountType: data.discountType } : {}),
        ...(data.discountValue !== undefined ? { discountValue: data.discountValue } : {}),
        ...(data.scope !== undefined ? { scope: data.scope } : {}),
        ...(data.minSubtotal !== undefined ? { minSubtotal: data.minSubtotal ?? null } : {}),
        ...(data.maxDiscount !== undefined ? { maxDiscount: data.maxDiscount ?? null } : {}),
        ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit ?? null } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.startsAt !== undefined ? { startsAt: data.startsAt ? new Date(data.startsAt) : null } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null } : {}),
      },
    });
  },

  async delete(id: number) {
    return storePrisma.coupon.delete({
      where: { id },
    });
  },
};
