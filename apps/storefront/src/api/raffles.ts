import client from './client';
import { Raffle } from '../types';

export const raffleApi = {
  getAll: () => client.get<Raffle[]>('/raffles').then(res => res.data),
  getById: (id: number) => client.get<Raffle>(`/raffles/${id}`).then(res => res.data),
  getOccupiedTickets: (id: number) => client.get<string[]>(`/raffles/${id}/occupied-tickets`).then(res => res.data),
  reserveTickets: (id: number, data: { 
    tickets: string[]; 
    customerName: string; 
    customerPhone: string; 
    customerState?: string; 
  }) => client.post(`/raffles/${id}/tickets`, data).then(res => res.data),
};
