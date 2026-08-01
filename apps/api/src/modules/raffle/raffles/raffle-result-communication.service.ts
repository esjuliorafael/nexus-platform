import {
  Prisma,
  PrismaClient as RafflePrismaClient,
  RafflePrizeFulfillmentStatus,
  RaffleResultCampaignAudience,
  RaffleResultCampaignStatus,
  RaffleResultRecipientStatus,
  TicketStatus,
} from "@prisma/client-raffle";
import type { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import { kapsoClient } from "../../../services/kapso/kapso.client";
import { getKapsoConfigForChannel } from "../../../services/kapso/kapso.config";
import { getKapsoWebhookError } from "../../../services/kapso/kapso-webhook";
import { buildWhatsappAsyncFallbackPatch } from "../../../services/whatsapp/whatsapp-async-fallback";
import {
  auditActorData,
  type AuditActor,
} from "../../../utils/admin-authorization";
import {
  customerPhoneIdentity,
  normalizeCustomerPhone,
} from "../../../utils/customer-phone";
import {
  classifyResultProviderState,
  deriveRaffleResultCampaignStatus,
  rafflePrizePlaceLabel,
  renderRaffleResultList,
} from "./raffle-result-communication.utils";

const TEMPLATE_CONFIG = {
  WINNERS: {
    type: "RESULT_WINNER",
    globalKey: "whatsapp_global_raffle_winner",
  },
  PARTICIPANTS: {
    type: "RESULT_PARTICIPANTS",
    globalKey: "whatsapp_global_raffle_results",
  },
} as const;

// Result communications are operational, but still fan out to a full raffle audience.
// Stagger them to avoid treating a newly connected WhatsApp line as a bulk sender.
const RESULT_CAMPAIGN_RECIPIENT_DELAY_MS = 90_000;

async function reconcileKapsoResultLogs(
  storePrisma: StorePrismaClient,
  logs: Array<any>,
) {
  return Promise.all(
    logs.map(async (log) => {
      if (
        log.provider !== "KAPSO" ||
        !log.messageId ||
        ["delivered", "read", "failed"].includes(
          String(log.status || "").toLowerCase(),
        )
      ) {
        return log;
      }
      if (
        log.lastStatusAt &&
        new Date(log.lastStatusAt).getTime() > Date.now() - 15_000
      ) {
        return log;
      }

      const phoneNumberId = String(log.instanceName || "").replace(
        /^kapso:/,
        "",
      );
      const config = getKapsoConfigForChannel({ phoneNumberId });
      if (!config) return log;

      try {
        const response: any = await kapsoClient.getMessage(
          config,
          log.messageId,
        );
        const message = response?.data || response;
        const remoteStatus = String(
          message?.kapso?.status || "pending",
        ).toLowerCase();
        const status = ["sent", "delivered", "read", "failed"].includes(
          remoteStatus,
        )
          ? remoteStatus
          : "pending";
        const previousPayload =
          log.responsePayload &&
          typeof log.responsePayload === "object" &&
          !Array.isArray(log.responsePayload)
            ? log.responsePayload
            : {};
        const updatedLog = await storePrisma.whatsappMessageLog.update({
          where: { id: log.id },
          data: {
            status,
            providerStatus: remoteStatus,
            lastStatusAt: new Date(),
            errorMessage:
              status === "failed"
                ? getKapsoWebhookError({ message }) ||
                  "Kapso reportó que Meta no pudo entregar el mensaje."
                : null,
            responsePayload: {
              provider: "KAPSO",
              payload: message,
              nexusRouting: previousPayload.nexusRouting || { route: "DIRECT" },
            } as any,
          },
        });
        if (status === "failed" && log.jobId) {
          const originalJob = await whatsappQueue.getJob(log.jobId);
          const routing =
            previousPayload.nexusRouting &&
            typeof previousPayload.nexusRouting === "object"
              ? (previousPayload.nexusRouting as Record<string, unknown>)
              : null;
          const fallbackPatch = originalJob
            ? buildWhatsappAsyncFallbackPatch({
                failedProvider: "KAPSO",
                routing: routing as any,
                originalJob: originalJob.data,
              })
            : null;
          if (originalJob && fallbackPatch) {
            await whatsappQueue.add(
              `${originalJob.name}-kapso-fallback`,
              {
                ...originalJob.data,
                ...fallbackPatch,
                fallbackOfMessageId: log.messageId,
              },
              { jobId: `kapso-fallback-${log.messageId}` },
            );
          }
        }
        return updatedLog;
      } catch (error: any) {
        console.warn(
          `[Kapso] No se pudo reconciliar el mensaje ${log.messageId}:`,
          error?.message,
        );
        return log;
      }
    }),
  );
}

type CampaignAudience = keyof typeof TEMPLATE_CONFIG;

type RecipientDraft = {
  phone: string;
  customerName: string;
  participationIds: string[];
  payload: Record<string, string>;
  status: RaffleResultRecipientStatus;
  lastError?: string | null;
};

const storefrontRaffleUrl = (raffleId: number) => {
  const baseUrl = (
    process.env.STOREFRONT_HTTPS_URL ||
    process.env.STOREFRONT_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
  return `${baseUrl}/raffles/${raffleId}`;
};

const resolveTemplateSnapshot = async (
  storePrisma: StorePrismaClient,
  audience: CampaignAudience,
) => {
  const config = TEMPLATE_CONFIG[audience];
  const setting = await storePrisma.setting.findUnique({
    where: { key: config.globalKey },
  });
  const principalTemplate = setting?.value?.trim() || "";
  const templateContent = principalTemplate;
  if (!templateContent) throw new Error("RAFFLE_RESULT_TEMPLATE_MISSING");
  return {
    templateContent,
    principalTemplateContent: principalTemplate,
  };
};

const buildRecipientDrafts = async (
  rafflePrisma: RafflePrismaClient,
  raffleId: number,
  audience: CampaignAudience,
) => {
  const raffle = await rafflePrisma.raffle.findUnique({
    where: { id: raffleId },
    include: {
      prizes: { orderBy: { position: "asc" } },
      ticketSales: {
        where: { paymentStatus: TicketStatus.PAID },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!raffle) throw new Error("RAFFLE_NOT_FOUND");
  if (!raffle.resultPublishedAt) {
    throw new Error("RAFFLE_RESULT_NOT_PUBLISHED");
  }

  const paidSalesByParticipation = new Map<string, typeof raffle.ticketSales>();
  raffle.ticketSales.forEach((sale) => {
    if (!sale.reservationId) return;
    const current = paidSalesByParticipation.get(sale.reservationId) || [];
    current.push(sale);
    paidSalesByParticipation.set(sale.reservationId, current);
  });

  const eligiblePrizes = raffle.prizes.filter(
    (prize) =>
      prize.resultResolutionStatus === "ELIGIBLE_WINNER" &&
      prize.winningParticipationId,
  );
  const winnerPhoneIdentities = new Set<string>();
  eligiblePrizes.forEach((prize) => {
    const sale = paidSalesByParticipation.get(
      prize.winningParticipationId!,
    )?.[0];
    if (sale)
      winnerPhoneIdentities.add(customerPhoneIdentity(sale.customerPhone));
  });

  const recipients = new Map<string, RecipientDraft>();
  if (audience === "WINNERS") {
    eligiblePrizes.forEach((prize) => {
      const participationId = prize.winningParticipationId!;
      const sales = paidSalesByParticipation.get(participationId) || [];
      const sale = sales[0];
      if (!sale) return;
      const identity = customerPhoneIdentity(sale.customerPhone);
      const normalizedPhone = normalizeCustomerPhone(sale.customerPhone);
      const current = recipients.get(identity);
      const linkedPrizes = eligiblePrizes.filter(
        (candidate) => candidate.winningParticipationId === participationId,
      );
      const participationIds = Array.from(
        new Set([...(current?.participationIds || []), participationId]),
      );
      recipients.set(identity, {
        phone: normalizedPhone || sale.customerPhone,
        customerName: sale.customerName,
        participationIds,
        status: normalizedPhone
          ? RaffleResultRecipientStatus.PENDING
          : RaffleResultRecipientStatus.FAILED,
        lastError: normalizedPhone
          ? null
          : "El número de WhatsApp no tiene un formato internacional válido.",
        payload: {
          customer_name: sale.customerName,
          raffle_name: raffle.title,
          prize_list: linkedPrizes
            .map(
              (item) =>
                `${rafflePrizePlaceLabel(item.position)}: ${item.title}`,
            )
            .join("\n"),
          winning_number_list: linkedPrizes
            .map(
              (item) =>
                `${rafflePrizePlaceLabel(item.position)}: ${item.winningNumber} (boleto ${item.winningTicketNumber})`,
            )
            .join("\n"),
          ticket_list: Array.from(
            new Set(linkedPrizes.map((item) => item.winningTicketNumber)),
          )
            .filter(Boolean)
            .join(", "),
          raffle_url: storefrontRaffleUrl(raffle.id),
        },
      });
    });
  } else {
    raffle.ticketSales.forEach((sale) => {
      const identity = customerPhoneIdentity(sale.customerPhone);
      if (winnerPhoneIdentities.has(identity)) return;
      const normalizedPhone = normalizeCustomerPhone(sale.customerPhone);
      const participationId = sale.reservationId || `ticket-sale:${sale.id}`;
      const current = recipients.get(identity);
      recipients.set(identity, {
        phone: normalizedPhone || sale.customerPhone,
        customerName: current?.customerName || sale.customerName,
        participationIds: Array.from(
          new Set([...(current?.participationIds || []), participationId]),
        ),
        status: normalizedPhone
          ? RaffleResultRecipientStatus.PENDING
          : RaffleResultRecipientStatus.FAILED,
        lastError: normalizedPhone
          ? null
          : "El número de WhatsApp no tiene un formato internacional válido.",
        payload: {
          customer_name: current?.customerName || sale.customerName,
          raffle_name: raffle.title,
          result_list: renderRaffleResultList(raffle.prizes),
          raffle_url: storefrontRaffleUrl(raffle.id),
        },
      });
    });
  }

  return { raffle, recipients: Array.from(recipients.values()) };
};

export async function refreshRaffleResultCampaign(
  rafflePrisma: RafflePrismaClient,
  campaignId: string,
) {
  const grouped = await rafflePrisma.raffleResultRecipient.groupBy({
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
  const totalRecipients = sentCount + failedCount + processingCount;
  const status = deriveRaffleResultCampaignStatus({
    sentCount,
    failedCount,
    processingCount,
  });
  return rafflePrisma.raffleResultCampaign.update({
    where: { id: campaignId },
    data: {
      status,
      totalRecipients,
      sentCount,
      failedCount,
      completedAt: processingCount === 0 ? new Date() : null,
    },
  });
}

async function enqueueRecipients(
  rafflePrisma: RafflePrismaClient,
  campaignId: string,
  recipientIds: string[],
) {
  for (let index = 0; index < recipientIds.length; index += 1) {
    const recipientId = recipientIds[index];
    const recipient = await rafflePrisma.raffleResultRecipient.findUnique({
      where: { id: recipientId },
      select: { phone: true, attempts: true },
    });
    if (!recipient) continue;
    await whatsappQueue.add(
      "raffle-result-notification",
      {
        kind: "raffle-result",
        campaignRecipientId: recipientId,
        recipientPhone: recipient.phone,
      },
      {
        jobId: `raffle-result-${recipientId}-${recipient.attempts + 1}`,
        delay: index * RESULT_CAMPAIGN_RECIPIENT_DELAY_MS,
      },
    );
  }
}

async function resumeResultCampaign(
  rafflePrisma: RafflePrismaClient,
  campaign: {
    id: string;
    recipients: Array<{
      id: string;
      status: RaffleResultRecipientStatus;
    }>;
  },
) {
  const pendingIds = campaign.recipients
    .filter(
      (recipient) => recipient.status === RaffleResultRecipientStatus.PENDING,
    )
    .map((recipient) => recipient.id);
  await enqueueRecipients(rafflePrisma, campaign.id, pendingIds);
  await refreshRaffleResultCampaign(rafflePrisma, campaign.id);
  return rafflePrisma.raffleResultCampaign.findUnique({
    where: { id: campaign.id },
    include: { recipients: true },
  });
}

export const raffleResultCommunicationService = {
  async getOverview(
    rafflePrisma: RafflePrismaClient,
    storePrisma: StorePrismaClient,
    raffleId: number,
  ) {
    const raffle = await rafflePrisma.raffle.findUnique({
      where: { id: raffleId },
      include: {
        prizes: { orderBy: { position: "asc" } },
        resultCampaigns: {
          orderBy: { createdAt: "desc" },
          include: {
            recipients: { orderBy: { customerName: "asc" } },
          },
        },
      },
    });
    if (!raffle) return null;
    const audienceData = raffle.resultPublishedAt
      ? await Promise.all(
          (["WINNERS", "PARTICIPANTS"] as const).map(async (audience) => {
            const [{ recipients }, templateConfigured] = await Promise.all([
              buildRecipientDrafts(rafflePrisma, raffleId, audience),
              resolveTemplateSnapshot(storePrisma, audience)
                .then(() => true)
                .catch((error) => {
                  if (error?.message === "RAFFLE_RESULT_TEMPLATE_MISSING") {
                    return false;
                  }
                  throw error;
                }),
            ]);
            return {
              audience,
              totalRecipients: recipients.length,
              invalidRecipients: recipients.filter(
                (recipient) =>
                  recipient.status === RaffleResultRecipientStatus.FAILED,
              ).length,
              templateConfigured,
            };
          }),
        )
      : [];
    const messageLogIds = raffle.resultCampaigns.flatMap((campaign) =>
      campaign.recipients
        .map((recipient) => recipient.messageLogId)
        .filter((id): id is number => Boolean(id)),
    );
    const storedLogs = messageLogIds.length
      ? await storePrisma.whatsappMessageLog.findMany({
          where: { id: { in: messageLogIds } },
        })
      : [];
    const logs = await reconcileKapsoResultLogs(storePrisma, storedLogs);
    const logById = new Map(logs.map((log) => [log.id, log]));

    for (const campaign of raffle.resultCampaigns) {
      let campaignChanged = false;
      for (const recipient of campaign.recipients) {
        const messageLog = recipient.messageLogId
          ? logById.get(recipient.messageLogId)
          : null;
        if (!messageLog) continue;

        const providerState = classifyResultProviderState(messageLog);
        const providerStatus = String(messageLog.status || "").toLowerCase();
        const nextStatus =
          providerState === "FAILED"
            ? RaffleResultRecipientStatus.FAILED
            : ["sent", "delivered", "read"].includes(providerStatus)
              ? RaffleResultRecipientStatus.SENT
              : messageLog.provider === "KAPSO"
                ? RaffleResultRecipientStatus.PROCESSING
                : recipient.status;
        const nextError =
          nextStatus === RaffleResultRecipientStatus.FAILED
            ? messageLog.errorMessage || "El proveedor no entregó el mensaje."
            : null;

        if (
          recipient.status !== nextStatus ||
          recipient.lastError !== nextError
        ) {
          await rafflePrisma.raffleResultRecipient.update({
            where: { id: recipient.id },
            data: {
              status: nextStatus,
              lastError: nextError,
              sentAt:
                nextStatus === RaffleResultRecipientStatus.SENT
                  ? recipient.sentAt || new Date()
                  : null,
            },
          });
          recipient.status = nextStatus;
          recipient.lastError = nextError;
          recipient.sentAt =
            nextStatus === RaffleResultRecipientStatus.SENT
              ? recipient.sentAt || new Date()
              : null;
          campaignChanged = true;
        }
      }
      if (campaignChanged) {
        const refreshed = await refreshRaffleResultCampaign(
          rafflePrisma,
          campaign.id,
        );
        campaign.status = refreshed.status;
        campaign.sentCount = refreshed.sentCount;
        campaign.failedCount = refreshed.failedCount;
        campaign.completedAt = refreshed.completedAt;
      }
    }

    return {
      raffleId,
      resultPublishedAt: raffle.resultPublishedAt,
      prizes: raffle.prizes,
      audienceEstimates: audienceData,
      campaigns: raffle.resultCampaigns.map((campaign) => {
        const recipients = campaign.recipients.map((recipient) => ({
          ...recipient,
          messageLog: recipient.messageLogId
            ? logById.get(recipient.messageLogId) || null
            : null,
        }));
        const deliveredCount = recipients.filter(
          (recipient) =>
            classifyResultProviderState(recipient.messageLog) === "DELIVERED",
        ).length;
        const providerFailedCount = recipients.filter(
          (recipient) =>
            classifyResultProviderState(recipient.messageLog) === "FAILED",
        ).length;
        const acceptedCount = recipients.filter(
          (recipient) =>
            classifyResultProviderState(recipient.messageLog) === "ACCEPTED",
        ).length;
        return {
          ...campaign,
          deliveredCount,
          providerFailedCount,
          acceptedCount,
          recipients,
        };
      }),
    };
  },

  async createCampaign(
    rafflePrisma: RafflePrismaClient,
    storePrisma: StorePrismaClient,
    raffleId: number,
    audience: CampaignAudience,
    actor: AuditActor,
  ) {
    const { raffle, recipients } = await buildRecipientDrafts(
      rafflePrisma,
      raffleId,
      audience,
    );
    const existing = await rafflePrisma.raffleResultCampaign.findUnique({
      where: {
        raffleId_audience_resultPublishedAt: {
          raffleId,
          audience: audience as RaffleResultCampaignAudience,
          resultPublishedAt: raffle.resultPublishedAt!,
        },
      },
      include: { recipients: true },
    });
    if (existing) return resumeResultCampaign(rafflePrisma, existing);

    const templates = await resolveTemplateSnapshot(storePrisma, audience);
    let created;
    try {
      created = await rafflePrisma.$transaction(async (tx) => {
        const campaign = await tx.raffleResultCampaign.create({
          data: {
            raffleId,
            audience: audience as RaffleResultCampaignAudience,
            status:
              recipients.length === 0
                ? RaffleResultCampaignStatus.EMPTY
                : RaffleResultCampaignStatus.QUEUED,
            resultPublishedAt: raffle.resultPublishedAt!,
            ...templates,
            totalRecipients: recipients.length,
            failedCount: recipients.filter(
              (recipient) =>
                recipient.status === RaffleResultRecipientStatus.FAILED,
            ).length,
            initiatedByUserId: actor.userId ?? null,
            initiatedByName: actor.name,
            initiatedByRole: actor.role ?? null,
            completedAt: recipients.length === 0 ? new Date() : null,
            recipients: {
              create: recipients.map((recipient) => ({
                ...recipient,
                payload: recipient.payload as Prisma.InputJsonValue,
              })),
            },
          },
          include: { recipients: true },
        });
        await tx.raffleResultEvent.create({
          data: {
            raffleId,
            eventType:
              audience === "WINNERS"
                ? "WINNER_NOTIFICATION_QUEUED"
                : "PARTICIPANT_NOTIFICATION_QUEUED",
            message:
              audience === "WINNERS"
                ? `Se preparó la comunicación para ${recipients.length} ganador(es).`
                : `Se preparó la comunicación para ${recipients.length} participante(s).`,
            ...auditActorData(actor),
            metadata: {
              campaignId: campaign.id,
              audience,
              totalRecipients: recipients.length,
            },
          },
        });
        return campaign;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrent = await rafflePrisma.raffleResultCampaign.findUnique({
          where: {
            raffleId_audience_resultPublishedAt: {
              raffleId,
              audience: audience as RaffleResultCampaignAudience,
              resultPublishedAt: raffle.resultPublishedAt!,
            },
          },
          include: { recipients: true },
        });
        return concurrent
          ? resumeResultCampaign(rafflePrisma, concurrent)
          : null;
      }
      throw error;
    }

    return resumeResultCampaign(rafflePrisma, created);
  },

  async retryFailed(
    rafflePrisma: RafflePrismaClient,
    storePrisma: StorePrismaClient,
    raffleId: number,
    campaignId: string,
    actor: AuditActor,
  ) {
    const campaign = await rafflePrisma.raffleResultCampaign.findFirst({
      where: { id: campaignId, raffleId },
      include: { recipients: true },
    });
    if (!campaign) throw new Error("RAFFLE_RESULT_CAMPAIGN_NOT_FOUND");
    const messageLogIds = campaign.recipients
      .map((recipient) => recipient.messageLogId)
      .filter((id): id is number => Boolean(id));
    const logs = messageLogIds.length
      ? await storePrisma.whatsappMessageLog.findMany({
          where: { id: { in: messageLogIds } },
          select: { id: true, status: true, providerStatus: true },
        })
      : [];
    const logById = new Map(logs.map((log) => [log.id, log]));
    const retryable = campaign.recipients.filter(
      (recipient) =>
        Boolean(normalizeCustomerPhone(recipient.phone)) &&
        (recipient.status === RaffleResultRecipientStatus.FAILED ||
          classifyResultProviderState(
            recipient.messageLogId ? logById.get(recipient.messageLogId) : null,
          ) === "FAILED"),
    );
    if (!retryable.length) throw new Error("NO_RETRYABLE_RECIPIENTS");
    await rafflePrisma.raffleResultRecipient.updateMany({
      where: { id: { in: retryable.map((recipient) => recipient.id) } },
      data: {
        status: RaffleResultRecipientStatus.PENDING,
        lastError: null,
        messageLogId: null,
        sentAt: null,
      },
    });
    await rafflePrisma.raffleResultEvent.create({
      data: {
        raffleId: campaign.raffleId,
        eventType: "RESULT_NOTIFICATION_RETRIED",
        message: `Se reintentaron ${retryable.length} mensajes fallidos.`,
        ...auditActorData(actor),
        metadata: { campaignId, recipientCount: retryable.length },
      },
    });
    await enqueueRecipients(
      rafflePrisma,
      campaignId,
      retryable.map((recipient) => recipient.id),
    );
    await refreshRaffleResultCampaign(rafflePrisma, campaignId);
    return { retried: retryable.length };
  },

  async updatePrizeFulfillment(
    rafflePrisma: RafflePrismaClient,
    raffleId: number,
    prizeId: number,
    status: RafflePrizeFulfillmentStatus,
    notes: string | null,
    actor: AuditActor,
  ) {
    return rafflePrisma.$transaction(async (tx) => {
      const prize = await tx.rafflePrize.findFirst({
        where: { id: prizeId, raffleId },
      });
      if (!prize) throw new Error("RAFFLE_PRIZE_NOT_FOUND");
      if (!prize.resultPublishedAt) {
        throw new Error("RAFFLE_RESULT_NOT_PUBLISHED");
      }
      if (
        prize.resultResolutionStatus !== "ELIGIBLE_WINNER" &&
        status !== RafflePrizeFulfillmentStatus.NOT_APPLICABLE
      ) {
        throw new Error("PRIZE_HAS_NO_ELIGIBLE_WINNER");
      }
      const updated = await tx.rafflePrize.update({
        where: { id: prizeId },
        data: {
          fulfillmentStatus: status,
          fulfillmentUpdatedAt: new Date(),
          fulfillmentUpdatedBy: actor.userId ?? null,
          fulfillmentNotes: notes,
        },
      });
      await tx.raffleResultEvent.create({
        data: {
          raffleId,
          eventType: "PRIZE_FULFILLMENT_UPDATED",
          message: `${rafflePrizePlaceLabel(prize.position)}: seguimiento actualizado a ${status}.`,
          ...auditActorData(actor),
          previousState: {
            fulfillmentStatus: prize.fulfillmentStatus,
            fulfillmentNotes: prize.fulfillmentNotes,
          },
          nextState: { fulfillmentStatus: status, fulfillmentNotes: notes },
          metadata: { prizeId, position: prize.position },
        },
      });
      return updated;
    });
  },
};
