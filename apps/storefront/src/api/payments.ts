import client from './client';

export interface PaymentPreferenceResponse {
  init_point?: string;
}

export interface MercadoPagoCheckoutConfig {
  mode: 'embedded' | 'redirect';
  publicKey: string | null;
}

export interface MercadoPagoCardFormData {
  paymentAttemptId?: string;
  token: string;
  issuer_id?: string;
  payment_method_id: string;
  installments: number;
  payer: {
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
}

export interface MercadoPagoCardPaymentResponse {
  attemptId: string;
  paymentId: string;
  referenceId: number | string;
  status: string;
  statusDetail?: string | null;
  outcome: 'approved' | 'processing' | 'rejected';
  retryable: boolean;
  uncertain: boolean;
  message?: string | null;
  threeDsInfo?: {
    externalResourceUrl: string;
    creq: string;
  } | null;
}

export interface MercadoPagoCardPaymentStatus {
  status: 'approved' | 'processing' | 'rejected' | 'ready' | 'unavailable';
  referenceId: number | string;
  statusDetail?: string | null;
  retryable?: boolean;
  uncertain?: boolean;
  message?: string | null;
}

export interface PublicBankInfo {
  source: 'SPECIALIZED' | 'MAIN';
  label: string;
  bank: string;
  beneficiary: string;
  accountNumber?: string | null;
  clabe?: string | null;
  card?: string | null;
}

export interface PublicPaymentOptions {
  requestedPurpose: 'MAIN' | 'COMBAT' | 'BREEDING' | 'RAFFLES';
  bank: PublicBankInfo | null;
  mercadoPago: {
    available: boolean;
    source: 'SPECIALIZED' | 'MAIN' | null;
  };
}

export const paymentApi = {
  getCheckoutConfig: async () => {
    const res = await client.get<MercadoPagoCheckoutConfig>('/mp/checkout-config');
    return res.data;
  },
  getPreference: async (orderId: number, isRaffle: boolean = false) => {
    const res = await client.post<PaymentPreferenceResponse>('/mp/preference', { orderId, isRaffle });
    return res.data;
  },
  getRafflePreference: async (raffleReservationId: string) => {
    const res = await client.post<PaymentPreferenceResponse>('/mp/preference', {
      isRaffle: true,
      raffleReservationId,
    });
    return res.data;
  },
  getOptions: async (purpose: PublicPaymentOptions['requestedPurpose'] = 'MAIN') => {
    const res = await client.get<PublicPaymentOptions>('/store/payment-options', {
      params: { purpose },
    });
    return res.data;
  },
  processOrderCardPayment: async (storePaymentHoldId: string, customerPhone: string, formData: MercadoPagoCardFormData) => {
    const res = await client.post<MercadoPagoCardPaymentResponse>('/mp/card-payment', {
      storePaymentHoldId,
      customerPhone,
      paymentAttemptId: formData.paymentAttemptId,
      token: formData.token,
      issuerId: formData.issuer_id,
      paymentMethodId: formData.payment_method_id,
      installments: formData.installments,
      payer: {
        email: formData.payer.email,
        identification: formData.payer.identification?.type && formData.payer.identification?.number
          ? formData.payer.identification
          : undefined,
      },
    });
    return res.data;
  },
  processRaffleCardPayment: async (rafflePaymentHoldId: string, customerPhone: string, formData: MercadoPagoCardFormData) => {
    const res = await client.post<MercadoPagoCardPaymentResponse>('/mp/card-payment', {
      rafflePaymentHoldId,
      customerPhone,
      paymentAttemptId: formData.paymentAttemptId,
      token: formData.token,
      issuerId: formData.issuer_id,
      paymentMethodId: formData.payment_method_id,
      installments: formData.installments,
      payer: {
        email: formData.payer.email,
        identification: formData.payer.identification?.type && formData.payer.identification?.number
          ? formData.payer.identification
          : undefined,
      },
    });
    return res.data;
  },
  getCardPaymentStatus: async (reference: {
    storePaymentHoldId?: string;
    rafflePaymentHoldId?: string;
    customerPhone: string;
  }) => {
    const res = await client.get<MercadoPagoCardPaymentStatus>('/mp/card-payment/status', { params: reference });
    return res.data;
  },
};
