import type { CartCoupon } from "../../store/cart.store";
import { formatPrice } from "../../utils/formatters";

interface Props {
  productId: number;
  quantity: number;
  originalSubtotal: number;
  coupon: CartCoupon | null;
  tone?: "light" | "dark";
  align?: "start" | "end";
}

export function CouponAdjustedPrice({
  productId,
  quantity,
  originalSubtotal,
  coupon,
  tone = "light",
  align = "start",
}: Props) {
  const allocation = coupon?.lineDiscounts?.find(
    (line) => line.productId === productId && line.quantity === quantity,
  );
  const displayOriginalSubtotal = allocation?.subtotal ?? originalSubtotal;
  const discount = allocation
    ? Math.min(displayOriginalSubtotal, Math.max(0, allocation.discountTotal))
    : 0;
  const discountedSubtotal = allocation?.discountedSubtotal ?? displayOriginalSubtotal - discount;
  const isDark = tone === "dark";
  const alignment = align === "end" ? "items-end text-right" : "items-start text-left";

  return (
    <div className={`flex min-w-0 flex-col ${alignment}`} style={{ gap: "var(--sf-space-xs)" }}>
      <div
        className="flex min-w-0 flex-wrap items-baseline"
        style={{ columnGap: "var(--sf-space-xs)", rowGap: "var(--sf-space-xs)" }}
      >
        <span className={`sf-text-h2 tabular-nums font-black ${isDark ? "text-brand-400" : "text-brand-500"}`}>
          ${formatPrice(discountedSubtotal)}
        </span>
        {discount > 0 && coupon && (
          <>
            <del className={`sf-text-caption tabular-nums ${isDark ? "text-stone-500" : "text-stone-500"}`}>
              ${formatPrice(displayOriginalSubtotal)}
            </del>
            <span className={`sf-text-label font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
              {coupon.discountType === "PERCENTAGE"
                ? `−${coupon.discountValue}%`
                : `−$${formatPrice(discount)}`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
