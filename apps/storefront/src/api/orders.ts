import client from './client';

export const orderApi = {
  create: (data: any) => client.post('/store/orders', data).then(res => res.data),
};
