import {
  Prisma,
  PrismaClient as RafflePrismaClient,
  RaffleResultCampaignStatus,
  RaffleResultRecipientStatus,
  TicketStatus,
} from "@prisma/client-raffle";
import type { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import { formatRaffleTicketList } from "../../../utils/raffle-ticket-list";
import {
  customerPhoneIdentity,
  normalizeCustomerPhone,
} from "../../../utils/customer-phone";
import {
  auditActorData,
  type AuditActor,
} from "../../../utils/admin-authorization";
import {
  deriveRaffleResultCampaignStatus,
  rafflePrizePlaceLabel,
} from "./raffle-result-communication.utils";

const TEMPLATE_KEY = "whatsapp_global_raffle_draw_reminder";

type RecipientDraft = {
  phone: string;
  customerName: string;
  participationIds: string[];
  payload: Record<string, string>;
  status: RaffleResultRecipientStatus;
  lastError: string | null;
};

const normalizedName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-MX");

const MEXICO_CITY_TIME_ZONE = "America/Mexico_City";

const dateKeyInMexicoCity = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: MEXICO_CITY_TIME_ZONE,
  }).format(date);

const formatDrawDate = (date: Date) => {
  const calendarDate = date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: MEXICO_CITY_TIME_ZONE,
  });
  const time = date.toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: MEXICO_CITY_TIME_ZONE,
  });

  if (dateKeyInMexicoCity(date) === dateKeyInMexicoCity(new Date())) {
    return `Hoy, ${calendarDate} a las ${time}`;
  }

  const weekday = date.toLocaleDateString("es-MX", {
    weekday: "long",
    timeZone: MEXICO_CITY_TIME_ZONE,
  });
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${calendarDate} a las ${time}`;
};

const participationRule = (opportunities: number) =>
  opportunities > 1
    ? `Tu boleto participa con ${opportunities} números: el número que eliges y ${opportunities - 1} oportunidades adicionales.`
    : "Tu boleto participa únicamente con su número principal.";

async function resolveTemplate(storePrisma: StorePrismaClient) {
  const setting = await storePrisma.setting.findUnique({
    where: { key: TEMPLATE_KEY },
    select: { value: true },
  });
  const content = setting?.value?.trim() || "";
  if (!content) throw new Error("RAFFLE_DRAW_REMINDER_TEMPLATE_MISSING");
  return { templateContent: content, principalTemplateContent: content };
}

async function buildRecipients(rafflePrisma: RafflePrismaClient, raffleId: number) {
  const raffle = await rafflePrisma.raffle.findUnique({
    where: { id: raffleId },
    include: {
      prizes: { orderBy: { position: "asc" } },
      extraOpportunities: true,
      ticketSales: {
        where: { paymentStatus: TicketStatus.PAID },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!raffle) throw new Error("RAFFLE_NOT_FOUND");
  if (!raffle.drawDate) throw new Error("RAFFLE_DRAW_DATE_MISSING");

  const recipients = new Map<string, RecipientDraft & { names: Set<string>; sales: typeof raffle.ticketSales }>();
  for (const sale of raffle.ticketSales) {
    const identity = customerPhoneIdentity(sale.customerPhone);
    const phone = normalizeCustomerPhone(sale.customerPhone);
    const current = recipients.get(identity);
    const names = current?.names || new Set<string>();
    if (sale.customerName.trim()) names.add(sale.customerName.trim());
    const sales = current?.sales || [];
    sales.push(sale);
    const participationId = sale.reservationId || `ticket-sale:${sale.id}`;
    recipients.set(identity, {
      phone: phone || sale.customerPhone,
      customerName: "",
      participationIds: Array.from(new Set([...(current?.participationIds || []), participationId])),
      payload: {},
      status: phone ? RaffleResultRecipientStatus.PENDING : RaffleResultRecipientStatus.FAILED,
      lastError: phone ? null : "El número de WhatsApp no tiene un formato internacional válido.",
      names,
      sales,
    });
  }

  const prizeList = raffle.prizes
    .map((prize) => `${rafflePrizePlaceLabel(prize.position)}: ${prize.title}`)
    .join("\n");
  const winningRule =
    raffle.prizes.find((prize) => prize.winnerRule?.trim())?.winnerRule?.trim() ||
    `El número ganador se determina con los últimos ${raffle.digits} dígitos del Premio Mayor de la Lotería Nacional.`;

  return {
    raffle,
    recipients: Array.from(recipients.values()).map(({ names, sales, ...recipient }) => {
      const distinctNames = Array.from(new Set(Array.from(names).map(normalizedName)));
      const customerName = distinctNames.length === 1 ? Array.from(names)[0] || "" : "";
      return {
        ...recipient,
        customerName,
        payload: {
          customer_name: customerName,
          raffle_name: raffle.title,
          raffle_date: formatDrawDate(raffle.drawDate!),
          ticket_list: formatRaffleTicketList(
            sales.map((sale) => ({
              ticketNumber: sale.ticketNumber,
              raffle: { extraOpportunities: raffle.extraOpportunities },
            })),
          ),
          prize_list: prizeList,
          participation_rule: participationRule(raffle.opportunities),
          winning_rule: winningRule,
        },
      };
    }),
  };
}

export async function refreshRaffleDrawReminderCampaign(
  rafflePrisma: RafflePrismaClient,
  campaignId: string,
) {
  const grouped = await rafflePrisma.raffleDrawReminderRecipient.groupBy({
    by: ["status"], where: { campaignId }, _count: { _all: true },
  });
  const count = (status: RaffleResultRecipientStatus) =>
    grouped.find((item) => item.status === status)?._count._all || 0;
  const sentCount = count(RaffleResultRecipientStatus.SENT);
  const failedCount = count(RaffleResultRecipientStatus.FAILED);
  const processingCount = count(RaffleResultRecipientStatus.PENDING) + count(RaffleResultRecipientStatus.PROCESSING);
  return rafflePrisma.raffleDrawReminderCampaign.update({
    where: { id: campaignId },
    data: {
      status: deriveRaffleResultCampaignStatus({ sentCount, failedCount, processingCount }),
      totalRecipients: sentCount + failedCount + processingCount,
      sentCount,
      failedCount,
      completedAt: processingCount === 0 ? new Date() : null,
    },
  });
}

async function enqueue(rafflePrisma: RafflePrismaClient, campaignId: string, recipientIds: string[]) {
  for (const id of recipientIds) {
    const recipient = await rafflePrisma.raffleDrawReminderRecipient.findUnique({
      where: { id }, select: { phone: true, attempts: true },
    });
    if (!recipient) continue;
    await whatsappQueue.add("raffle-draw-reminder", {
      kind: "raffle-draw-reminder", campaignRecipientId: id, recipientPhone: recipient.phone,
    }, { jobId: `raffle-draw-reminder-${id}-${recipient.attempts + 1}` });
  }
}

const dispatchJobId = (campaignId: string) =>
  `raffle-draw-reminder-dispatch-${campaignId}`;

async function enqueueScheduledDispatch(campaignId: string, scheduledFor: Date) {
  const existingJob = await whatsappQueue.getJob(dispatchJobId(campaignId));
  if (existingJob) await existingJob.remove();

  await whatsappQueue.add(
    "raffle-draw-reminder-dispatch",
    { kind: "raffle-draw-reminder-dispatch", campaignId },
    {
      jobId: dispatchJobId(campaignId),
      delay: Math.max(0, scheduledFor.getTime() - Date.now()),
    },
  );
}

async function resume(rafflePrisma: RafflePrismaClient, campaign: { id: string; recipients: Array<{ id: string; status: RaffleResultRecipientStatus }> }) {
  const pendingIds = campaign.recipients.filter((recipient) => recipient.status === RaffleResultRecipientStatus.PENDING).map((recipient) => recipient.id);
  await enqueue(rafflePrisma, campaign.id, pendingIds);
  await refreshRaffleDrawReminderCampaign(rafflePrisma, campaign.id);
  return rafflePrisma.raffleDrawReminderCampaign.findUnique({ where: { id: campaign.id }, include: { recipients: true } });
}

export const raffleDrawReminderService = {
  async getOverview(rafflePrisma: RafflePrismaClient, storePrisma: StorePrismaClient, raffleId: number) {
    const [raffle, templateConfigured] = await Promise.all([
      rafflePrisma.raffle.findUnique({
        where: { id: raffleId },
        include: { drawReminderCampaigns: { orderBy: { createdAt: "desc" }, include: { recipients: { orderBy: { customerName: "asc" } } } }, },
      }),
      resolveTemplate(storePrisma).then(() => true).catch((error) => error?.message === "RAFFLE_DRAW_REMINDER_TEMPLATE_MISSING" ? false : Promise.reject(error)),
    ]);
    if (!raffle) return null;
    const data = raffle.drawDate ? await buildRecipients(rafflePrisma, raffleId) : { recipients: [] as RecipientDraft[] };
    return {
      raffleId, drawDate: raffle.drawDate, templateConfigured,
      totalRecipients: data.recipients.length,
      invalidRecipients: data.recipients.filter((recipient) => recipient.status === RaffleResultRecipientStatus.FAILED).length,
      campaign: raffle.drawReminderCampaigns[0] || null,
    };
  },

  async createCampaign(rafflePrisma: RafflePrismaClient, storePrisma: StorePrismaClient, raffleId: number, actor: AuditActor) {
    const [{ raffle, recipients }, templates] = await Promise.all([buildRecipients(rafflePrisma, raffleId), resolveTemplate(storePrisma)]);
    const existing = await rafflePrisma.raffleDrawReminderCampaign.findUnique({
      where: { raffleId_drawDate: { raffleId, drawDate: raffle.drawDate! } }, include: { recipients: true },
    });
    if (existing) {
      if (existing.scheduledFor && existing.scheduledFor > new Date() && existing.recipients.length === 0) {
        return this.dispatchScheduledCampaign(rafflePrisma, storePrisma, existing.id, true);
      }
      return resume(rafflePrisma, existing);
    }
    const campaign = await rafflePrisma.$transaction(async (tx) => {
      const created = await tx.raffleDrawReminderCampaign.create({
        data: {
          raffleId, drawDate: raffle.drawDate!, ...templates,
          status: recipients.length ? RaffleResultCampaignStatus.QUEUED : RaffleResultCampaignStatus.EMPTY,
          totalRecipients: recipients.length,
          failedCount: recipients.filter((recipient) => recipient.status === RaffleResultRecipientStatus.FAILED).length,
          initiatedByUserId: actor.userId ?? null, initiatedByName: actor.name, initiatedByRole: actor.role ?? null,
          completedAt: recipients.length ? null : new Date(),
          recipients: { create: recipients.map((recipient) => ({ ...recipient, payload: recipient.payload as Prisma.InputJsonValue })) },
        }, include: { recipients: true },
      });
      await tx.raffleResultEvent.create({
        data: {
          raffleId, eventType: "DRAW_REMINDER_QUEUED",
          message: `Se preparó el aviso del día de la rifa para ${recipients.length} destinatario(s).`,
          ...auditActorData(actor), metadata: { campaignId: created.id, totalRecipients: recipients.length, drawDate: raffle.drawDate },
        },
      });
      return created;
    });
    return resume(rafflePrisma, campaign);
  },

  async scheduleCampaign(
    rafflePrisma: RafflePrismaClient,
    storePrisma: StorePrismaClient,
    raffleId: number,
    scheduledFor: Date,
    actor: AuditActor,
  ) {
    const [raffle, templates] = await Promise.all([
      rafflePrisma.raffle.findUnique({ where: { id: raffleId }, select: { id: true, drawDate: true } }),
      resolveTemplate(storePrisma),
    ]);
    if (!raffle) throw new Error("RAFFLE_NOT_FOUND");
    if (!raffle.drawDate) throw new Error("RAFFLE_DRAW_DATE_MISSING");
    if (scheduledFor <= new Date()) throw new Error("RAFFLE_DRAW_REMINDER_SCHEDULE_IN_PAST");
    if (scheduledFor >= raffle.drawDate) throw new Error("RAFFLE_DRAW_REMINDER_SCHEDULE_AFTER_DRAW");

    const existing = await rafflePrisma.raffleDrawReminderCampaign.findUnique({
      where: { raffleId_drawDate: { raffleId, drawDate: raffle.drawDate } },
      include: { recipients: true },
    });
    if (existing && existing.recipients.length > 0) {
      throw new Error("RAFFLE_DRAW_REMINDER_ALREADY_DISPATCHED");
    }

    const campaign = existing
      ? await rafflePrisma.raffleDrawReminderCampaign.update({
          where: { id: existing.id },
          data: {
            scheduledFor,
            status: RaffleResultCampaignStatus.QUEUED,
            completedAt: null,
            templateContent: templates.templateContent,
            principalTemplateContent: templates.principalTemplateContent,
            initiatedByUserId: actor.userId ?? null,
            initiatedByName: actor.name,
            initiatedByRole: actor.role ?? null,
          },
          include: { recipients: true },
        })
      : await rafflePrisma.raffleDrawReminderCampaign.create({
          data: {
            raffleId,
            drawDate: raffle.drawDate,
            scheduledFor,
            templateContent: templates.templateContent,
            principalTemplateContent: templates.principalTemplateContent,
            initiatedByUserId: actor.userId ?? null,
            initiatedByName: actor.name,
            initiatedByRole: actor.role ?? null,
          },
          include: { recipients: true },
        });

    await rafflePrisma.raffleResultEvent.create({
      data: {
        raffleId,
        eventType: "DRAW_REMINDER_SCHEDULED",
        message: "Se programó el aviso del día de la rifa.",
        ...auditActorData(actor),
        metadata: { campaignId: campaign.id, scheduledFor },
      },
    });
    await enqueueScheduledDispatch(campaign.id, scheduledFor);
    return campaign;
  },

  async cancelScheduledCampaign(rafflePrisma: RafflePrismaClient, raffleId: number, actor: AuditActor) {
    const raffle = await rafflePrisma.raffle.findUnique({ where: { id: raffleId }, select: { drawDate: true } });
    if (!raffle) throw new Error("RAFFLE_NOT_FOUND");
    if (!raffle.drawDate) throw new Error("RAFFLE_DRAW_DATE_MISSING");
    const campaign = await rafflePrisma.raffleDrawReminderCampaign.findUnique({
      where: { raffleId_drawDate: { raffleId, drawDate: raffle.drawDate } },
      include: { recipients: true },
    });
    if (!campaign || !campaign.scheduledFor || campaign.scheduledFor <= new Date() || campaign.recipients.length > 0) {
      throw new Error("RAFFLE_DRAW_REMINDER_NOT_SCHEDULED");
    }
    const job = await whatsappQueue.getJob(dispatchJobId(campaign.id));
    if (job) await job.remove();
    await rafflePrisma.$transaction([
      rafflePrisma.raffleDrawReminderCampaign.delete({ where: { id: campaign.id } }),
      rafflePrisma.raffleResultEvent.create({
        data: {
          raffleId,
          eventType: "DRAW_REMINDER_SCHEDULE_CANCELLED",
          message: "Se canceló la programación del aviso del día de la rifa.",
          ...auditActorData(actor),
          metadata: { campaignId: campaign.id, scheduledFor: campaign.scheduledFor },
        },
      }),
    ]);
  },

  async dispatchScheduledCampaign(
    rafflePrisma: RafflePrismaClient,
    storePrisma: StorePrismaClient,
    campaignId: string,
    force = false,
  ) {
    const campaign = await rafflePrisma.raffleDrawReminderCampaign.findUnique({
      where: { id: campaignId },
      include: { recipients: true },
    });
    if (!campaign) return null;
    if (!force && campaign.scheduledFor && campaign.scheduledFor > new Date()) {
      await enqueueScheduledDispatch(campaign.id, campaign.scheduledFor);
      return campaign;
    }
    if (campaign.recipients.length > 0) return resume(rafflePrisma, campaign);

    const [{ raffle, recipients }, templates] = await Promise.all([
      buildRecipients(rafflePrisma, campaign.raffleId),
      resolveTemplate(storePrisma),
    ]);
    const prepared = await rafflePrisma.raffleDrawReminderCampaign.update({
      where: { id: campaign.id },
      data: {
        templateContent: templates.templateContent,
        principalTemplateContent: templates.principalTemplateContent,
        totalRecipients: recipients.length,
        failedCount: recipients.filter((recipient) => recipient.status === RaffleResultRecipientStatus.FAILED).length,
        completedAt: recipients.length ? null : new Date(),
        status: recipients.length ? RaffleResultCampaignStatus.QUEUED : RaffleResultCampaignStatus.EMPTY,
        recipients: { create: recipients.map((recipient) => ({ ...recipient, payload: recipient.payload as Prisma.InputJsonValue })) },
      },
      include: { recipients: true },
    });
    await rafflePrisma.raffleResultEvent.create({
      data: {
        raffleId: raffle.id,
        eventType: "DRAW_REMINDER_DISPATCHED",
        message: `Se ejecutó el aviso programado para ${recipients.length} destinatario(s).`,
        metadata: { campaignId: prepared.id, scheduledFor: prepared.scheduledFor },
      },
    });
    return resume(rafflePrisma, prepared);
  },

  async reconcileScheduledCampaigns(rafflePrisma: RafflePrismaClient, storePrisma: StorePrismaClient) {
    const campaigns = await rafflePrisma.raffleDrawReminderCampaign.findMany({
      where: { scheduledFor: { lte: new Date() }, status: RaffleResultCampaignStatus.QUEUED, recipients: { none: {} } },
      select: { id: true },
    });
    for (const campaign of campaigns) {
      await this.dispatchScheduledCampaign(rafflePrisma, storePrisma, campaign.id);
    }
    return { dispatched: campaigns.length };
  },
};
