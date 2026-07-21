import client from './client';

export interface RaffleCouponValidationResponse {
  code: string;
  name?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  subtotal: number;
  discountTotal: number;
  total: number;
}

export const raffleCouponApi = {
  validate: (code: string, raffleId: number, tickets: string[]) =>
    client.post<RaffleCouponValidationResponse>('/raffle-coupons/validate', { code, raffleId, tickets })
      .then((response) => response.data),
};
