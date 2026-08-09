import client from './client';
import { Raffle, RaffleRecentResult, RaffleTicketAvailability } from '../types';

export interface RaffleReservationResponse {
  reserved: string[];
  reservationId: string;
  paymentExpiresAt: string | null;
  paymentMethod: 'TRANSFER' | 'MERCADOPAGO';
  paymentStatus?: 'PENDING' | 'PAID' | 'CANCELLED';
  subtotal: number;
  discountTotal: number;
  total: number;
  couponCode: string | null;
}

export interface RafflePaymentHoldResponse {
  paymentHoldId: string;
  expiresAt: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  tickets: string[];
}

export interface RaffleEarlyAccessResponse {
  accessToken: string;
  expiresAt: string | null;
}

export interface RaffleOpeningReminderResponse {
  success: boolean;
  alreadyRegistered: boolean;
  message: string;
}

export interface RaffleParticipationLookupResponse {
  accepted: boolean;
  message: string;
}

export interface RaffleParticipationLookupVerifyResponse {
  url: string;
  expiresAt: string | null;
}

export interface RaffleParticipationAccessResponse {
  participantName: string;
  raffle: {
    id: number;
    title: string;
    image: string | null;
    drawDate: string | null;
    opportunities: number;
    ticketPrice: number;
    prizes: Array<{ position: number; title: string; description: string }>;
  };
  participations: Array<{
    reference: string;
    status: string;
    paymentStatus: "PENDING" | "PAID" | "CANCELLED";
    paymentMethod: string | null;
    total: number;
    tickets: Array<{ number: string; opportunities: string[] }>;
  }>;
  expiresAt: string | null;
}

export const raffleApi = {
  getAll: () => client.get<Raffle[]>('/raffles').then(res => res.data),
  getCatalog: () => client.get<Raffle[]>('/raffles/catalog').then(res => res.data),
  getRecentResults: () => client.get<RaffleRecentResult[]>('/raffles/results/recent').then(res => res.data),
  getCatalogAvailabilityEventsUrl: () =>
    `${client.defaults.baseURL}/raffles/ticket-availability/events`,
  getById: (id: number) => client.get<Raffle>(`/raffles/${id}`).then(res => res.data),
  getParticipationAccess: (token: string) =>
    client
      .get<RaffleParticipationAccessResponse>(`/raffles/participations/${token}`, {
        headers: { "Cache-Control": "no-store" },
      })
      .then((res) => res.data),
  getOccupiedTickets: (id: number) => client.get<string[]>(`/raffles/${id}/occupied-tickets`).then(res => res.data),
  getTicketAvailability: (id: number) => client.get<RaffleTicketAvailability[]>(`/raffles/${id}/ticket-availability`).then(res => res.data),
  getTicketAvailabilityEventsUrl: (id: number) =>
    `${client.defaults.baseURL}/raffles/${id}/ticket-availability/events`,
  unlockEarlyAccess: (id: number, code: string) =>
    client.post<RaffleEarlyAccessResponse>(`/raffles/${id}/early-access`, { code }).then(res => res.data),
  requestOpeningReminder: (id: number, phone: string) =>
    client
      .post<RaffleOpeningReminderResponse>(`/raffles/${id}/opening-reminders`, { phone })
      .then(res => res.data),
  requestParticipationLookup: (id: number, phone: string) =>
    client.post<RaffleParticipationLookupResponse>(`/raffles/${id}/participation-lookup/request`, { phone }).then(res => res.data),
  verifyParticipationLookup: (id: number, phone: string, code: string) =>
    client.post<RaffleParticipationLookupVerifyResponse>(`/raffles/${id}/participation-lookup/verify`, { phone, code }).then(res => res.data),
  reserveTickets: (id: number, data: { 
    tickets: string[]; 
    customerName: string; 
    customerPhone: string; 
    customerState?: string; 
    paymentMethod?: 'TRANSFER' | 'MERCADOPAGO';
    couponCode?: string;
    earlyAccessToken?: string;
    marketingConsent?: boolean;
  }) => client.post<RaffleReservationResponse>(`/raffles/${id}/tickets`, data).then(res => res.data),
  createPaymentHold: (id: number, data: {
    tickets: string[];
    customerName: string;
    customerPhone: string;
    customerState?: string;
    couponCode?: string;
    earlyAccessToken?: string;
    marketingConsent?: boolean;
  }) => client.post<RafflePaymentHoldResponse>(`/raffles/${id}/payment-holds`, {
    ...data,
    paymentMethod: 'MERCADOPAGO',
  }).then(res => res.data),
  convertPaymentHoldToTransfer: (id: number, holdId: string, customerPhone: string) =>
    client.post<RaffleReservationResponse>(`/raffles/${id}/payment-holds/${holdId}/transfer`, {
      customerPhone,
    }).then(res => res.data),
};
