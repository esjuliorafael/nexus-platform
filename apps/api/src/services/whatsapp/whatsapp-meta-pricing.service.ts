import { normalizeCustomerPhone } from "../../utils/customer-phone";

export type MetaMessageCategory = "UTILITY" | "MARKETING";
export type MetaRecipientMarket = "MX" | "US" | "GT" | "UNKNOWN";

export const META_RATE_CARD_VERSION = "2026-08-03";

const META_REFERENCE_RATES_MXN: Partial<
  Record<Exclude<MetaRecipientMarket, "UNKNOWN">, Partial<Record<MetaMessageCategory, number>>>
> = {
  // Meta rate card in MXN, verified on 2026-08-03.
  MX: { UTILITY: 0.1565, MARKETING: 0.5614 },
  US: { UTILITY: 0.0626, MARKETING: 0.4602 },
  // Guatemala uses Meta's regional "Rest of Latin America" market.
  GT: { UTILITY: 0.208, MARKETING: 1.362 },
};

export function getMetaRecipientMarket(phone: string): MetaRecipientMarket {
  const normalized = normalizeCustomerPhone(phone);
  if (!normalized) return "UNKNOWN";
  if (normalized.startsWith("+502")) return "GT";
  if (normalized.startsWith("+52")) return "MX";
  if (normalized.startsWith("+1")) return "US";
  return "UNKNOWN";
}

export function getMetaRateMxn(
  market: MetaRecipientMarket,
  category: MetaMessageCategory,
) {
  return market === "UNKNOWN"
    ? null
    : META_REFERENCE_RATES_MXN[market]?.[category] ?? null;
}

