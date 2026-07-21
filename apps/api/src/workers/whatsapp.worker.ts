import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import { resolveChannels } from "../services/evolution/channel.resolver";
import { getEvolutionConfigFromSettings } from "../services/evolution/evolution.config";
import { sendAndLog } from "../services/evolution/evolution.service";
import type { WhatsappJobData } from "../queues/whatsapp.queue";
import type { OrderKind } from "../services/evolution/channel.resolver";
import { queueName } from "../queues/queue-name";
import { formatRaffleTicketList } from "../utils/raffle-ticket-list";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const whatsappWorker = new Worker<WhatsappJobData>(
  queueName("whatsapp-notifications"),
  async (job: Job<WhatsappJobData>) => {
    const { data } = job;

    // Load global Evolution settings, all active WhatsApp channels, and payment channels
    const [settings, waChannels, payChannels] = await Promise.all([
      storePrisma.setting.findMany({
        where: {
          key: {
            in: [
              "whatsapp_evolution_url",
              "whatsapp_evolution_key",
              "whatsapp_evolution_instance",
              "whatsapp_global_store_res",
              "whatsapp_global_store_rel",
              "whatsapp_global_store_pay",
              "whatsapp_global_store_restored",
              "whatsapp_global_store_reminder",
              "whatsapp_global_raffle_res",
              "whatsapp_global_raffle_rel",
              "whatsapp_global_raffle_pay",
              "whatsapp_global_raffle_reminder",
              "whatsapp_global_raffle_opening",
              "bank_main_name",
              "bank_main_beneficiary",
              "bank_main_account",
              "bank_main_clabe",
              "bank_main_card",
            ],
          },
        },
      }),
      storePrisma.whatsappChannel.findMany({
        where: { active: true },
        include: { templates: true }
      }),
      storePrisma.paymentChannel.findMany(),
    ]);

    const getSetting = (k: string) =>
      settings.find((s) => s.key === k)?.value ?? null;

    const envEvolutionConfig = await getEvolutionConfigFromSettings();
    const globalUrl = getSetting("whatsapp_evolution_url") || envEvolutionConfig.baseUrl;
    const globalKey = getSetting("whatsapp_evolution_key") || envEvolutionConfig.apiKey;

    if (data.kind === "order" || data.kind === "order-cancelled" || data.kind === "order-paid" || data.kind === "order-restored" || data.kind === "order-reminder") {
      const resolved = resolveChannels(data.orderKind, waChannels);
      const wa = resolved.whatsappChannel;

      // Determine instance details: Channel specific -> Global Settings
      let instanceName = wa?.instanceName || getSetting("whatsapp_evolution_instance");
      
      // If using global fallback, append _main suffix if not present
      if (!wa && instanceName && !instanceName.endsWith('_main')) {
        instanceName = `${instanceName}_main`;
      }

      const baseUrl = wa?.evolutionUrl || globalUrl;
      const apiKey = wa?.evolutionKey || globalKey;
      
      if (!instanceName || !baseUrl || !apiKey) {
        console.warn(
          `[WhatsApp] No configuration found for order ${data.orderId}. ` +
          `Channel: ${wa?.name || "None"}, Instance: ${instanceName || "Missing"}, URL: ${baseUrl || "Missing"}`
        );
        await storePrisma.whatsappMessageLog.create({
          data: {
            attempt: job.attemptsMade + 1,
            orderId: data.orderId,
            recipientPhone: data.recipientPhone,
            instanceName: instanceName || "missing",
            jobId: String(job.id ?? ""),
            templateUsed: "configuration",
            status: "failed",
            errorMessage: "No hay configuración de Evolution API para esta orden.",
          },
        });
        return;
      }

      // Dynamic template resolution
      let template = "";
      if (data.kind === "order") {
        template = wa?.templates?.find((t: any) => t.active && t.type.toLowerCase() === "reservation")?.content
                   || getSetting("whatsapp_global_store_res") 
                   || "";
      } else if (data.kind === "order-paid") {
        template = wa?.templates?.find((t: any) => t.active && t.type.toLowerCase() === "payment_confirmed")?.content
                   || getSetting("whatsapp_global_store_pay")
                   || "";
      } else if (data.kind === "order-restored") {
        template = wa?.templates?.find((t: any) => t.active && t.type.toLowerCase() === "restored")?.content
                   || getSetting("whatsapp_global_store_restored")
                   || "";
      } else if (data.kind === "order-reminder") {
        template = wa?.templates?.find((t: any) => t.active && t.type.toLowerCase() === "reminder")?.content
                   || getSetting("whatsapp_global_store_reminder")
                   || "";
      } else {
        template = wa?.templates?.find((t: any) => t.active && t.type.toLowerCase() === "release")?.content
                   || getSetting("whatsapp_global_store_rel")
                   || "";
      }

      if (!template) {
        console.warn(`[WhatsApp] No template found for order ${data.orderId}, kind: ${data.kind}`);
        await storePrisma.whatsappMessageLog.create({
          data: {
            attempt: job.attemptsMade + 1,
            orderId: data.orderId,
            recipientPhone: data.recipientPhone,
            instanceName,
            jobId: String(job.id ?? ""),
            templateUsed: data.kind,
            status: "failed",
            errorMessage: "No hay plantilla de WhatsApp configurada para este tipo de notificación.",
          },
        });
        return;
      }

      // Fetch full order data to inject variables
      const order = await storePrisma.order.findUnique({
        where: { id: parseInt(data.orderId) },
        include: { items: true }
      });

      if (!order) {
        console.error(`[WhatsApp] Order ${data.orderId} not found for notification`);
        await storePrisma.whatsappMessageLog.create({
          data: {
            attempt: job.attemptsMade + 1,
            orderId: data.orderId,
            recipientPhone: data.recipientPhone,
            instanceName,
            jobId: String(job.id ?? ""),
            templateUsed: data.kind,
            status: "failed",
            errorMessage: "La orden no existe al procesar la notificación.",
          },
        });
        return;
      }

      let paymentChannel = null;
      if (data.orderKind.type === "birds_only" && data.orderKind.purpose) {
        const orderPurpose = data.orderKind.purpose;
        paymentChannel = payChannels.find((channel) => channel.purpose.toUpperCase() === orderPurpose) ?? null;
      }

      const bankInfo = resolveBankInfo(
        paymentChannel
          ? {
            bank: paymentChannel.bank,
            beneficiary: paymentChannel.beneficiary,
            account: paymentChannel.accountNumber ?? undefined,
            clabe: paymentChannel.clabe ?? undefined,
            card: paymentChannel.card ?? undefined,
          }
          : null,
        {
          bank: getSetting("bank_main_name") ?? "",
          beneficiary: getSetting("bank_main_beneficiary") ?? "",
          account: getSetting("bank_main_account") ?? undefined,
          clabe: getSetting("bank_main_clabe") ?? undefined,
          card: getSetting("bank_main_card") ?? undefined,
        },
      );

      const itemList = order.items
        .map(i => `${i.quantity}x ${i.productName}`)
        .join(", ");

      let message = buildOrderMessage(
        template,
        order,
        bankInfo,
        'timeLimit' in data ? data.timeLimit : undefined,
        itemList,
        'timeRemaining' in data && typeof data.timeRemaining === "string" ? data.timeRemaining : undefined,
      );

      await sendAndLog({
        instance: { instanceName, baseUrl, apiKey },
        recipientPhone: data.recipientPhone,
        message,
        templateName:
          data.kind === "order"
            ? (wa ? `order_${wa.purpose}` : "order_principal")
            : data.kind === "order-paid"
              ? "order_paid"
              : data.kind === "order-restored"
                ? "order_restored"
                : data.kind === "order-reminder"
                  ? "order_reminder"
                  : "order_cancelled",
        orderId: data.orderId,
        jobId: String(job.id ?? ""),
        attempt: job.attemptsMade + 1,
      });
    }

    if (data.kind === "raffle-opening") {
      const subscription = await rafflePrisma.raffleOpeningSubscription.findUnique({
        where: { id: data.subscriptionId },
        include: { raffle: true },
      });
      if (!subscription || subscription.status === "SENT" || subscription.status === "CANCELLED") {
        return;
      }

      const claimed = await rafflePrisma.raffleOpeningSubscription.updateMany({
        where: {
          id: subscription.id,
          status: { in: ["PENDING", "FAILED"] },
        },
        data: {
          status: "PROCESSING",
          lastError: null,
        },
      });
      if (claimed.count === 0) return;

      const now = new Date();
      const raffle = subscription.raffle;
      if (
        raffle.status !== "ACTIVE" ||
        !raffle.participationStartsAt ||
        (raffle.participationEndsAt && raffle.participationEndsAt <= now)
      ) {
        await rafflePrisma.raffleOpeningSubscription.update({
          where: { id: subscription.id },
          data: { status: "CANCELLED" },
        });
        return;
      }

      if (!raffle.published || raffle.participationStartsAt > now) {
        await rafflePrisma.raffleOpeningSubscription.update({
          where: { id: subscription.id },
          data: { status: "PENDING" },
        });
        return;
      }

      const raffleChannel = waChannels.find(
        (channel) => channel.purpose.toUpperCase() === "RAFFLES" && channel.active,
      );
      const instanceName = raffleChannel?.instanceName || getSetting("whatsapp_evolution_instance");
      const baseUrl = raffleChannel?.evolutionUrl || globalUrl;
      const apiKey = raffleChannel?.evolutionKey || globalKey;
      const template =
        raffleChannel?.templates?.find(
          (item: any) => item.active && item.type.toLowerCase() === "opening",
        )?.content ||
        getSetting("whatsapp_global_raffle_opening") ||
        "";

      if (!instanceName || !baseUrl || !apiKey || !template) {
        const errorMessage = !template
          ? "No hay plantilla de aviso de apertura configurada."
          : "No hay configuración de Evolution API para enviar el aviso de apertura.";
        await rafflePrisma.raffleOpeningSubscription.update({
          where: { id: subscription.id },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            lastError: errorMessage,
          },
        });
        await storePrisma.whatsappMessageLog.create({
          data: {
            attempt: subscription.attempts + 1,
            recipientPhone: subscription.phone,
            instanceName: instanceName || "missing",
            jobId: String(job.id ?? ""),
            templateUsed: "raffle_opening",
            status: "failed",
            errorMessage,
          },
        });
        return;
      }

      const storefrontUrl = (
        process.env.STOREFRONT_HTTPS_URL ||
        process.env.STOREFRONT_URL ||
        "http://localhost:3000"
      ).replace(/\/+$/, "");
      const raffleUrl = `${storefrontUrl}/raffles/${raffle.id}`;
      const openingDate = formatOpeningDate(raffle.participationStartsAt);
      const message = template
        .replace(/\{\{raffle_name\}\}/g, raffle.title)
        .replace(/\{\{raffle_url\}\}/g, raffleUrl)
        .replace(/\{\{opening_date\}\}/g, openingDate);

      try {
        await sendAndLog({
          instance: { instanceName, baseUrl, apiKey },
          recipientPhone: subscription.phone,
          message,
          templateName: "raffle_opening",
          jobId: String(job.id ?? ""),
          attempt: subscription.attempts + 1,
        });
        await rafflePrisma.raffleOpeningSubscription.update({
          where: { id: subscription.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
          },
        });
      } catch (error: any) {
        await rafflePrisma.raffleOpeningSubscription.update({
          where: { id: subscription.id },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            lastError: error?.message || "No se pudo enviar el aviso de apertura.",
          },
        });
        throw error;
      }
    }

    if (data.kind === "reservation" || data.kind === "reservation-cancelled" || data.kind === "reservation-paid" || data.kind === "reservation-reminder") {
      const raffleChannel = waChannels.find(
        (c) => c.purpose.toUpperCase() === "RAFFLES" && c.active
      );

      // FALLBACK: Use specific raffle channel OR global principal instance
      const instanceName = raffleChannel?.instanceName || getSetting("whatsapp_evolution_instance");
      const baseUrl = globalUrl || raffleChannel?.evolutionUrl;
      const apiKey = globalKey || raffleChannel?.evolutionKey;

      if (!instanceName || !baseUrl || !apiKey) {
        console.warn(
          "[WhatsApp] No WhatsApp configuration found (Riffles channel or principal), skipping reservation",
          data.ticketSaleIds
        );
        return;
      }

      const sales = await rafflePrisma.ticketSale.findMany({
        where: { id: { in: data.ticketSaleIds } },
        include: {
          raffle: {
            include: { extraOpportunities: true },
          },
        },
        orderBy: { ticketNumber: "asc" },
      });
      if (sales.length === 0) return;

      let template = "";
      if (data.kind === "reservation") {
        template = raffleChannel?.templates?.find((t: any) => t.active && t.type.toLowerCase() === "reservation")?.content
                   || getSetting("whatsapp_global_raffle_res")
                   || "";
      } else if (data.kind === "reservation-paid") {
        template = raffleChannel?.templates?.find((t: any) => t.active && t.type.toLowerCase() === "payment_confirmed")?.content
                   || getSetting("whatsapp_global_raffle_pay")
                   || "";
      } else if (data.kind === "reservation-reminder") {
        template = raffleChannel?.templates?.find((t: any) => t.active && t.type.toLowerCase() === "reminder")?.content
                   || getSetting("whatsapp_global_raffle_reminder")
                   || "";
      } else {
        template = raffleChannel?.templates?.find((t: any) => t.active && t.type.toLowerCase() === "release")?.content
                   || getSetting("whatsapp_global_raffle_rel")
                   || "";
      }

      if (!template) {
        await storePrisma.whatsappMessageLog.create({
          data: {
            attempt: job.attemptsMade + 1,
            recipientPhone: data.recipientPhone,
            instanceName,
            jobId: String(job.id ?? ""),
            templateUsed: data.kind,
            status: "failed",
            ticketSaleId: sales[0].id,
            errorMessage: "No hay plantilla de WhatsApp configurada para este tipo de notificación.",
          },
        });
        return;
      }

      let raffleBankInfo = "";
      if (data.kind === "reservation" || data.kind === "reservation-reminder") {
        const payChannel = payChannels.find(
          (c) => c.purpose.toUpperCase() === "RAFFLES"
        );

        raffleBankInfo = resolveBankInfo(
          payChannel
            ? {
              bank: payChannel.bank,
              beneficiary: payChannel.beneficiary,
              account: payChannel.accountNumber ?? undefined,
              clabe: payChannel.clabe ?? undefined,
              card: payChannel.card ?? undefined,
            }
            : null,
          {
            bank: getSetting("bank_main_name") ?? "",
            beneficiary: getSetting("bank_main_beneficiary") ?? "",
            account: getSetting("bank_main_account") ?? undefined,
            clabe: getSetting("bank_main_clabe") ?? undefined,
            card: getSetting("bank_main_card") ?? undefined,
          },
        );
      }

      const message = buildReservationMessage(
        template,
        sales,
        raffleBankInfo,
        'timeLimit' in data ? data.timeLimit : undefined,
        'timeRemaining' in data && typeof data.timeRemaining === "string" ? data.timeRemaining : undefined,
      );

      await sendAndLog({
        instance: { instanceName, baseUrl, apiKey },
        recipientPhone: data.recipientPhone,
        message,
        templateName:
          data.kind === "reservation"
            ? "reservation_rifas"
            : data.kind === "reservation-paid"
              ? "reservation_paid_rifas"
              : data.kind === "reservation-reminder"
                ? "reservation_reminder_rifas"
                : "reservation_cancelled_rifas",
        ticketSaleId: sales[0].id,
        jobId: String(job.id ?? ""),
        attempt: job.attemptsMade + 1,
      });
    }
  },
  { connection, concurrency: 5 }
);

whatsappWorker.on("failed", (job, err) => {
  console.error(`[WhatsApp Worker] Job ${job?.id} failed:`, err.message);
});

function buildOrderMessage(template: string, order: any, bankInfo: string, timeLimit?: string, itemList?: string, timeRemaining?: string): string {
  const hour = new Date().getHours();
  let greeting = "Buen día";
  if (hour >= 12 && hour < 19) greeting = "Buena tarde";
  else if (hour >= 19 || hour < 6) greeting = "Buena noche";

  let msg = template
    .replace(/\{\{greeting\}\}/g, greeting)
    .replace(/\{\{order_id\}\}/g, order.id.toString())
    .replace(/\{\{customer_name\}\}/g, order.customerName ?? "")
    .replace(/\{\{item_list\}\}/g, itemList || "")
    .replace(/\{\{amount\}\}/g, Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{bank_info\}\}/g, bankInfo);

  return msg
    .replace(/\{\{time_store\}\}/g, timeLimit || "")
    .replace(/\{\{time_remaining\}\}/g, timeRemaining || "");
}

interface BankData {
  bank: string;
  beneficiary: string;
  account?: string;
  clabe?: string;
  card?: string;
}

function resolveBankInfo(
  specialized: BankData | null,
  principal: BankData,
): string {
  const selected = hasCompleteBankInfo(specialized) ? specialized : principal;
  return formatBankInfo(selected);
}

function hasCompleteBankInfo(data: BankData | null): data is BankData {
  return Boolean(data?.bank?.trim() && data?.beneficiary?.trim());
}

function formatBankInfo(data: BankData): string {
  if (!data.bank || !data.beneficiary) return "";
  
  let info = `Banco: ${data.bank}\nBeneficiario: ${data.beneficiary}`;
  if (data.account && data.account.trim()) {
    info += `\nNo. Cuenta: ${data.account.trim()}`;
  }
  if (data.clabe && data.clabe.trim()) {
    info += `\nCLABE: ${data.clabe.trim()}`;
  }
  if (data.card && data.card.trim()) {
    info += `\nTarjeta: ${data.card.trim()}`;
  }
  return info;
}

function buildReservationMessage(template: string, sales: any[], bankInfo: string, timeLimit?: string, timeRemaining?: string): string {
  const firstSale = sales[0];
  const ticketList = formatRaffleTicketList(sales);
  const subtotal = sales.reduce(
    (sum, s) => sum + parseFloat(s.raffle.ticketPrice.toString()),
    0
  );
  const discountTotal = parseFloat(firstSale.discountTotal?.toString() || "0");
  const totalAmount = Math.max(0, subtotal - discountTotal);

  let msg = template
    .replace(/\{\{customer_name\}\}/g, firstSale.customerName ?? "")
    .replace(/\{\{ticket_list\}\}/g, ticketList)
    .replace(/\{\{raffle_name\}\}/g, firstSale.raffle?.title ?? "")
    .replace(/\{\{amount\}\}/g, totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{customer_phone\}\}/g, firstSale.customerPhone ?? "")
    .replace(/\{\{bank_info\}\}/g, bankInfo);

  return msg
    .replace(/\{\{time_raffle\}\}/g, timeLimit || "")
    .replace(/\{\{time_remaining\}\}/g, timeRemaining || "");
}

function formatOpeningDate(value: Date): string {
  const formatted = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: process.env.TZ || "America/Mexico_City",
  }).format(value);

  return formatted.charAt(0).toLocaleUpperCase("es-MX") + formatted.slice(1);
}
