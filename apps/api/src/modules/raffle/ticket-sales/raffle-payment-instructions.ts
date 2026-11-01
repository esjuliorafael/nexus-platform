import { createHash } from "node:crypto";

export type RaffleReservationNoticeKind = "reservation" | "reservation-restored";

export type RafflePaymentInstructionSale = {
  customerPhone: string;
  paymentMethod: string | null;
  paymentStatus: string;
  origin: string;
};

export type RafflePaymentBankValues = {
  bank_account?: string | null;
  bank_clabe?: string | null;
  bank_card?: string | null;
};

const hasValue = (value?: string | null) =>
  Boolean(value?.trim() && value.trim().toUpperCase() !== "N/A");

export function shouldSendRafflePaymentInstructions(params: {
  kind: string;
  sales: RafflePaymentInstructionSale[];
  expectedSaleCount: number;
  recipientPhone: string;
  bankValues: RafflePaymentBankValues;
}) {
  if (
    params.kind !== "reservation" &&
    params.kind !== "reservation-restored"
  ) {
    return false;
  }
  if (
    params.expectedSaleCount < 1 ||
    params.sales.length !== params.expectedSaleCount
  ) {
    return false;
  }

  const recipientDigits = params.recipientPhone.replace(/\D/g, "");
  if (!recipientDigits) return false;

  const eligibleSales = params.sales.every((sale) =>
    sale.paymentStatus === "PENDING" &&
    sale.paymentMethod === "TRANSFER" &&
    sale.origin === "PARTICIPANT" &&
    sale.customerPhone.replace(/\D/g, "") === recipientDigits,
  );

  return (
    eligibleSales &&
    [
      params.bankValues.bank_account,
      params.bankValues.bank_clabe,
      params.bankValues.bank_card,
    ].some(hasValue)
  );
}

export function getRafflePaymentInstructionsJobId(sourceJobId: string) {
  const digest = createHash("sha256").update(sourceJobId).digest("hex").slice(0, 32);
  return `raffle-payment-instructions-${digest}`;
}
