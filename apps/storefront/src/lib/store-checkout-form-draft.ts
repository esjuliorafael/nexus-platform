export type StoreCheckoutStep = 0 | 1 | 2 | 3;
export type StoreCheckoutPaymentMethod = 'TRANSFER' | 'MERCADOPAGO';

export interface StoreCheckoutFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  receiverName: string;
  shippingAddress: string;
  shippingStreet: string;
  shippingNeighborhood: string;
  shippingPostalCode: string;
  shippingCity: string;
  shippingState: string;
  deliveryMethod: 'BUS_STATION' | 'AIRPORT' | 'PARCEL' | '';
  deliveryType: 'SHIPPING' | 'PICKUP';
}

export interface StoreCheckoutFormDraft {
  formData: StoreCheckoutFormData;
  someoneElseReceives: boolean;
  paymentMethod: StoreCheckoutPaymentMethod;
  checkoutStep: StoreCheckoutStep;
}

const key = 'nexus_store_checkout_form_draft';
const draftTtlMs = 7 * 24 * 60 * 60 * 1000;

interface StoredStoreCheckoutFormDraft extends StoreCheckoutFormDraft {
  savedAt?: number;
}

function readPersistedDraft() {
  const persistent = window.localStorage.getItem(key);
  if (persistent) return persistent;

  const legacy = window.sessionStorage.getItem(key);
  if (legacy) {
    try {
      window.localStorage.setItem(key, legacy);
      window.sessionStorage.removeItem(key);
    } catch {
      // Keep the legacy value available if persistent storage is unavailable.
    }
  }

  return legacy;
}

export function saveStoreCheckoutFormDraft(draft: StoreCheckoutFormDraft) {
  if (typeof window === 'undefined') return;
  const storedDraft: StoredStoreCheckoutFormDraft = { ...draft, savedAt: Date.now() };
  try {
    window.localStorage.setItem(key, JSON.stringify(storedDraft));
  } catch {
    window.sessionStorage.setItem(key, JSON.stringify(storedDraft));
  }
}

export function getStoreCheckoutFormDraft(): StoreCheckoutFormDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = readPersistedDraft();
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredStoreCheckoutFormDraft;
    if (draft.savedAt && draft.savedAt + draftTtlMs <= Date.now()) {
      clearStoreCheckoutFormDraft();
      return null;
    }
    if (!draft?.formData || !Array.from([0, 1, 2, 3] as const).includes(draft.checkoutStep)) return null;
    if (draft.paymentMethod !== 'TRANSFER' && draft.paymentMethod !== 'MERCADOPAGO') return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearStoreCheckoutFormDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}
