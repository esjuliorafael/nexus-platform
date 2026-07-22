export type CustomerPhoneCountry = "MX" | "US" | "GT";

export const CUSTOMER_PHONE_COUNTRIES = {
  MX: { callingCode: "52", nationalLength: 10, placeholder: "10 dígitos" },
  US: { callingCode: "1", nationalLength: 10, placeholder: "10 dígitos" },
  GT: { callingCode: "502", nationalLength: 8, placeholder: "8 dígitos" },
} as const;

export const CUSTOMER_PHONE_COUNTRY_ORDER: CustomerPhoneCountry[] = ["MX", "US", "GT"];

export function parseCustomerPhone(value: string | null | undefined, fallback: CustomerPhoneCountry = "MX") {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("521") && digits.length === 13) return { country: "MX" as const, nationalNumber: digits.slice(3) };
  if (digits.startsWith("502") && digits.length === 11) return { country: "GT" as const, nationalNumber: digits.slice(3) };
  if (digits.startsWith("52") && digits.length === 12) return { country: "MX" as const, nationalNumber: digits.slice(2) };
  if (digits.startsWith("1") && digits.length === 11) return { country: "US" as const, nationalNumber: digits.slice(1) };
  if (!raw.startsWith("+") && digits.length <= CUSTOMER_PHONE_COUNTRIES[fallback].nationalLength) {
    return { country: fallback, nationalNumber: digits };
  }
  return { country: fallback, nationalNumber: "" };
}

export function buildCustomerPhone(country: CustomerPhoneCountry, value: string) {
  const config = CUSTOMER_PHONE_COUNTRIES[country];
  const digits = value.replace(/\D/g, "").slice(0, config.nationalLength);
  return digits ? `+${config.callingCode}${digits}` : "";
}

export function isCustomerPhoneComplete(value: string | null | undefined) {
  const parsed = parseCustomerPhone(value);
  return parsed.nationalNumber.length === CUSTOMER_PHONE_COUNTRIES[parsed.country].nationalLength;
}
