import { create } from 'zustand';
import { RaffleCouponValidationResponse } from '../api/raffle-coupons';
import { RaffleOpportunity } from '../types';

interface OpenRaffleSelectionPayload {
  raffleId: number;
  selectedTickets: string[];
  ticketOpportunities: RaffleOpportunity[];
  ticketPrice: number | string;
  coupon: RaffleCouponValidationResponse | null;
  onSelectedTicketsChange: (tickets: string[]) => void;
  onCouponChange: (coupon: RaffleCouponValidationResponse | null) => void;
}

interface RaffleSelectionUiState {
  isOpen: boolean;
  isContinuing: boolean;
  raffleId: number | null;
  selectedTickets: string[];
  ticketOpportunities: RaffleOpportunity[];
  ticketPrice: number | string;
  coupon: RaffleCouponValidationResponse | null;
  onSelectedTicketsChange: ((tickets: string[]) => void) | null;
  onCouponChange: ((coupon: RaffleCouponValidationResponse | null) => void) | null;
  openSelection: (payload: OpenRaffleSelectionPayload) => void;
  syncSelection: (raffleId: number, selectedTickets: string[], coupon: RaffleCouponValidationResponse | null) => void;
  updateSelectedTickets: (tickets: string[]) => void;
  updateCoupon: (coupon: RaffleCouponValidationResponse | null) => void;
  closeSelection: () => void;
  setContinuing: (isContinuing: boolean) => void;
}

export const useRaffleSelectionUiStore = create<RaffleSelectionUiState>((set, get) => ({
  isOpen: false,
  isContinuing: false,
  raffleId: null,
  selectedTickets: [],
  ticketOpportunities: [],
  ticketPrice: 0,
  coupon: null,
  onSelectedTicketsChange: null,
  onCouponChange: null,
  openSelection: (payload) => set({
    ...payload,
    isOpen: true,
    isContinuing: false,
  }),
  syncSelection: (raffleId, selectedTickets, coupon) => set((state) => (
    state.isOpen && state.raffleId === raffleId
      ? { selectedTickets, coupon }
      : state
  )),
  updateSelectedTickets: (selectedTickets) => {
    const onSelectedTicketsChange = get().onSelectedTicketsChange;
    set({ selectedTickets });
    onSelectedTicketsChange?.(selectedTickets);
  },
  updateCoupon: (coupon) => {
    const onCouponChange = get().onCouponChange;
    set({ coupon });
    onCouponChange?.(coupon);
  },
  closeSelection: () => set({ isOpen: false }),
  setContinuing: (isContinuing) => set({ isContinuing }),
}));
