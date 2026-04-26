import client from './client';
import { Raffle } from '../types';

export const raffleApi = {
  getAll: () => client.get<Raffle[]>('/raffle/raffles').then(res => res.data),
  getById: (id: number) => client.get<Raffle>(`/raffle/raffles/${id}`).then(res => res.data),
};
