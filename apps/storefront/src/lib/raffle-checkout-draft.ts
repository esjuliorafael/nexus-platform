import type { RaffleCouponValidationResponse } from '../api/raffle-coupons';

export interface RaffleCheckoutDraft {
  raffleId: number;
  tickets: string[];
  coupon: RaffleCouponValidationResponse | null;
}

const key = 'nexus_raffle_checkout_draft';
const paymentAttemptKey = (raffleId: number) => `nexus_raffle_mp_payment_${raffleId}`;

export interface PendingRafflePaymentAttempt {
  paymentHoldId: string;
  expiresAt: string;
  customerName: string;
  customerPhone: string;
  customerState?: string;
}

export function saveRaffleCheckoutDraft(draft: RaffleCheckoutDraft) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(key, JSON.stringify(draft));
}

export function getRaffleCheckoutDraft(raffleId: number): RaffleCheckoutDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RaffleCheckoutDraft;
    return draft.raffleId === raffleId && draft.tickets.length > 0 ? draft : null;
  } catch {
    return null;
  }
}

export function clearRaffleCheckoutDraft() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(key);
}

export function savePendingRafflePaymentAttempt(raffleId: number, attempt: PendingRafflePaymentAttempt) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(paymentAttemptKey(raffleId), JSON.stringify(attempt));
}

export function getPendingRafflePaymentAttempt(raffleId: number): PendingRafflePaymentAttempt | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(paymentAttemptKey(raffleId));
    if (!raw) return null;
    const attempt = JSON.parse(raw) as PendingRafflePaymentAttempt;
    if (!attempt.paymentHoldId || !attempt.customerPhone || new Date(attempt.expiresAt).getTime() <= Date.now()) {
      clearPendingRafflePaymentAttempt(raffleId);
      return null;
    }
    return attempt;
  } catch {
    clearPendingRafflePaymentAttempt(raffleId);
    return null;
  }
}

export function clearPendingRafflePaymentAttempt(raffleId: number) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(paymentAttemptKey(raffleId));
}
