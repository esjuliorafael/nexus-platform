export const PAYMENT_HOLD_MIN_MINUTES = 5;
export const PAYMENT_HOLD_MAX_MINUTES = 60;
export const PAYMENT_HOLD_DEFAULT_MINUTES = 30;
export const PAYMENT_RECONCILIATION_INTERVAL_MS = 10 * 60_000;

const DEFAULT_PROCESSING_LIMIT_MINUTES = 120;
const MIN_PROCESSING_LIMIT_MINUTES = 60;
const MAX_PROCESSING_LIMIT_MINUTES = 24 * 60;

const clampInteger = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(parsed)));
};

export const resolvePaymentHoldMinutes = (value: unknown) =>
  clampInteger(
    value,
    PAYMENT_HOLD_DEFAULT_MINUTES,
    PAYMENT_HOLD_MIN_MINUTES,
    PAYMENT_HOLD_MAX_MINUTES,
  );

export const getPaymentProcessingLimitMs = () =>
  clampInteger(
    process.env.MP_PAYMENT_PROCESSING_MAX_MINUTES,
    DEFAULT_PROCESSING_LIMIT_MINUTES,
    MIN_PROCESSING_LIMIT_MINUTES,
    MAX_PROCESSING_LIMIT_MINUTES,
  ) * 60_000;

export const hasReachedPaymentProcessingLimit = (createdAt: Date, now = Date.now()) =>
  now >= createdAt.getTime() + getPaymentProcessingLimitMs();

type PaymentHoldConversionSnapshot = {
  status: string;
  mpPaymentId?: string | null;
  mpPaymentStatus?: string | null;
};

type PaymentHoldInventorySnapshot = PaymentHoldConversionSnapshot & {
  promotedReferenceId?: string | number | null;
};

const TERMINAL_NON_APPROVED_PAYMENT_STATUSES = new Set([
  "rejected",
  "cancelled",
  "converted_to_transfer",
]);

export const isPaymentHoldAmbiguous = (hold: PaymentHoldConversionSnapshot) => {
  const paymentStatus = hold.mpPaymentStatus || "";
  return hold.status === "PROCESSING"
    || ["processing", "pending", "in_process", "authorized", "approved"].includes(paymentStatus)
    || (Boolean(hold.mpPaymentId) && !TERMINAL_NON_APPROVED_PAYMENT_STATUSES.has(paymentStatus));
};

export const canConvertPaymentHoldToTransfer = (hold: PaymentHoldConversionSnapshot) =>
  hold.status === "ACTIVE" && !isPaymentHoldAmbiguous(hold);

export const isPaymentHoldInventoryProtected = (hold: PaymentHoldInventorySnapshot) =>
  hold.status === "CONSUMED"
  || Boolean(hold.promotedReferenceId)
  || hold.mpPaymentStatus === "approved";
