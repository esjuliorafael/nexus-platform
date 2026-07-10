import client from './client';

export interface StoreOrderResponse {
  id: number | string;
  total?: number | string;
  customerName?: string;
  deliveryType?: 'SHIPPING' | 'PICKUP';
  status?: string;
}

export const orderApi = {
  create: (data: any) => client.post<StoreOrderResponse>('/store/orders', data).then(res => res.data),
  cancelPaymentAttempt: (orderId: number, customerPhone: string) =>
    client.post<StoreOrderResponse>(`/store/orders/${orderId}/payment-attempt/cancel`, { customerPhone }).then(res => res.data),
};
