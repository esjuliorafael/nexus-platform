import {
  Prisma,
  PrismaClient as RafflePrismaClient,
  RaffleResultCampaignStatus,
  RaffleResultRecipientStatus,
} from "@prisma/client-raffle";
import type { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import type { AuditActor } from "../../../utils/admin-authorization";
import { raffleAudienceRulesSchema, type RaffleAudienceRules } from "../intelligence/raffle-audience.schema";
import { raffleAudienceService } from "../intelligence/raffle-audience.service";
import { deriveRaffleResultCampaignStatus } from "./raffle-result-communication.utils";
import { ensureRaffleWhatsappHeader } from "./raffle-whatsapp-media.service";

const DEFAULT_AUDIENCE_NAME = "Participantes pagados";
const DEFAULT_AUDIENCE_RULES: RaffleAudienceRules = { minPaidParticipations: 1 };
const AUTHORIZED_AUDIENCE_NAME = "Participantes autorizados";
const AUTHORIZED_AUDIENCE_RULES: RaffleAudienceRules = {};
export type RaffleInvitationAudiencePreset =
  | "PAID_PARTICIPANTS"
  | "AUTHORIZED_PARTICIPANTS";
const TEMPLATE_KEY = "whatsapp_global_raffle_invitation";
const DEFAULT_INVITATION_TEMPLATE = `¡Hola, {{customer_name}}! 🎟️

Tenemos una nueva rifa que podría interesarte:

{{raffle_name}}

📅 Apertura: {{opening_date}}
💰 Precio por boleto: \${{ticket_price}} MXN

Consulta los premios y selecciona tus boletos:

{{raffle_url}}

Los boletos están sujetos a disponibilidad.

Si prefieres no recibir próximas invitaciones, responde BAJA.`;

const storefrontRaffleUrl = (raffleId: number) => {
  const baseUrl = (
    process.env.STOREFRONT_HTTPS_URL ||
    process.env.STOREFRONT_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
  return `${baseUrl}/raffles/${raffleId}`;
};

const formatOpeningDate = (value: Date | null) =>
  value
    ? value.toLocaleString("es-MX", {
        timeZone: "America/Mexico_City",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Disponible ahora";

const formatPrice = (value: unknown) =>
  Number(value || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

async function resolveAudience(
  rafflePrisma: RafflePrismaClient,
  audienceId?: string | null,
  audiencePreset: RaffleInvitationAudiencePreset = "PAID_PARTICIPANTS",
) {
  if (!audienceId) {
    if (audiencePreset === "AUTHORIZED_PARTICIPANTS") {
      return {
        id: null,
        name: AUTHORIZED_AUDIENCE_NAME,
        rules: AUTHORIZED_AUDIENCE_RULES,
      };
    }
    return {
      id: null,
      name: DEFAULT_AUDIENCE_NAME,
      rules: DEFAULT_AUDIENCE_RULES,
    };
  }
  const audience = await rafflePrisma.raffleAudience.findUnique({
    where: { id: audienceId },
  });
  if (!audience || !audience.active) throw new Error("RAFFLE_AUDIENCE_NOT_FOUND");
  return {
    id: audience.id,
    name: audience.name,
    rules: raffleAudienceRulesSchema.parse(audience.rules),
  };
}

async function resolveTemplate(storePrisma: StorePrismaClient) {
  const setting = await storePrisma.setting.findUnique({
    where: { key: TEMPLATE_KEY },
  });
  const template = setting?.value?.trim() || DEFAULT_INVITATION_TEMPLATE;
  if (!template) throw new Error("RAFFLE_INVITATION_TEMPLATE_MISSING");
  return template;
}

export async function refreshRaffleInvitationCampaign(
  rafflePrisma: RafflePrismaClient,
  campaignId: string,
) {
  const grouped = await rafflePrisma.raffleInvitationRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: { _all: true },
  });
  const count = (status: RaffleResultRecipientStatus) =>
    grouped.find((group) => group.status === status)?._count._all || 0;
  const sentCount = count(RaffleResultRecipientStatus.SENT);
  const failedCount = count(RaffleResultRecipientStatus.FAILED);
  const processingCount =
    count(RaffleResultRecipientStatus.PENDING) +
    count(RaffleResultRecipientStatus.PROCESSING);
  return rafflePrisma.raffleInvitationCampaign.update({
    where: { id: campaignId },
    data: {
      status: deriveRaffleResultCampaignStatus({
        sentCount,
        failedCount,
        processingCount,
      }),
      totalRecipients: sentCount + failedCount + processingCount,
      sentCount,
      failedCount,
      completedAt: processingCount === 0 ? new Date() : null,
    },
  });
}

async function enqueueRecipients(
  rafflePrisma: RafflePrismaClient,
  recipientIds: string[],
) {
  for (const recipientId of recipientIds) {
    const recipient = await rafflePrisma.raffleInvitationRecipient.findUnique({
      where: { id: recipientId },
      select: { id: true, phone: true, attempts: true },
    });
    if (!recipient) continue;
    await whatsappQueue.add(
      "raffle-invitation",
      {
        kind: "raffle-invitation",
        campaignRecipientId: recipient.id,
        recipientPhone: recipient.phone,
      },
      { jobId: `raffle-invitation-${recipient.id}-${recipient.attempts + 1}` },
    );
  }
}

async function campaignView(
  rafflePrisma: RafflePrismaClient,
  storePrisma: StorePrismaClient,
  campaignId: string,
) {
  const campaign = await rafflePrisma.raffleInvitationCampaign.findUnique({
    where: { id: campaignId },
    include: { recipients: { orderBy: { customerName: "asc" } } },
  });
  if (!campaign) return null;
  const logIds = campaign.recipients
    .map((recipient) => recipient.messageLogId)
    .filter((id): id is number => id !== null);
  const logs = logIds.length
    ? await storePrisma.whatsappMessageLog.findMany({ where: { id: { in: logIds } } })
    : [];
  const byId = new Map(logs.map((log) => [log.id, log]));
  let changed = false;
  for (const recipient of campaign.recipients) {
    if (!recipient.messageLogId) continue;
    const log = byId.get(recipient.messageLogId);
    if (!log) continue;
    const providerState = String(log.providerStatus || log.status).toLowerCase();
    const nextStatus = ["sent", "delivered", "read", "server_ack"].includes(
      providerState,
    )
      ? RaffleResultRecipientStatus.SENT
      : providerState === "failed"
        ? RaffleResultRecipientStatus.FAILED
        : null;
    if (nextStatus && nextStatus !== recipient.status) {
      await rafflePrisma.raffleInvitationRecipient.update({
        where: { id: recipient.id },
        data: {
          status: nextStatus,
          sentAt:
            nextStatus === RaffleResultRecipientStatus.SENT
              ? recipient.sentAt || new Date()
              : recipient.sentAt,
          lastError:
            nextStatus === RaffleResultRecipientStatus.FAILED
              ? log.errorMessage || "El proveedor no entregó la invitación."
              : null,
        },
      });
      recipient.status = nextStatus;
      changed = true;
    }
  }
  if (changed) {
    await refreshRaffleInvitationCampaign(rafflePrisma, campaign.id);
    return campaignView(rafflePrisma, storePrisma, campaign.id);
  }
  return {
    ...campaign,
    recipients: campaign.recipients.map((recipient) => ({
      ...recipient,
      messageLog: recipient.messageLogId ? byId.get(recipient.messageLogId) || null : null,
    })),
  };
}

export const raffleInvitationCampaignService = {
  async getOverview(
    rafflePrisma: RafflePrismaClient,
    storePrisma: StorePrismaClient,
    raffleId: number,
    audienceId?: string | null,
    frequencyWindowDays = 0,
    audiencePreset: RaffleInvitationAudiencePreset = "PAID_PARTICIPANTS",
  ) {
    const raffle = await rafflePrisma.raffle.findUnique({ where: { id: raffleId } });
    if (!raffle) return null;
    const audience = await resolveAudience(rafflePrisma, audienceId, audiencePreset);
    const selection = await raffleAudienceService.selectEligible(
      rafflePrisma,
      storePrisma,
      {
        rules: audience.rules,
        targetRaffleId: raffleId,
        frequencyWindowDays,
      },
    );
    const previousRecipients =
      await rafflePrisma.raffleInvitationRecipient.findMany({
        where: { campaign: { raffleId } },
        select: { phone: true },
      });
    const previouslyTargeted = new Set(
      previousRecipients.map(({ phone }) => phone),
    );
    selection.eligible = selection.eligible.filter(
      (profile) => !previouslyTargeted.has(profile.phone),
    );
    selection.summary.eligible = selection.eligible.length;
    const campaigns = await rafflePrisma.raffleInvitationCampaign.findMany({
      where: { raffleId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true },
    });
    return {
      raffleId,
      audience,
      preview: { summary: selection.summary, sample: selection.sample },
      campaigns: (
        await Promise.all(
          campaigns.map((campaign) =>
            campaignView(rafflePrisma, storePrisma, campaign.id),
          ),
        )
      ).filter(Boolean),
    };
  },

  async createCampaign(
    rafflePrisma: RafflePrismaClient,
    storePrisma: StorePrismaClient,
    raffleId: number,
    input: {
      audienceId?: string | null;
      frequencyWindowDays: number;
      audiencePreset?: RaffleInvitationAudiencePreset;
    },
    actor: AuditActor,
  ) {
    const [raffle, audience, template] = await Promise.all([
      rafflePrisma.raffle.findUnique({
        where: { id: raffleId },
        select: {
          id: true,
          title: true,
          ticketPrice: true,
          participationStartsAt: true,
          image: true,
          imageType: true,
          imagePoster: true,
          whatsappHeaderUrl: true,
        },
      }),
      resolveAudience(rafflePrisma, input.audienceId, input.audiencePreset),
      resolveTemplate(storePrisma),
    ]);
    if (!raffle) throw new Error("RAFFLE_NOT_FOUND");
    const selection = await raffleAudienceService.selectEligible(
      rafflePrisma,
      storePrisma,
      {
        rules: audience.rules,
        targetRaffleId: raffleId,
        frequencyWindowDays: input.frequencyWindowDays,
      },
    );
    const previousRecipients =
      await rafflePrisma.raffleInvitationRecipient.findMany({
        where: { campaign: { raffleId } },
        select: { phone: true },
      });
    const previouslyTargeted = new Set(
      previousRecipients.map(({ phone }) => phone),
    );
    selection.eligible = selection.eligible.filter(
      (profile) => !previouslyTargeted.has(profile.phone),
    );
    selection.summary.eligible = selection.eligible.length;
    const url = storefrontRaffleUrl(raffleId);
    const openingDate = formatOpeningDate(raffle.participationStartsAt);
    const ticketPrice = formatPrice(raffle.ticketPrice);
    const coverSource =
      raffle.imageType === "VIDEO"
        ? raffle.imagePoster || raffle.image
        : raffle.image;
    let mediaHeaderUrl = raffle.whatsappHeaderUrl;
    if (!mediaHeaderUrl) {
      try {
        mediaHeaderUrl = await ensureRaffleWhatsappHeader(raffleId, coverSource);
        if (mediaHeaderUrl) {
          await rafflePrisma.raffle.update({
            where: { id: raffleId },
            data: { whatsappHeaderUrl: mediaHeaderUrl },
          });
        }
      } catch (error) {
        console.warn(
          `No se pudo preparar la portada de WhatsApp para la rifa ${raffleId}:`,
          error,
        );
      }
    }
    const campaign = await rafflePrisma.$transaction(async (tx) => {
      const created = await tx.raffleInvitationCampaign.create({
        data: {
          raffleId,
          audienceId: audience.id,
          audienceName: audience.name,
          audienceRules: audience.rules as Prisma.InputJsonValue,
          frequencyWindowDays: input.frequencyWindowDays,
          status:
            selection.eligible.length > 0
              ? RaffleResultCampaignStatus.QUEUED
              : RaffleResultCampaignStatus.EMPTY,
          templateContent: template,
          principalTemplateContent: template,
          totalRecipients: selection.eligible.length,
          initiatedByUserId: actor.userId ?? null,
          initiatedByName: actor.name,
          initiatedByRole: actor.role ?? null,
          completedAt: selection.eligible.length ? null : new Date(),
        },
      });
      if (selection.eligible.length) {
        await tx.raffleInvitationRecipient.createMany({
          data: selection.eligible.map((profile) => ({
            campaignId: created.id,
            phone: profile.phone,
            customerName: profile.displayName,
            payload: {
              customer_name: profile.displayName,
              raffle_name: raffle.title,
              opening_date: openingDate,
              ticket_price: ticketPrice,
              raffle_url: url,
              media_header_url: mediaHeaderUrl || "",
            } as Prisma.InputJsonValue,
          })),
        });
      }
      return created;
    });
    const recipients = await rafflePrisma.raffleInvitationRecipient.findMany({
      where: { campaignId: campaign.id },
      select: { id: true },
    });
    await enqueueRecipients(rafflePrisma, recipients.map(({ id }) => id));
    return campaignView(rafflePrisma, storePrisma, campaign.id);
  },

  async retryFailed(
    rafflePrisma: RafflePrismaClient,
    storePrisma: StorePrismaClient,
    raffleId: number,
    campaignId: string,
  ) {
    const campaign = await rafflePrisma.raffleInvitationCampaign.findFirst({
      where: { id: campaignId, raffleId },
      include: { recipients: true },
    });
    if (!campaign) throw new Error("RAFFLE_INVITATION_CAMPAIGN_NOT_FOUND");
    const retryable = campaign.recipients.filter(
      (recipient) => recipient.status === RaffleResultRecipientStatus.FAILED,
    );
    if (!retryable.length) throw new Error("NO_RETRYABLE_RECIPIENTS");
    await rafflePrisma.raffleInvitationRecipient.updateMany({
      where: { id: { in: retryable.map(({ id }) => id) } },
      data: { status: RaffleResultRecipientStatus.PENDING, lastError: null },
    });
    await enqueueRecipients(rafflePrisma, retryable.map(({ id }) => id));
    await refreshRaffleInvitationCampaign(rafflePrisma, campaign.id);
    return campaignView(rafflePrisma, storePrisma, campaign.id);
  },
};
