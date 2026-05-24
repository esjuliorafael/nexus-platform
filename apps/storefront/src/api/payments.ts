import client from './client';

export const paymentApi = {
  getPreference: async (orderId: number, isRaffle: boolean = false) => {
    const res = await client.post('/mp/preference', { orderId, isRaffle });
    return res.data;
  },
};
