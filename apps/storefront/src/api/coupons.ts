import client from "./client";

export interface CouponValidationItem {
  productId: number;
  quantity: number;
}

export interface CouponLineDiscount {
  productId: number;
  quantity: number;
  subtotal: number;
  discountTotal: number;
  discountedSubtotal: number;
}

export interface CouponValidationResponse {
  code: string;
  name?: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  scope: "ALL" | "ITEM" | "BIRD";
  birdPurpose: "COMBAT" | "BREEDING" | null;
  eligibleSubtotal: number;
  discountTotal: number;
  lineDiscounts: CouponLineDiscount[];
}

export const couponApi = {
  validate: (code: string, items: CouponValidationItem[]) =>
    client
      .post<CouponValidationResponse>("/store/coupons/validate", {
        code,
        items,
      })
      .then((res) => res.data),
};
