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

export type StoreOrderAccessStatus =
  | 'PENDING'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface StoreOrderAccessResponse {
  customerName: string;
  order: {
    id: number;
    createdAt: string;
    status: StoreOrderAccessStatus;
    statusLabel: string;
    paymentMethod: string;
    paymentExpiresAt: string | null;
    delivery: {
      type: 'SHIPPING' | 'PICKUP';
      method: string | null;
      receiverName: string | null;
      address: string | null;
      street: string | null;
      neighborhood: string | null;
      postalCode: string | null;
      city: string | null;
      state: string | null;
    };
    totals: {
      subtotal: number;
      discountTotal: number;
      shippingCost: number;
      total: number;
    };
    items: Array<{
      id: number;
      productId: number;
      name: string;
      type: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  };
  bankInfo: {
    source: 'SPECIALIZED' | 'MAIN';
    label: string;
    bank: string;
    beneficiary: string;
    accountNumber: string | null;
    clabe: string | null;
    card: string | null;
  } | null;
  expiresAt: string | null;
}

export interface StorePaymentHoldResponse {
  paymentHoldId: string;
  expiresAt: string;
  total: number;
}

export const orderApi = {
  create: (data: any) => client.post<StoreOrderResponse>('/store/orders', data).then(res => res.data),
  getAccess: (token: string) =>
    client
      .get<StoreOrderAccessResponse>(`/store/orders/access/${encodeURIComponent(token)}?access_ts=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-store' },
      })
      .then((res) => res.data),
  createPaymentHold: (data: any) => client.post<StorePaymentHoldResponse>('/store/orders/payment-holds', data).then(res => res.data),
  convertPaymentHoldToTransfer: (holdId: string, customerPhone: string) =>
    client.post<StoreOrderResponse>(`/store/orders/payment-holds/${holdId}/transfer`, { customerPhone }).then(res => res.data),
  cancelPaymentAttempt: (orderId: number, customerPhone: string) =>
    client.post<StoreOrderResponse>(`/store/orders/${orderId}/payment-attempt/cancel`, { customerPhone }).then(res => res.data),
};
