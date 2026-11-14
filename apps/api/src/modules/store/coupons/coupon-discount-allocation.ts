export interface CouponDiscountAllocationInput {
  productId: number;
  quantity: number;
  subtotal: number;
  eligible: boolean;
}

export interface CouponLineDiscount {
  productId: number;
  quantity: number;
  subtotal: number;
  discountTotal: number;
  discountedSubtotal: number;
}

const toCents = (amount: number) => Math.round((amount + Number.EPSILON) * 100);
const fromCents = (amount: number) => amount / 100;

export function allocateCouponDiscount(
  discountTotal: number,
  lines: CouponDiscountAllocationInput[],
): CouponLineDiscount[] {
  const allocations = lines.map((line, index) => ({
    ...line,
    index,
    subtotalCents: Math.max(0, toCents(line.subtotal)),
    discountCents: 0,
    remainder: 0,
  }));
  const eligibleSubtotalCents = allocations.reduce(
    (sum, line) => sum + (line.eligible ? line.subtotalCents : 0),
    0,
  );
  const totalDiscountCents = Math.min(
    eligibleSubtotalCents,
    Math.max(0, toCents(discountTotal)),
  );

  if (eligibleSubtotalCents > 0 && totalDiscountCents > 0) {
    let allocatedCents = 0;
    for (const line of allocations) {
      if (!line.eligible || line.subtotalCents === 0) continue;
      const exactShare =
        (totalDiscountCents * line.subtotalCents) / eligibleSubtotalCents;
      line.discountCents = Math.floor(exactShare);
      line.remainder = exactShare - line.discountCents;
      allocatedCents += line.discountCents;
    }

    const remainderOrder = allocations
      .filter((line) => line.eligible && line.discountCents < line.subtotalCents)
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

    for (let centsLeft = totalDiscountCents - allocatedCents, index = 0;
      centsLeft > 0 && remainderOrder.length > 0;
      centsLeft--, index++
    ) {
      remainderOrder[index % remainderOrder.length].discountCents++;
    }
  }

  return allocations.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    subtotal: fromCents(line.subtotalCents),
    discountTotal: fromCents(line.discountCents),
    discountedSubtotal: fromCents(line.subtotalCents - line.discountCents),
  }));
}
