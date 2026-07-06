import client from './client';

export interface CouponValidationItem {
  productId: number;
  quantity: number;
}

export interface CouponValidationResponse {
  code: string;
  name?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  scope: 'ALL' | 'ITEM' | 'BIRD';
  eligibleSubtotal: number;
  discountTotal: number;
}

export const couponApi = {
  validate: (code: string, items: CouponValidationItem[]) =>
    client
      .post<CouponValidationResponse>('/store/coupons/validate', { code, items })
      .then((res) => res.data),
};
