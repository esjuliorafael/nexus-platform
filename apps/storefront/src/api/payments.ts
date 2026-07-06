import client from './client';

export interface PaymentPreferenceResponse {
  init_point?: string;
}

export interface PublicPaymentChannel {
  id: number;
  name: string;
  purpose: string;
  bank: string;
  beneficiary: string;
  accountNumber?: string | null;
  clabe?: string | null;
  card?: string | null;
}

export const paymentApi = {
  getPreference: async (orderId: number, isRaffle: boolean = false) => {
    const res = await client.post<PaymentPreferenceResponse>('/mp/preference', { orderId, isRaffle });
    return res.data;
  },
  getChannels: async () => {
    const res = await client.get<PublicPaymentChannel[]>('/admin/payment-channels');
    return res.data;
  },
};
