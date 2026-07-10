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
        template = wa?.templates?.find((t: any) => t.type.toLowerCase() === "reservation")?.content 
                   || wa?.template 
                   || getSetting("whatsapp_global_store_res") 
                   || "";
      } else if (data.kind === "order-paid") {
        template = wa?.templates?.find((t: any) => t.type.toLowerCase() === "payment_confirmed")?.content
                   || getSetting("whatsapp_global_store_pay")
                   || "¡Hola {{customer_name}}! Hemos recibido tu pago por la orden #{{order_id}}. Tu pedido ya está siendo procesado.";
      } else if (data.kind === "order-restored") {
        template = wa?.templates?.find((t: any) => t.type.toLowerCase() === "restored")?.content
                   || getSetting("whatsapp_global_store_restored")
                   || "";
      } else if (data.kind === "order-reminder") {
        template = wa?.templates?.find((t: any) => t.type.toLowerCase() === "reminder")?.content
                   || getSetting("whatsapp_global_store_reminder")
                   || "";
      } else {
        template = wa?.templates?.find((t: any) => t.type.toLowerCase() === "release")?.content 
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

      const bankInfo = paymentChannel
        ? formatBankInfo({
            bank: paymentChannel.bank,
            beneficiary: paymentChannel.beneficiary,
            account: paymentChannel.accountNumber ?? undefined,
            clabe: paymentChannel.clabe ?? undefined,
            card: paymentChannel.card ?? undefined,
          })
        : formatBankInfo({
            bank: getSetting("bank_main_name") ?? "",
            beneficiary: getSetting("bank_main_beneficiary") ?? "",
            account: getSetting("bank_main_account") ?? undefined,
            clabe: getSetting("bank_main_clabe") ?? undefined,
            card: getSetting("bank_main_card") ?? undefined
          });

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
        include: { raffle: true },
      });
      if (sales.length === 0) return;

      let template = "";
      if (data.kind === "reservation") {
        template = raffleChannel?.templates?.find((t: any) => t.type.toLowerCase() === "reservation")?.content 
                   || raffleChannel?.template
                   || "Hola {{customer_name}}, tus boletos ({{ticket_list}}) para la rifa \"{{raffle_name}}\" han sido reservados. Monto a pagar: ${{amount}}.\n\n{{bank_info}}\n\nTienes hasta {{time_raffle}} para realizar tu pago.";
      } else if (data.kind === "reservation-paid") {
        template = raffleChannel?.templates?.find((t: any) => t.type.toLowerCase() === "payment_confirmed")?.content
                   || getSetting("whatsapp_global_raffle_pay")
                   || "¡Hola {{customer_name}}! Hemos recibido tu pago por los boletos ({{ticket_list}}) de la rifa \"{{raffle_name}}\". ¡Mucha suerte!";
      } else if (data.kind === "reservation-reminder") {
        template = raffleChannel?.templates?.find((t: any) => t.type.toLowerCase() === "reminder")?.content
                   || getSetting("whatsapp_global_raffle_reminder")
                   || "";
      } else {
        const firstSale = sales[0];
        const ticketNumbers = sales.map((s) => s.ticketNumber).join(", ");
        template = raffleChannel?.templates?.find((t: any) => t.type.toLowerCase() === "release")?.content 
                   || `Hola ${firstSale.customerName}, tus boletos (${ticketNumbers}) para la rifa "${firstSale.raffle?.title}" han sido liberados debido a que se superó el tiempo límite de apartado.`;
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
            errorMessage: "No hay plantilla de WhatsApp configurada para este tipo de notificaciÃ³n.",
          },
        });
        return;
      }

      let message = "";
      if (data.kind === "reservation") {
        // Find payment channel for Rifas or use main bank info from settings
        const payChannel = payChannels.find(
          (c) => c.purpose.toUpperCase() === "RAFFLES"
        );

        const bankInfo = payChannel 
          ? formatBankInfo({
              bank: payChannel.bank,
              beneficiary: payChannel.beneficiary,
              account: payChannel.accountNumber ?? undefined,
              clabe: payChannel.clabe ?? undefined,
              card: payChannel.card ?? undefined
            })
          : formatBankInfo({
              bank: getSetting("bank_main_name") ?? "",
              beneficiary: getSetting("bank_main_beneficiary") ?? "",
              account: getSetting("bank_main_account") ?? undefined,
              clabe: getSetting("bank_main_clabe") ?? undefined,
              card: getSetting("bank_main_card") ?? undefined
            });

        message = buildReservationMessage(
          template,
          sales,
          bankInfo,
          'timeLimit' in data ? data.timeLimit : undefined,
          'timeRemaining' in data && typeof data.timeRemaining === "string" ? data.timeRemaining : undefined,
        );
      } else {
        message = buildReservationMessage(
          template,
          sales,
          "",
          'timeLimit' in data ? data.timeLimit : undefined,
          'timeRemaining' in data && typeof data.timeRemaining === "string" ? data.timeRemaining : undefined,
        );
      }

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
  const ticketNumbers = sales.map((s) => s.ticketNumber).join(", ");
  const totalAmount = sales.reduce(
    (sum, s) => sum + parseFloat(s.raffle.ticketPrice.toString()),
    0
  );

  let msg = template
    .replace(/\{\{customer_name\}\}/g, firstSale.customerName ?? "")
    .replace(/\{\{ticket_list\}\}/g, ticketNumbers)
    .replace(/\{\{raffle_name\}\}/g, firstSale.raffle?.title ?? "")
    .replace(/\{\{amount\}\}/g, totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{customer_phone\}\}/g, firstSale.customerPhone ?? "")
    .replace(/\{\{bank_info\}\}/g, bankInfo);

  return msg
    .replace(/\{\{time_raffle\}\}/g, timeLimit || "")
    .replace(/\{\{time_remaining\}\}/g, timeRemaining || "");
}
