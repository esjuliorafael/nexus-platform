import assert from "node:assert/strict";
import test from "node:test";
import { getPairingCode, hasQrPayload } from "../src/services/evolution/evolution.client";

test("extracts pairing codes from Evolution direct and nested responses", () => {
  assert.equal(getPairingCode({ pairingCode: " AB12CD34 " }), "AB12CD34");
  assert.equal(getPairingCode({ data: { PairingCode: "ZX98CV76" } }), "ZX98CV76");
  assert.equal(getPairingCode({ qrcode: { pairingCode: "QW12ER34" } }), "QW12ER34");
});

test("does not confuse a QR payload with a pairing code", () => {
  assert.equal(hasQrPayload({ base64: "data:image/png;base64,..." }), true);
  assert.equal(getPairingCode({ base64: "data:image/png;base64,...", count: 1 }), null);
  assert.equal(hasQrPayload({ count: 1 }), false);
});
