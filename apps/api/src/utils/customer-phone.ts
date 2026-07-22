import { z } from "zod";

export const SUPPORTED_CUSTOMER_PHONE_COUNTRIES = {
  MX: { callingCode: "52", nationalLength: 10 },
  US: { callingCode: "1", nationalLength: 10 },
  GT: { callingCode: "502", nationalLength: 8 },
} as const;

export function normalizeCustomerPhone(value: string | null | undefined): string | null {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Compatibility with legacy Mexican WhatsApp identifiers using the mobile 521 prefix.
  if (digits.startsWith("521") && digits.length === 13) return `+52${digits.slice(3)}`;
  if (digits.startsWith("52") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("502") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;

  // Historical Nexus checkouts stored ten-digit Mexican numbers without a country code.
  if (!raw.startsWith("+") && digits.length === 10) return `+52${digits}`;

  return null;
}

export const customerPhoneSchema = z.string().trim().transform((value, context) => {
  const normalized = normalizeCustomerPhone(value);
  if (!normalized) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selecciona un país e ingresa un número de teléfono válido.",
    });
    return z.NEVER;
  }
  return normalized;
});

export function customerPhoneIdentity(value: string | null | undefined): string {
  return normalizeCustomerPhone(value) || String(value || "").replace(/\D/g, "");
}

export function customerPhoneCandidates(value: string): string[] {
  const normalized = normalizeCustomerPhone(value);
  if (!normalized) return [value];
  const digits = normalized.slice(1);
  const candidates = new Set([normalized, digits]);
  if (digits.startsWith("52") && digits.length === 12) {
    const nationalNumber = digits.slice(2);
    candidates.add(nationalNumber);
    candidates.add(`521${nationalNumber}`);
  }
  return Array.from(candidates);
}

export function toEvolutionPhoneNumber(value: string): string {
  const normalized = normalizeCustomerPhone(value);
  if (!normalized) {
    throw Object.assign(new Error("El número de WhatsApp no tiene un formato internacional válido."), {
      code: "INVALID_RECIPIENT_PHONE",
    });
  }

  const digits = normalized.slice(1);
  // Preserve the proven Evolution/Baileys addressing used by existing Mexican tenants.
  if (digits.startsWith("52") && digits.length === 12) return `521${digits.slice(2)}`;
  return digits;
}
