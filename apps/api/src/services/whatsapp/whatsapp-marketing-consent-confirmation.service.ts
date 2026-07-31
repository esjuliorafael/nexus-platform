import { storePrisma } from "@nexus/db/store";
import { normalizeCustomerPhone } from "../../utils/customer-phone";
import { getEvolutionConfigFromSettings } from "../evolution/evolution.config";
import { getKapsoConfigForChannel } from "../kapso/kapso.config";
import { sendWhatsappAndLog } from "./whatsapp-send.service";

type ConsentConfirmationKind = "GRANTED" | "OPTED_OUT";
type ConsentProvider =
  | { provider: "EVOLUTION"; instanceName: string }
  | { provider: "KAPSO"; phoneNumberId: string };

const TEMPLATE_KEYS: Record<ConsentConfirmationKind, string> = {
  GRANTED: "whatsapp_global_marketing_subscribed",
  OPTED_OUT: "whatsapp_global_marketing_unsubscribed",
};

const DEFAULT_TEMPLATES: Record<ConsentConfirmationKind, string> = {
  GRANTED:
    "¡Hola, {{customer_name}}! 🎟️\n\nListo. Recibirás invitaciones y novedades por este WhatsApp.\n\nPuedes responder BAJA cuando quieras.",
  OPTED_OUT:
    "¡Hola, {{customer_name}}!\n\nListo. Ya no recibirás invitaciones ni novedades por este WhatsApp.\n\nPuedes responder ALTA si deseas volver a activarlas.",
};

const renderConsentTemplate = (template: string, customerName: string | null) => {
  const name = customerName?.trim() || "";
  const rendered = template.replace(/{{customer_name}}/g, name);
  return name
    ? rendered
    : rendered.replace(/¡Hola,\s*!/g, "¡Hola!");
};

export async function sendMarketingConsentConfirmation(input: {
  recipientPhone: string;
  kind: ConsentConfirmationKind;
  transport: ConsentProvider;
  inboundMessageId: string;
}) {
  const setting = await storePrisma.setting.upsert({
    where: { key: TEMPLATE_KEYS[input.kind] },
    create: {
      key: TEMPLATE_KEYS[input.kind],
      value: DEFAULT_TEMPLATES[input.kind],
    },
    update: {},
    select: { value: true },
  });
  const text = setting.value?.trim();
  if (!text) return;
  const normalizedPhone = normalizeCustomerPhone(input.recipientPhone);
  const preference = normalizedPhone
    ? await storePrisma.whatsappMarketingPreference.findUnique({
        where: { phone: normalizedPhone },
        select: { displayName: true },
      })
    : null;
  const renderedText = renderConsentTemplate(text, preference?.displayName || null);
  const templateName =
    input.kind === "GRANTED" ? "marketing_subscribed" : "marketing_unsubscribed";

  if (input.transport.provider === "EVOLUTION") {
    const config = await getEvolutionConfigFromSettings();
    if (!config.baseUrl || !config.apiKey || !input.transport.instanceName) return;
    await sendWhatsappAndLog({
      transport: {
        provider: "EVOLUTION",
        instance: { ...config, instanceName: input.transport.instanceName },
      },
      recipientPhone: input.recipientPhone,
      message: { text: renderedText },
      templateName,
      routing: { route: "DIRECT", policyClass: "OPERATIONAL", providerPriority: ["EVOLUTION"] },
    });
    return;
  }

  const config = getKapsoConfigForChannel({
    phoneNumberId: input.transport.phoneNumberId,
  });
  if (!config) return;
  await sendWhatsappAndLog({
    transport: { provider: "KAPSO", config },
    recipientPhone: input.recipientPhone,
    message: { text: renderedText },
    templateName,
    routing: { route: "DIRECT", policyClass: "OPERATIONAL", providerPriority: ["KAPSO"] },
  });
}
