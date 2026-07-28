import assert from "node:assert/strict";
import test from "node:test";
import { whatsappChannelSchema } from "../src/modules/store/shared.schema";

const baseChannel = {
  name: "Canal de Rifas",
  purpose: "RAFFLES",
  phone: "+522218626379",
};

test("existing channel payloads remain Evolution channels by default", () => {
  const result = whatsappChannelSchema.parse({
    ...baseChannel,
    instanceName: "tenant_main_raffles",
  });

  assert.equal(result.provider, "EVOLUTION");
  assert.equal(result.instanceName, "tenant_main_raffles");
});

test("Kapso channels require both Meta identifiers and no Evolution instance", () => {
  const invalid = whatsappChannelSchema.safeParse({
    ...baseChannel,
    provider: "KAPSO",
  });
  assert.equal(invalid.success, false);

  const valid = whatsappChannelSchema.parse({
    ...baseChannel,
    provider: "KAPSO",
    kapsoPhoneNumberId: "1163292596877250",
    kapsoBusinessAccountId: "1386130106746750",
  });

  assert.equal(valid.provider, "KAPSO");
  assert.equal(valid.instanceName, undefined);
});
