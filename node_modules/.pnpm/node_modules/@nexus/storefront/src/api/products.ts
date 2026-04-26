import client from './client';
import { Product } from '../types';

export const productApi = {
  getAll: (params?: any) => client.get<Product[]>('/store/products', { params }).then(res => res.data),
  getById: (id: number) => client.get<Product>(`/store/products/${id}`).then(res => res.data),
};
