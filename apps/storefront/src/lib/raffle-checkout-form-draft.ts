export type RaffleCheckoutStep = 0 | 1;
export type RaffleCheckoutPaymentMethod = 'TRANSFER' | 'MERCADOPAGO';

export interface RaffleCheckoutFormDraft {
  raffleId: number;
  customerName: string;
  customerPhone: string;
  customerState: string;
  marketingConsent: boolean;
  paymentMethod: RaffleCheckoutPaymentMethod;
  checkoutStep: RaffleCheckoutStep;
}

const key = (raffleId: number) => `nexus_raffle_checkout_form_draft_${raffleId}`;
const draftTtlMs = 7 * 24 * 60 * 60 * 1000;

interface StoredRaffleCheckoutFormDraft extends RaffleCheckoutFormDraft {
  savedAt?: number;
}

function readPersistedDraft(raffleId: number) {
  const draftKey = key(raffleId);
  const persistent = window.localStorage.getItem(draftKey);
  if (persistent) return persistent;

  const legacy = window.sessionStorage.getItem(draftKey);
  if (legacy) {
    try {
      window.localStorage.setItem(draftKey, legacy);
      window.sessionStorage.removeItem(draftKey);
    } catch {
      // Keep the legacy value available if persistent storage is unavailable.
    }
  }

  return legacy;
}

export function saveRaffleCheckoutFormDraft(draft: RaffleCheckoutFormDraft) {
  if (typeof window === 'undefined') return;
  const storedDraft: StoredRaffleCheckoutFormDraft = { ...draft, savedAt: Date.now() };
  try {
    window.localStorage.setItem(key(draft.raffleId), JSON.stringify(storedDraft));
  } catch {
    window.sessionStorage.setItem(key(draft.raffleId), JSON.stringify(storedDraft));
  }
}

export function getRaffleCheckoutFormDraft(raffleId: number): RaffleCheckoutFormDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = readPersistedDraft(raffleId);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredRaffleCheckoutFormDraft;
    if (draft.savedAt && draft.savedAt + draftTtlMs <= Date.now()) {
      clearRaffleCheckoutFormDraft(raffleId);
      return null;
    }
    if (!draft || draft.raffleId !== raffleId || ![0, 1].includes(draft.checkoutStep)) return null;
    if (draft.paymentMethod !== 'TRANSFER' && draft.paymentMethod !== 'MERCADOPAGO') return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearRaffleCheckoutFormDraft(raffleId: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key(raffleId));
  window.sessionStorage.removeItem(key(raffleId));
}
