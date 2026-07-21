import { PrismaClient, RaffleCouponDiscountType } from "@prisma/client-raffle";

export class RaffleCouponError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const normalizeCode = (code: string) => code.trim().toUpperCase();

export const raffleCouponService = {
  async validate(
    prisma: PrismaClient | any,
    input: { code: string; raffle: { id: number; ticketPrice: unknown }; ticketCount: number },
  ) {
    const code = normalizeCode(input.code);
    const coupon = await prisma.raffleCoupon.findUnique({ where: { code } });
    if (!coupon || !coupon.active) throw new RaffleCouponError("El cupón no está disponible.");

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw new RaffleCouponError("Este cupón todavía no está disponible.");
    if (coupon.expiresAt && coupon.expiresAt <= now) throw new RaffleCouponError("Este cupón ya venció.");
    if (coupon.raffleId && coupon.raffleId !== input.raffle.id) throw new RaffleCouponError("Este cupón no aplica para esta rifa.");
    if (coupon.minTickets && input.ticketCount < coupon.minTickets) {
      throw new RaffleCouponError(`Selecciona al menos ${coupon.minTickets} boleto${coupon.minTickets === 1 ? "" : "s"} para usar este cupón.`);
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new RaffleCouponError("Este cupón ya alcanzó su límite de uso.");
    }

    const subtotal = Number(input.raffle.ticketPrice) * input.ticketCount;
    const rawDiscount = coupon.discountType === RaffleCouponDiscountType.PERCENTAGE
      ? subtotal * (Number(coupon.discountValue) / 100)
      : Number(coupon.discountValue);
    const discountTotal = Math.min(subtotal, coupon.maxDiscount ? Math.min(rawDiscount, Number(coupon.maxDiscount)) : rawDiscount);

    return {
      coupon,
      code,
      subtotal,
      discountTotal: Number(discountTotal.toFixed(2)),
      total: Number((subtotal - discountTotal).toFixed(2)),
    };
  },

  async getAll(prisma: PrismaClient) {
    return prisma.raffleCoupon.findMany({
      include: { raffle: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(prisma: PrismaClient, input: any) {
    const code = normalizeCode(input.code);
    if (input.discountType === "PERCENTAGE" && input.discountValue > 100) {
      throw new RaffleCouponError("El descuento porcentual no puede superar 100%.");
    }
    if (input.raffleId) {
      const raffle = await prisma.raffle.findUnique({ where: { id: input.raffleId }, select: { id: true } });
      if (!raffle) throw new RaffleCouponError("La rifa seleccionada no existe.");
    }
    return prisma.raffleCoupon.create({ data: { ...input, code } });
  },

  async update(prisma: PrismaClient, id: number, input: any) {
    if (input.discountType === "PERCENTAGE" && input.discountValue > 100) {
      throw new RaffleCouponError("El descuento porcentual no puede superar 100%.");
    }
    if (input.raffleId) {
      const raffle = await prisma.raffle.findUnique({ where: { id: input.raffleId }, select: { id: true } });
      if (!raffle) throw new RaffleCouponError("La rifa seleccionada no existe.");
    }
    return prisma.raffleCoupon.update({ data: { ...input, ...(input.code ? { code: normalizeCode(input.code) } : {}) }, where: { id } });
  },
};
