"use client";

import type { Product } from "../../types";
import { formatPrice } from "../../utils/formatters";
import { useStorefrontCampaign } from "./StorefrontCampaignContext";

interface Props {
  product: Product;
  className?: string;
  priceClassName?: string;
  oldPriceClassName?: string;
  discountClassName?: string;
  couponClassName?: string;
}

export function CampaignProductPrice({
  product,
  className = "",
  priceClassName = "",
  oldPriceClassName = "",
  discountClassName = "",
  couponClassName = "sf-text-caption font-medium text-stone-600",
}: Props) {
  const { campaign } = useStorefrontCampaign();
  const coupon = campaign?.coupon;
  const scopeMatches =
    coupon?.scope === "ALL" ||
    (coupon?.scope === "BIRD" && product.type === "BIRD") ||
    (coupon?.scope === "ITEM" && product.type === "ITEM");
  const purposeMatches =
    !coupon?.birdPurpose ||
    product.type !== "BIRD" ||
    product.purpose === coupon.birdPurpose;
  const eligible = Boolean(
    campaign && coupon && scopeMatches && purposeMatches,
  );

  if (!eligible || !coupon) {
    return (
      <span className={priceClassName}>${formatPrice(product.price)}</span>
    );
  }

  const originalPrice = Number(product.price);
  const promotionalPrice =
    Math.round(
      (originalPrice * (1 - coupon.discountValue / 100) + Number.EPSILON) * 100,
    ) / 100;

  return (
    <span
      className={`inline-flex max-w-full flex-col items-start ${className}`}
      style={{ rowGap: "var(--sf-space-xs)" }}
    >
      <span
        className="inline-flex max-w-full flex-wrap items-baseline"
        style={{ columnGap: "var(--sf-space-xs)", rowGap: "2px" }}
      >
        <span className={priceClassName}>${formatPrice(promotionalPrice)}</span>
        <span
          className={
            oldPriceClassName ||
            "sf-text-caption font-medium text-stone-500 line-through"
          }
        >
          <span className="sr-only">Precio regular </span>$
          {formatPrice(originalPrice)}
        </span>
        <span
          className={
            discountClassName || "sf-text-label font-bold text-emerald-700"
          }
        >
          -{coupon.discountValue}%
        </span>
      </span>
      <span className={couponClassName} style={{ lineHeight: 1.25 }}>
        Con cupón {coupon.code}
      </span>
    </span>
  );
}
