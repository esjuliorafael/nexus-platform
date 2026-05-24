import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import { resolveChannels } from "../services/evolution/channel.resolver";
import { sendAndLog } from "../services/evolution/evolution.service";
import type { WhatsappJobData } from "../queues/whatsapp.queue";
import type { OrderKind } from "../services/evolution/channel.resolver";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const whatsappWorker = new Worker<WhatsappJobData>(
  "whatsapp-notifications",
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
              "bank_main_name",
              "bank_main_beneficiary",
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

    const globalUrl = getSetting("whatsapp_evolution_url");
    const globalKey = getSetting("whatsapp_evolution_key");

    if (data.kind === "order" || data.kind === "order-cancelled" || data.kind === "order-paid") {
      const resolved = resolveChannels(data.orderKind, waChannels);
      const wa = resolved.whatsappChannel;

      // Determine instance details: Channel specific -> Global Settings
      const instanceName = wa?.instanceName || getSetting("whatsapp_evolution_instance");
      const baseUrl = wa?.evolutionUrl || globalUrl;
      const apiKey = wa?.evolutionKey || globalKey;
      
      if (!instanceName || !baseUrl || !apiKey) {
        console.warn(
          `[WhatsApp] No configuration found for order ${data.orderId}. ` +
          `Channel: ${wa?.name || "None"}, Instance: ${instanceName || "Missing"}, URL: ${baseUrl || "Missing"}`
        );
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
                   || "¡Hola {{customerName}}! Hemos recibido tu pago por la orden #{{orderId}}. Tu pedido ya está siendo procesado.";
      } else {
        template = wa?.templates?.find((t: any) => t.type.toLowerCase() === "release")?.content 
                   || getSetting("whatsapp_global_store_rel")
                   || `Hola, tu orden #${data.orderId} ha sido cancelada debido a que se superó el tiempo límite de pago. Si aún te interesa, por favor realiza una nueva orden.`;
      }

      if (!template) {
        console.warn(`[WhatsApp] No template found for order ${data.orderId}, kind: ${data.kind}`);
        return;
      }

      // Fetch full order data to inject variables
      const order = await storePrisma.order.findUnique({
        where: { id: parseInt(data.orderId) },
        include: { items: true }
      });

      if (!order) {
        console.error(`[WhatsApp] Order ${data.orderId} not found for notification`);
        return;
      }

      const bankInfo = formatBankInfo({
        bank: getSetting("bank_main_name") ?? "",
        beneficiary: getSetting("bank_main_beneficiary") ?? "",
        clabe: getSetting("bank_main_clabe") ?? undefined,
        card: getSetting("bank_main_card") ?? undefined
      });

      const itemList = order.items
        .map(i => `${i.quantity}x ${i.productName}`)
        .join(", ");

      let message = buildOrderMessage(template, order, bankInfo, 'timeLimit' in data ? data.timeLimit : undefined, itemList);

      await sendAndLog({
        instance: { instanceName, baseUrl, apiKey },
        recipientPhone: data.recipientPhone,
        message,
        templateName: data.kind === "order" ? (wa ? `order_${wa.purpose}` : "order_principal") : (data.kind === "order-paid" ? "order_paid" : "order_cancelled"),
        orderId: data.orderId,
      });
    }

    if (data.kind === "reservation" || data.kind === "reservation-cancelled" || data.kind === "reservation-paid") {
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
                   || "Hola {{customerName}}, tus boletos ({{ticket}}) para la rifa \"{{raffleName}}\" han sido reservados. Monto a pagar: ${{amount}}.\n\n{{bank_info}}\n\nTienes hasta {{time_limit_raffle}} para realizar tu pago.";
      } else if (data.kind === "reservation-paid") {
        template = raffleChannel?.templates?.find((t: any) => t.type.toLowerCase() === "payment_confirmed")?.content
                   || getSetting("whatsapp_global_raffle_pay")
                   || "¡Hola {{customerName}}! Hemos recibido tu pago por los boletos ({{ticket}}) de la rifa \"{{raffleName}}\". ¡Mucha suerte!";
      } else {
        const firstSale = sales[0];
        const ticketNumbers = sales.map((s) => s.ticketNumber).join(", ");
        template = raffleChannel?.templates?.find((t: any) => t.type.toLowerCase() === "release")?.content 
                   || `Hola ${firstSale.customerName}, tus boletos (${ticketNumbers}) para la rifa "${firstSale.raffle?.title}" han sido liberados debido a que se superó el tiempo límite de apartado.`;
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
              clabe: payChannel.clabe ?? undefined,
              card: payChannel.card ?? undefined
            })
          : formatBankInfo({
              bank: getSetting("bank_main_name") ?? "",
              beneficiary: getSetting("bank_main_beneficiary") ?? "",
              clabe: getSetting("bank_main_clabe") ?? undefined,
              card: getSetting("bank_main_card") ?? undefined
            });

        message = buildReservationMessage(template, sales, bankInfo, 'timeLimit' in data ? data.timeLimit : undefined);
      } else {
        message = buildReservationMessage(template, sales, "", 'timeLimit' in data ? data.timeLimit : undefined);
      }

      await sendAndLog({
        instance: { instanceName, baseUrl, apiKey },
        recipientPhone: data.recipientPhone,
        message,
        templateName: data.kind === "reservation" ? "reservation_rifas" : "reservation_cancelled_rifas",
        ticketSaleId: sales[0].id,
      });
    }
  },
  { connection, concurrency: 5 }
);

whatsappWorker.on("failed", (job, err) => {
  console.error(`[WhatsApp Worker] Job ${job?.id} failed:`, err.message);
});

function buildOrderMessage(template: string, order: any, bankInfo: string, timeLimit?: string, itemList?: string): string {
  const hour = new Date().getHours();
  let greeting = "Buen día";
  if (hour >= 12 && hour < 19) greeting = "Buena tarde";
  else if (hour >= 19 || hour < 6) greeting = "Buena noche";

  let msg = template
    .replace(/\{\{greeting\}\}/g, greeting)
    .replace(/\{\{orderId\}\}/g, order.id.toString())
    .replace(/\{\{customerName\}\}/g, order.customerName ?? "")
    .replace(/\{\{itemList\}\}/g, itemList || "")
    .replace(/\{\{amount\}\}/g, Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{bank_info\}\}/g, bankInfo);

  if (timeLimit) {
    msg = msg.replace(/\{\{time_store\}\}/g, timeLimit);
  }
  return msg;
}

interface BankData {
  bank: string;
  beneficiary: string;
  clabe?: string;
  card?: string;
}

function formatBankInfo(data: BankData): string {
  if (!data.bank || !data.beneficiary) return "";
  
  let info = `Banco: ${data.bank}\nBeneficiario: ${data.beneficiary}`;
  if (data.clabe && data.clabe.trim()) {
    info += `\nCLABE: ${data.clabe.trim()}`;
  }
  if (data.card && data.card.trim()) {
    info += `\nTarjeta: ${data.card.trim()}`;
  }
  return info;
}

function buildReservationMessage(template: string, sales: any[], bankInfo: string, timeLimit?: string): string {
  const firstSale = sales[0];
  const ticketNumbers = sales.map((s) => s.ticketNumber).join(", ");
  const totalAmount = sales.reduce(
    (sum, s) => sum + parseFloat(s.raffle.ticketPrice.toString()),
    0
  );

  let msg = template
    .replace(/\{\{customerName\}\}/g, firstSale.customerName ?? "")
    .replace(/\{\{ticket\}\}/g, ticketNumbers)
    .replace(/\{\{raffleName\}\}/g, firstSale.raffle?.title ?? "")
    .replace(/\{\{amount\}\}/g, totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{customerPhone\}\}/g, firstSale.customerPhone ?? "")
    .replace(/\{\{bank_info\}\}/g, bankInfo);

  if (timeLimit) {
    msg = msg.replace(/\{\{time_limit_raffle\}\}/g, timeLimit);
  }
  
  return msg;
}
