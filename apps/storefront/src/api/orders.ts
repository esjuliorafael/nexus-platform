import client from './client';

export interface StoreOrderResponse {
  id: number | string;
  total?: number | string;
  customerName?: string;
  deliveryType?: 'SHIPPING' | 'PICKUP';
  status?: string;
  paymentMethod?: 'TRANSFER' | 'MERCADOPAGO';
  paymentExpiresAt?: string | null;
  expiresAt?: string | null;
}

export interface StorePaymentHoldResponse {
  paymentHoldId: string;
  expiresAt: string;
  total: number;
}

export const orderApi = {
  create: (data: any) => client.post<StoreOrderResponse>('/store/orders', data).then(res => res.data),
  createPaymentHold: (data: any) => client.post<StorePaymentHoldResponse>('/store/orders/payment-holds', data).then(res => res.data),
  convertPaymentHoldToTransfer: (holdId: string, customerPhone: string) =>
    client.post<StoreOrderResponse>(`/store/orders/payment-holds/${holdId}/transfer`, { customerPhone }).then(res => res.data),
  cancelPaymentAttempt: (orderId: number, customerPhone: string) =>
    client.post<StoreOrderResponse>(`/store/orders/${orderId}/payment-attempt/cancel`, { customerPhone }).then(res => res.data),
};
