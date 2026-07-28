import assert from "node:assert/strict";
import test from "node:test";
import {
  getPaymentRecoveryDelayMs,
  isPaymentRecoveryEffective,
  isPaymentRecoveryServerEnabled,
  isPaymentRecoveryTenantEnabled,
} from "../src/services/payment-recovery.config";

test("payment recovery is disabled unless explicitly enabled", () => {
  assert.equal(isPaymentRecoveryServerEnabled(undefined), false);
  assert.equal(isPaymentRecoveryServerEnabled("false"), false);
  assert.equal(isPaymentRecoveryServerEnabled("TRUE"), false);
  assert.equal(isPaymentRecoveryServerEnabled("true"), true);
  assert.equal(isPaymentRecoveryTenantEnabled(undefined), false);
  assert.equal(isPaymentRecoveryTenantEnabled("0"), false);
  assert.equal(isPaymentRecoveryTenantEnabled("1"), true);
  assert.equal(isPaymentRecoveryTenantEnabled("true"), true);
});

test("payment recovery requires server, tenant and templates", () => {
  assert.equal(
    isPaymentRecoveryEffective({
      serverEnabled: true,
      tenantEnabled: true,
      templatesReady: true,
    }),
    true,
  );
  assert.equal(
    isPaymentRecoveryEffective({
      serverEnabled: false,
      tenantEnabled: true,
      templatesReady: true,
    }),
    false,
  );
  assert.equal(
    isPaymentRecoveryEffective({
      serverEnabled: true,
      tenantEnabled: false,
      templatesReady: true,
    }),
    false,
  );
  assert.equal(
    isPaymentRecoveryEffective({
      serverEnabled: true,
      tenantEnabled: true,
      templatesReady: false,
    }),
    false,
  );
});

test("payment recovery delay uses a safe default and rejects invalid values", () => {
  assert.equal(getPaymentRecoveryDelayMs(undefined), 90_000);
  assert.equal(getPaymentRecoveryDelayMs("15"), 15_000);
  assert.equal(getPaymentRecoveryDelayMs("-1"), 0);
  assert.equal(getPaymentRecoveryDelayMs("invalid"), 90_000);
});
