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
};
