const DEFAULT_PAYMENT_RECOVERY_DELAY_SECONDS = 90;

export function isPaymentRecoveryServerEnabled(
  value = process.env.PAYMENT_RECOVERY_ENABLED,
) {
  return value === "true";
}

export function isPaymentRecoveryTenantEnabled(value?: string | null) {
  return value === "1" || value === "true";
}

export function isPaymentRecoveryEffective(input: {
  serverEnabled: boolean;
  tenantEnabled: boolean;
  templatesReady: boolean;
}) {
  return (
    input.serverEnabled &&
    input.tenantEnabled &&
    input.templatesReady
  );
}

export function getPaymentRecoveryDelayMs(
  value = process.env.PAYMENT_RECOVERY_DELAY_SECONDS,
) {
  const parsed = Number(value || DEFAULT_PAYMENT_RECOVERY_DELAY_SECONDS);
  const seconds = Number.isFinite(parsed)
    ? Math.max(0, parsed)
    : DEFAULT_PAYMENT_RECOVERY_DELAY_SECONDS;
  return seconds * 1_000;
}
