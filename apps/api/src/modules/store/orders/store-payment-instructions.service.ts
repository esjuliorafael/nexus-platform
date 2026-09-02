import { storePrisma } from "@nexus/db/store";
import type { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import { customerPhoneCandidates, normalizeCustomerPhone } from "../../../utils/customer-phone";
import type { ChannelConfig } from "../../../services/evolution/channel.resolver";
import type { WhatsappTransport } from "../../../services/whatsapp/whatsapp-provider.types";
import {
  buildCanonicalCloudTemplateSources,
  getCanonicalCloudTemplateSettingKey,
} from "../../../services/whatsapp/whatsapp-cloud-template.service";
import {
  sendBusinessWhatsappNotification,
  type PrincipalWhatsappConfig,
} from "../../../services/whatsapp/whatsapp-business-delivery.service";
import { sendWhatsappAndLog } from "../../../services/whatsapp/whatsapp-send.service";
import {
  createStoreOrderAccess,
  getStoreBankInfo,
  type StoreBankInfo,
} from "./store-order-access.service";

const PAYMENT_COMMAND = /^PAGOS(?:\s*#?\s*(\d+))?$/;

type StorePaymentOrder = {
  id: number;
  customerName: string;
  total: unknown;
  paymentMethod: string;
  expiresAt: Date | null;
  items: Array<{ productId: number; productType: string }>;
};

export type StorePaymentInstructions = {
  order: StorePaymentOrder;
  phone: string;
  bankInfo: StoreBankInfo;
  values: Record<string, string>;
};

export type StoreWhatsappAssistantResult = {
  handled: boolean;
  reply: string | null;
  paymentInstructions?: StorePaymentInstructions;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const formatRemainingTime = (expiresAt: Date | null) => {
  if (!expiresAt) return "hasta que finalice el apartado";

  const remainingMs = Math.max(0, expiresAt.getTime() - Date.now());
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  if (totalMinutes < 60) {
    return `${totalMinutes} minuto${totalMinutes === 1 ? "" : "s"}`;
  }

  const totalHours = Math.ceil(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours} hora${totalHours === 1 ? "" : "s"}`;
  }

  const totalDays = Math.ceil(totalHours / 24);
  return `${totalDays} día${totalDays === 1 ? "" : "s"}`;
};

const formatAmount = (value: unknown) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const renderTemplate = (content: string, values: Record<string, string>) =>
  content.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (_, key) => values[key] ?? "");

function paymentCommand(value: string) {
  const match = PAYMENT_COMMAND.exec(normalizeText(value));
  return match ? { orderId: match[1] ? Number(match[1]) : null } : null;
}

async function findPendingOrders(
  prisma: StorePrismaClient,
  phone: string,
): Promise<StorePaymentOrder[]> {
  const now = new Date();
  return prisma.order.findMany({
    where: {
      customerPhone: { in: customerPhoneCandidates(phone) },
      status: "PENDING",
      paymentStatus: "PENDING",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerName: true,
      total: true,
      paymentMethod: true,
      expiresAt: true,
      items: { select: { productId: true, productType: true } },
    },
  }) as Promise<StorePaymentOrder[]>;
}

function noPendingOrderReply() {
  return "No encontramos una orden pendiente de pago asociada a este número. Verifica que escribas desde el mismo WhatsApp utilizado al apartar. ℹ️";
}

export async function handleStoreWhatsappMessage(params: {
  storePrisma: StorePrismaClient;
  phone: string;
  text: string;
}): Promise<StoreWhatsappAssistantResult> {
  const phone = normalizeCustomerPhone(params.phone);
  const command = paymentCommand(params.text);
  if (!phone || !command) {
    return { handled: false, reply: null };
  }

  const orders = await findPendingOrders(params.storePrisma, phone);
  if (orders.length === 0) {
    return { handled: true, reply: noPendingOrderReply() };
  }

  const order = command.orderId
    ? orders.find((candidate) => candidate.id === command.orderId)
    : orders.length === 1
      ? orders[0]
      : null;

  if (!order) {
    if (command.orderId) {
      return {
        handled: true,
        reply: `No encontramos una orden pendiente de pago con el número #${command.orderId} asociada a este WhatsApp. ℹ️`,
      };
    }

    return {
      handled: true,
      reply: `Encontramos varias órdenes pendientes de pago: ${orders
        .slice(0, 5)
        .map((candidate) => `#${candidate.id}`)
        .join(", ")}. Responde PAGOS <número de orden> para recibir la información correspondiente. ℹ️`,
    };
  }

  if (String(order.paymentMethod).toUpperCase() === "MERCADOPAGO") {
    return {
      handled: true,
      reply: `La orden #${order.id} está configurada para pago con tarjeta. Completa el pago desde el botón Ver orden del mensaje de tu apartado. 💳`,
    };
  }

  const bankInfo = await getStoreBankInfo(order.items);
  if (!bankInfo) {
    return {
      handled: true,
      reply: "No pudimos recuperar la información bancaria en este momento. Escríbenos nuevamente más tarde. ⚠️",
    };
  }

  let access: Awaited<ReturnType<typeof createStoreOrderAccess>>;
  try {
    access = await createStoreOrderAccess({ orderId: order.id, phone });
  } catch {
    return {
      handled: true,
      reply: "No pudimos preparar el acceso privado de tu orden en este momento. Escríbenos nuevamente más tarde. ⚠️",
    };
  }

  return {
    handled: true,
    reply: null,
    paymentInstructions: {
      order,
      phone,
      bankInfo,
      values: {
        order_id: String(order.id),
        amount: formatAmount(order.total),
        bank_name: bankInfo.bank || "",
        bank_beneficiary: bankInfo.beneficiary || "",
        bank_account: bankInfo.accountNumber || "",
        bank_clabe: bankInfo.clabe || "",
        bank_card: bankInfo.card || "",
        time_store: formatRemainingTime(order.expiresAt),
        order_url: access.url,
      },
    },
  };
}

async function getPaymentInstructionsTemplate() {
  const key = getCanonicalCloudTemplateSettingKey(
    "STORE",
    "PAYMENT_INSTRUCTIONS",
  );
  if (!key) return { sourceContent: "", legacySourceContent: "" };

  const settings = await storePrisma.setting.findMany({
    where: { key: { in: [key, `${key}_simplified`] } },
    select: { key: true, value: true },
  });
  const values = Object.fromEntries(
    settings.map((setting) => [setting.key, setting.value || ""]),
  );
  const simplified = buildCanonicalCloudTemplateSources(
    values,
    ["STORE"],
    "SIMPLIFIED",
  ).find((source) => source.type === "PAYMENT_INSTRUCTIONS")?.content || "";
  const legacy = values[key] || "";
  return {
    sourceContent: legacy || simplified,
    legacySourceContent: legacy || simplified,
  };
}

export async function sendStorePaymentInstructions(params: {
  paymentInstructions: StorePaymentInstructions;
  preferredChannel?: ChannelConfig | null;
  principal: PrincipalWhatsappConfig;
  fallbackTransport: WhatsappTransport;
  kapsoEnabled?: boolean;
}) {
  const template = await getPaymentInstructionsTemplate();
  const values = params.paymentInstructions.values;
  const renderedText = renderTemplate(template.sourceContent, values);
  let sent = false;
  try {
    sent = await sendBusinessWhatsappNotification({
      preferredChannel: params.preferredChannel,
      principal: params.principal,
      scope: "STORE",
      type: "PAYMENT_INSTRUCTIONS",
      sourceContent: template.sourceContent,
      legacySourceContent: template.legacySourceContent,
      renderedText,
      principalSourceContent: template.sourceContent,
      principalLegacySourceContent: template.legacySourceContent,
      principalRenderedText: renderedText,
      values,
      recipientPhone: params.paymentInstructions.phone,
      templateName: "store_payment_instructions",
      orderId: String(params.paymentInstructions.order.id),
      kapsoEnabled: params.kapsoEnabled,
    });
  } catch (error: any) {
    console.error(
      "[Store payment instructions] business delivery failed:",
      error?.message || error,
    );
  }

  if (!sent) {
    try {
      await sendWhatsappAndLog({
        transport: params.fallbackTransport,
        recipientPhone: params.paymentInstructions.phone,
        message: { text: renderedText },
        templateName: "store_payment_instructions_fallback",
        orderId: String(params.paymentInstructions.order.id),
        routing: {
          route: "DIRECT",
          preferredInstanceName: params.preferredChannel?.name,
          policyClass: "OPERATIONAL",
          providerPriority: [params.fallbackTransport.provider],
          fallbackReason:
            "La plantilla aprobada no estaba disponible; se envió el contenido operativo como respuesta directa.",
        },
      });
    } catch (error: any) {
      console.error(
        "[Store payment instructions] direct fallback failed:",
        error?.message || error,
      );
      return false;
    }
  }

  return true;
}
