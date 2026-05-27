import client from './client';

export interface PaymentPreferenceResponse {
  init_point?: string;
}

export const paymentApi = {
  getPreference: async (orderId: number, isRaffle: boolean = false) => {
    const res = await client.post<PaymentPreferenceResponse>('/mp/preference', { orderId, isRaffle });
    return res.data;
  },
};
