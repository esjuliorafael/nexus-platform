import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import { resolveChannels } from "../services/evolution/channel.resolver";
import { getEvolutionConfigFromSettings } from "../services/evolution/evolution.config";
import { normalizePrincipalInstanceName } from "../services/evolution/whatsapp-delivery.service";
import { sendBusinessWhatsappNotification } from "../services/whatsapp/whatsapp-business-delivery.service";
import type { WhatsappJobData } from "../queues/whatsapp.queue";
import type { OrderKind } from "../services/evolution/channel.resolver";
import { queueName } from "../queues/queue-name";
import { formatRaffleTicketList } from "../utils/raffle-ticket-list";
import { refreshRaffleResultCampaign } from "../modules/raffle/raffles/raffle-result-communication.service";
import {
  raffleDrawReminderService,
  refreshRaffleDrawReminderCampaign,
} from "../modules/raffle/raffles/raffle-draw-reminder.service";
import { refreshRaffleInvitationCampaign } from "../modules/raffle/raffles/raffle-invitation-campaign.service";
import { paymentRecoveryService } from "../services/payment-recovery.service";
import { isKapsoTenantDeliveryEnabled } from "../services/whatsapp/whatsapp-delivery-policy";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const whatsappWorker = new Worker<WhatsappJobData>(
  queueName("whatsapp-notifications"),
  async (job: Job<WhatsappJobData>) => {
    const { data } = job;
    if (data.kind === "raffle-draw-reminder-dispatch") {
      await raffleDrawReminderService.dispatchScheduledCampaign(
        rafflePrisma,
        storePrisma,
        data.campaignId,
      );
      return;
    }
    const forcePrincipal = data.forcePrincipal === true;
    const forceEvolution = data.forceEvolution === true;
    const forceProvider =
      data.forceProvider ||
      (forceEvolution ? ("EVOLUTION" as const) : undefined);

    // Load global Evolution settings, all active WhatsApp channels, and payment channels
    const [settings, waChannels, payChannels] = await Promise.all([
      storePrisma.setting.findMany({
        where: {
          key: {
            in: [
              "whatsapp_evolution_url",
              "whatsapp_evolution_key",
              "whatsapp_evolution_instance",
              "whatsapp_main_provider",
              "whatsapp_main_delivery_strategy",
              "whatsapp_kapso_delivery_enabled",
              "whatsapp_main_kapso_phone_number_id",
              "whatsapp_main_kapso_business_account_id",
              "whatsapp_global_store_res",
              "whatsapp_global_store_rel",
              "whatsapp_global_store_pay",
              "whatsapp_global_store_refunded",
              "whatsapp_global_store_payment_recovery",
              "whatsapp_global_store_restored",
              "whatsapp_global_store_reminder",
              "whatsapp_global_raffle_res",
              "whatsapp_global_raffle_restored",
              "whatsapp_global_raffle_rel",
              "whatsapp_global_raffle_pay",
              "whatsapp_global_raffle_refunded",
              "whatsapp_global_raffle_payment_recovery",
              "whatsapp_global_raffle_reminder",
              "whatsapp_global_raffle_opening",
              "whatsapp_global_raffle_draw_reminder",
              "whatsapp_global_raffle_invitation",
              "whatsapp_global_raffle_winner",
              "whatsapp_global_raffle_results",
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
      }),
      storePrisma.paymentChannel.findMany(),
    ]);

    const getSetting = (k: string) =>
      settings.find((s) => s.key === k)?.value ?? null;

    const envEvolutionConfig = await getEvolutionConfigFromSettings();
    const globalUrl =
      getSetting("whatsapp_evolution_url") || envEvolutionConfig.baseUrl;
    const globalKey =
      getSetting("whatsapp_evolution_key") || envEvolutionConfig.apiKey;
    const principalInstanceName = normalizePrincipalInstanceName(
      getSetting("whatsapp_evolution_instance"),
    );
    const principalInstance =
      principalInstanceName && globalUrl && globalKey
        ? {
            instanceName: principalInstanceName,
            baseUrl: globalUrl,
            apiKey: globalKey,
          }
        : null;
    // Specialized channels own their instance name; tenant-wide credentials are
    // the default unless a channel explicitly provides dedicated credentials.
    const resolvedWhatsappChannels = waChannels.map((channel) => ({
      ...channel,
      evolutionUrl: channel.evolutionUrl || globalUrl,
      evolutionKey: channel.evolutionKey || globalKey,
    }));
    const principalWhatsapp = {
      provider:
        !forceEvolution && getSetting("whatsapp_main_provider") === "KAPSO"
          ? ("KAPSO" as const)
          : ("EVOLUTION" as const),
      evolution: principalInstance,
      kapsoPhoneNumberId:
        getSetting("whatsapp_main_kapso_phone_number_id") || "",
      kapsoBusinessAccountId:
        getSetting("whatsapp_main_kapso_business_account_id") || "",
      deliveryStrategy:
        (getSetting("whatsapp_main_delivery_strategy") as
          | "STANDARD"
          | "KAPSO_PREFERRED"
          | "EVOLUTION_ONLY"
          | null) || "STANDARD",
    };
    const kapsoEnabled = isKapsoTenantDeliveryEnabled(
      getSetting("whatsapp_kapso_delivery_enabled"),
    );

    if (
      data.kind === "store-payment-recovery" ||
      data.kind === "raffle-payment-recovery"
    ) {
      const recoveryKind =
        data.kind === "store-payment-recovery" ? "store" : "raffle";
      const hold = await paymentRecoveryService.getForDelivery(
        recoveryKind,
        data.holdId,
        data.recoveryToken,
      );
      if (!hold) return;

      const isStore = recoveryKind === "store";
      const principalTemplate =
        getSetting(
          isStore
            ? "whatsapp_global_store_payment_recovery"
            : "whatsapp_global_raffle_payment_recovery",
        ) || "";
      const preferredChannel = isStore
        ? resolveChannels(
            resolvePaymentRecoveryOrderKind((hold as any).items),
            resolvedWhatsappChannels,
          ).whatsappChannel
        : resolvedWhatsappChannels.find(
            (channel) =>
              channel.purpose.toUpperCase() === "RAFFLES" && channel.active,
          ) || null;
      const template = principalTemplate;

      if (!template) {
        await storePrisma.whatsappMessageLog.create({
          data: {
            attempt: job.attemptsMade + 1,
            recipientPhone: data.recipientPhone,
            instanceName: preferredChannel?.instanceName || "missing",
            jobId: String(job.id ?? ""),
            templateUsed: isStore
              ? "store_payment_recovery"
              : "raffle_payment_recovery",
            status: "failed",
            errorMessage:
              "No hay plantilla de recuperacion de pago configurada.",
          },
        });
        return;
      }

      const recoveryUrl = paymentRecoveryService.buildRecoveryUrl(
        recoveryKind,
        hold,
        data.recoveryToken,
      );
      const values: Record<string, string> = isStore
        ? buildStorePaymentRecoveryValues(hold as any, recoveryUrl)
        : buildRafflePaymentRecoveryValues(hold as any, recoveryUrl);
      if (!isStore) {
        const raffleHold = hold as any;
        values.opportunity_count = String(raffleHold.raffle?.opportunities || 1);
        values.additional_opportunity_count = String(
          Math.max(0, Number(raffleHold.raffle?.opportunities || 1) - 1),
        );
      }
      const sent = await sendBusinessWhatsappNotification({
        preferredChannel,
        principal: principalWhatsapp,
        scope: isStore ? "STORE" : "RAFFLES",
        type: "PAYMENT_RECOVERY",
        sourceContent: template,
        principalSourceContent: principalTemplate,
        recipientPhone: data.recipientPhone,
        renderedText: renderTemplate(template, values),
        principalRenderedText: renderTemplate(
          principalTemplate || template,
          values,
        ),
        values,
        templateName: isStore
          ? "store_payment_recovery"
          : "raffle_payment_recovery",
        jobId: String(job.id ?? ""),
        attempt: job.attemptsMade + 1,
        forceProvider,
        kapsoEnabled,
      });
      if (sent) {
        await paymentRecoveryService.markSent(recoveryKind, data.holdId);
        if (!isStore) {
          const messageLog = await storePrisma.whatsappMessageLog.findFirst({
            where: { jobId: String(job.id ?? "") },
            orderBy: { id: "desc" },
            select: { id: true },
          });
          await rafflePrisma.rafflePaymentHold.update({
            where: { id: data.holdId },
            data: { recoveryMessageLogId: messageLog?.id ?? null },
          });
        }
      }
      return;
    }

    if (data.kind === "raffle-result") {
      const claimed = await rafflePrisma.raffleResultRecipient.updateMany({
        where: {
          id: data.campaignRecipientId,
          status: {
            in: data.fallbackOfMessageId
              ? ["PENDING", "FAILED", "PROCESSING"]
              : ["PENDING", "FAILED"],
          },
        },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      if (claimed.count === 0) return;

      const recipient = await rafflePrisma.raffleResultRecipient.findUnique({
        where: { id: data.campaignRecipientId },
        include: {
          campaign: {
            include: { raffle: true },
          },
        },
      });
      if (!recipient) return;

      const raffleChannel = resolvedWhatsappChannels.find(
        (channel) =>
          channel.purpose.toUpperCase() === "RAFFLES" && channel.active,
      );
      const values = { ...(recipient.payload as Record<string, string>) };
      const templateType =
        recipient.campaign.audience === "WINNERS"
          ? ("RESULT_WINNER" as const)
          : ("RESULT_PARTICIPANTS" as const);
      const templateName =
        recipient.campaign.audience === "WINNERS"
          ? "raffle_result_winner"
          : "raffle_result_participants";
      if (templateType === "RESULT_WINNER") {
        values.opportunity_count = String(recipient.campaign.raffle.opportunities || 1);
        values.additional_opportunity_count = String(
          Math.max(0, Number(recipient.campaign.raffle.opportunities || 1) - 1),
        );
      }
      const renderedText = renderTemplate(
        recipient.campaign.templateContent,
        values,
      );
      const principalRenderedText = renderTemplate(
        recipient.campaign.principalTemplateContent,
        values,
      );
      const winnerSales =
        templateType === "RESULT_WINNER"
          ? await rafflePrisma.ticketSale.findMany({
              where: {
                raffleId: recipient.campaign.raffleId,
                reservationId: { in: recipient.participationIds },
              },
              orderBy: { ticketNumber: "asc" },
            })
          : [];

      try {
        const sent = await sendBusinessWhatsappNotification({
          preferredChannel: forcePrincipal ? null : raffleChannel,
          principal: principalWhatsapp,
          scope: "RAFFLES",
          type: templateType,
          sourceContent: recipient.campaign.templateContent,
          principalSourceContent: recipient.campaign.principalTemplateContent,
          recipientPhone: recipient.phone,
          renderedText,
          principalRenderedText,
          values:
            templateType === "RESULT_WINNER"
              ? {
                  ...values,
                  ticket_list: formatRaffleTicketList(winnerSales),
                }
              : values,
          templateName,
          jobId: String(job.id ?? ""),
          attempt: recipient.attempts,
          forceProvider,
          kapsoEnabled,
        });
        if (!sent) {
          throw new Error(
            "No existe un proveedor de WhatsApp preparado para esta notificación.",
          );
        }
        const messageLog = await storePrisma.whatsappMessageLog.findFirst({
          where: { jobId: String(job.id ?? "") },
          orderBy: { id: "desc" },
        });
        const waitsForProviderResolution =
          messageLog?.provider === "KAPSO" &&
          ["accepted", "pending"].includes(
            String(
              messageLog.providerStatus || messageLog.status,
            ).toLowerCase(),
          );
        await rafflePrisma.raffleResultRecipient.update({
          where: { id: recipient.id },
          data: {
            status: waitsForProviderResolution ? "PROCESSING" : "SENT",
            sentAt: waitsForProviderResolution ? null : new Date(),
            messageLogId: messageLog?.id ?? null,
            lastError: null,
          },
        });
        await refreshRaffleResultCampaign(rafflePrisma, recipient.campaignId);
        return;
      } catch (error: any) {
        const message =
          error?.message || "No se pudo enviar la notificación de resultados.";
        const messageLog = await storePrisma.whatsappMessageLog.findFirst({
          where: { jobId: String(job.id ?? "") },
          orderBy: { id: "desc" },
        });
        await rafflePrisma.raffleResultRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "FAILED",
            lastError: message,
            messageLogId: messageLog?.id ?? null,
          },
        });
        await refreshRaffleResultCampaign(rafflePrisma, recipient.campaignId);
        throw error;
      }
    }

    if (data.kind === "raffle-draw-reminder") {
      const claimed = await rafflePrisma.raffleDrawReminderRecipient.updateMany(
        {
          where: {
            id: data.campaignRecipientId,
            status: {
              in: data.fallbackOfMessageId
                ? ["PENDING", "FAILED", "PROCESSING"]
                : ["PENDING", "FAILED"],
            },
          },
          data: {
            status: "PROCESSING",
            attempts: { increment: 1 },
            lastError: null,
          },
        },
      );
      if (claimed.count === 0) return;

      const recipient =
        await rafflePrisma.raffleDrawReminderRecipient.findUnique({
          where: { id: data.campaignRecipientId },
          include: { campaign: { include: { raffle: true } } },
        });
      if (!recipient) return;
      const raffleChannel = resolvedWhatsappChannels.find(
        (channel) =>
          channel.purpose.toUpperCase() === "RAFFLES" && channel.active,
      );
      const values = { ...(recipient.payload as Record<string, string>) };
      values.opportunity_count = String(recipient.campaign.raffle.opportunities || 1);
      values.additional_opportunity_count = String(
        Math.max(0, Number(recipient.campaign.raffle.opportunities || 1) - 1),
      );
      const sales = await rafflePrisma.ticketSale.findMany({
        where: {
          raffleId: recipient.campaign.raffleId,
          reservationId: { in: recipient.participationIds },
        },
        orderBy: { ticketNumber: "asc" },
      });
      const renderedText = renderTemplate(
        recipient.campaign.templateContent,
        values,
      );
      const principalRenderedText = renderTemplate(
        recipient.campaign.principalTemplateContent,
        values,
      );
      try {
        const sent = await sendBusinessWhatsappNotification({
          preferredChannel: forcePrincipal ? null : raffleChannel,
          principal: principalWhatsapp,
          scope: "RAFFLES",
          type: "DRAW_REMINDER",
          sourceContent: recipient.campaign.templateContent,
          principalSourceContent: recipient.campaign.principalTemplateContent,
          recipientPhone: recipient.phone,
          renderedText,
          principalRenderedText,
          values: {
            ...values,
            ticket_list: formatRaffleTicketList(sales),
          },
          templateName: "raffle_draw_reminder",
          jobId: String(job.id ?? ""),
          attempt: recipient.attempts,
          forceProvider,
          kapsoEnabled,
        });
        if (!sent)
          throw new Error(
            "No existe un proveedor de WhatsApp preparado para esta notificación.",
          );
        const messageLog = await storePrisma.whatsappMessageLog.findFirst({
          where: { jobId: String(job.id ?? "") },
          orderBy: { id: "desc" },
        });
        const waitsForProviderResolution =
          messageLog?.provider === "KAPSO" &&
          ["accepted", "pending"].includes(
            String(
              messageLog.providerStatus || messageLog.status,
            ).toLowerCase(),
          );
        await rafflePrisma.raffleDrawReminderRecipient.update({
          where: { id: recipient.id },
          data: {
            status: waitsForProviderResolution ? "PROCESSING" : "SENT",
            sentAt: waitsForProviderResolution ? null : new Date(),
            messageLogId: messageLog?.id ?? null,
            lastError: null,
          },
        });
        await refreshRaffleDrawReminderCampaign(
          rafflePrisma,
          recipient.campaignId,
        );
        return;
      } catch (error: any) {
        const messageLog = await storePrisma.whatsappMessageLog.findFirst({
          where: { jobId: String(job.id ?? "") },
          orderBy: { id: "desc" },
        });
        await rafflePrisma.raffleDrawReminderRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "FAILED",
            lastError:
              error?.message ||
              "No se pudo enviar el aviso del día de la rifa.",
            messageLogId: messageLog?.id ?? null,
          },
        });
        await refreshRaffleDrawReminderCampaign(
          rafflePrisma,
          recipient.campaignId,
        );
        throw error;
      }
    }

    if (data.kind === "raffle-invitation") {
      const claimed = await rafflePrisma.raffleInvitationRecipient.updateMany({
        where: {
          id: data.campaignRecipientId,
          status: {
            in: data.fallbackOfMessageId
              ? ["PENDING", "FAILED", "PROCESSING"]
              : ["PENDING", "FAILED"],
          },
        },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      if (claimed.count === 0) return;

      const recipient = await rafflePrisma.raffleInvitationRecipient.findUnique(
        {
          where: { id: data.campaignRecipientId },
          include: { campaign: true },
        },
      );
      if (!recipient) return;

      const raffleChannel = resolvedWhatsappChannels.find(
        (channel) =>
          channel.purpose.toUpperCase() === "RAFFLES" && channel.active,
      );
      const values = recipient.payload as Record<string, string>;
      const renderedText = renderTemplate(
        recipient.campaign.templateContent,
        values,
      );
      const principalRenderedText = renderTemplate(
        recipient.campaign.principalTemplateContent,
        values,
      );

      try {
        const sent = await sendBusinessWhatsappNotification({
          preferredChannel: forcePrincipal ? null : raffleChannel,
          principal: principalWhatsapp,
          scope: "RAFFLES",
          type: "RAFFLE_INVITATION",
          sourceContent: recipient.campaign.templateContent,
          principalSourceContent: recipient.campaign.principalTemplateContent,
          recipientPhone: recipient.phone,
          renderedText,
          principalRenderedText,
          values,
          mediaHeaderUrl: values.media_header_url || undefined,
          templateName: "raffle_invitation",
          jobId: String(job.id ?? ""),
          attempt: recipient.attempts,
          forceProvider,
          kapsoEnabled,
        });
        if (!sent) {
          throw new Error(
            "No existe un proveedor de WhatsApp preparado para esta invitación.",
          );
        }
        const messageLog = await storePrisma.whatsappMessageLog.findFirst({
          where: { jobId: String(job.id ?? "") },
          orderBy: { id: "desc" },
        });
        const waitsForProviderResolution =
          messageLog?.provider === "KAPSO" &&
          ["accepted", "pending"].includes(
            String(
              messageLog.providerStatus || messageLog.status,
            ).toLowerCase(),
          );
        await rafflePrisma.raffleInvitationRecipient.update({
          where: { id: recipient.id },
          data: {
            status: waitsForProviderResolution ? "PROCESSING" : "SENT",
            sentAt: waitsForProviderResolution ? null : new Date(),
            messageLogId: messageLog?.id ?? null,
            lastError: null,
          },
        });
        if (messageLog) {
          await storePrisma.whatsappMarketingPreference.updateMany({
            where: { phone: recipient.phone, status: "GRANTED" },
            data: { lastMarketingAt: new Date() },
          });
        }
        await refreshRaffleInvitationCampaign(
          rafflePrisma,
          recipient.campaignId,
        );
        return;
      } catch (error: any) {
        const message =
          error?.message || "No se pudo enviar la invitación de la rifa.";
        const messageLog = await storePrisma.whatsappMessageLog.findFirst({
          where: { jobId: String(job.id ?? "") },
          orderBy: { id: "desc" },
        });
        await rafflePrisma.raffleInvitationRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "FAILED",
            lastError: message,
            messageLogId: messageLog?.id ?? null,
          },
        });
        await refreshRaffleInvitationCampaign(
          rafflePrisma,
          recipient.campaignId,
        );
        throw error;
      }
    }

    if (
      data.kind === "order" ||
      data.kind === "order-cancelled" ||
      data.kind === "order-paid" ||
      data.kind === "order-refunded" ||
      data.kind === "order-restored" ||
      data.kind === "order-reminder"
    ) {
      const resolved = resolveChannels(
        data.orderKind,
        resolvedWhatsappChannels,
      );
      const wa = resolved.whatsappChannel;

      // Preserve the intended identity in configuration-error logs.
      const instanceName = forcePrincipal
        ? principalInstanceName
        : wa?.instanceName || principalInstanceName;

      const principalTemplate =
        data.kind === "order"
          ? getSetting("whatsapp_global_store_res") || ""
          : data.kind === "order-paid"
            ? getSetting("whatsapp_global_store_pay") || ""
            : data.kind === "order-refunded"
              ? getSetting("whatsapp_global_store_refunded") || ""
              : data.kind === "order-restored"
                ? getSetting("whatsapp_global_store_restored") || ""
                : data.kind === "order-reminder"
                  ? getSetting("whatsapp_global_store_reminder") || ""
                  : getSetting("whatsapp_global_store_rel") || "";

      const template = principalTemplate;

      if (!template) {
        console.warn(
          `[WhatsApp] No template found for order ${data.orderId}, kind: ${data.kind}`,
        );
        await storePrisma.whatsappMessageLog.create({
          data: {
            attempt: job.attemptsMade + 1,
            orderId: data.orderId,
            recipientPhone: data.recipientPhone,
            instanceName,
            jobId: String(job.id ?? ""),
            templateUsed: data.kind,
            status: "failed",
            errorMessage:
              "No hay plantilla de WhatsApp configurada para este tipo de notificación.",
          },
        });
        return;
      }

      // Fetch full order data to inject variables
      const order = await storePrisma.order.findUnique({
        where: { id: parseInt(data.orderId) },
        include: { items: true },
      });

      if (!order) {
        console.error(
          `[WhatsApp] Order ${data.orderId} not found for notification`,
        );
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
        paymentChannel =
          payChannels.find(
            (channel) => channel.purpose.toUpperCase() === orderPurpose,
          ) ?? null;
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
        .map((i) => `${i.quantity}x ${i.productName}`)
        .join("\n");

      const notification = buildOrderNotification(
        template,
        order,
        bankInfo,
        "timeLimit" in data ? data.timeLimit : undefined,
        itemList,
        "timeRemaining" in data && typeof data.timeRemaining === "string"
          ? data.timeRemaining
          : undefined,
      );

      await sendBusinessWhatsappNotification({
        preferredChannel: forcePrincipal ? null : wa,
        principal: principalWhatsapp,
        scope: "STORE",
        type:
          data.kind === "order"
            ? "RESERVATION"
            : data.kind === "order-paid"
              ? "PAYMENT_CONFIRMED"
              : data.kind === "order-refunded"
                ? "PAYMENT_REFUNDED"
                : data.kind === "order-restored"
                  ? "RESTORED"
                  : data.kind === "order-reminder"
                    ? "REMINDER"
                    : "RELEASE",
        sourceContent: template,
        principalSourceContent: principalTemplate,
        recipientPhone: data.recipientPhone,
        renderedText: notification.message,
        principalRenderedText: renderTemplate(
          principalTemplate || template,
          notification.values,
        ),
        values: notification.values,
        templateName:
          data.kind === "order"
            ? wa
              ? `order_${wa.purpose}`
              : "order_principal"
            : data.kind === "order-paid"
              ? "order_paid"
              : data.kind === "order-refunded"
                ? "order_refunded"
                : data.kind === "order-restored"
                  ? "order_restored"
                  : data.kind === "order-reminder"
                    ? "order_reminder"
                    : "order_cancelled",
        orderId: data.orderId,
        jobId: String(job.id ?? ""),
        attempt: job.attemptsMade + 1,
        forceProvider,
        kapsoEnabled,
      });
    }

    if (data.kind === "raffle-opening") {
      const subscription =
        await rafflePrisma.raffleOpeningSubscription.findUnique({
          where: { id: data.subscriptionId },
          include: { raffle: true },
        });
      if (
        !subscription ||
        subscription.status === "CANCELLED" ||
        (subscription.status === "SENT" && !forcePrincipal)
      ) {
        return;
      }

      if (!forcePrincipal) {
        const claimed = await rafflePrisma.raffleOpeningSubscription.updateMany(
          {
            where: {
              id: subscription.id,
              status: { in: ["PENDING", "FAILED"] },
            },
            data: {
              status: "PROCESSING",
              lastError: null,
            },
          },
        );
        if (claimed.count === 0) return;
      }

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

      const raffleChannel = resolvedWhatsappChannels.find(
        (channel) =>
          channel.purpose.toUpperCase() === "RAFFLES" && channel.active,
      );
      const instanceName = forcePrincipal
        ? principalInstanceName
        : raffleChannel?.instanceName || principalInstanceName;
      const principalTemplate =
        getSetting("whatsapp_global_raffle_opening") || "";
      const template = principalTemplate;

      if (!template) {
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
      const openingValues = {
        raffle_name: raffle.title,
        raffle_url: raffleUrl,
        opening_date: openingDate,
      };
      const message = renderTemplate(template, openingValues);

      try {
        const sent = await sendBusinessWhatsappNotification({
          preferredChannel: forcePrincipal ? null : raffleChannel,
          principal: principalWhatsapp,
          scope: "RAFFLES",
          type: "OPENING",
          sourceContent: template,
          principalSourceContent: principalTemplate,
          recipientPhone: subscription.phone,
          renderedText: message,
          principalRenderedText: renderTemplate(
            principalTemplate || template,
            openingValues,
          ),
          values: openingValues,
          templateName: "raffle_opening",
          jobId: String(job.id ?? ""),
          attempt: subscription.attempts + 1,
          forceProvider,
          kapsoEnabled,
        });
        if (!sent) {
          await rafflePrisma.raffleOpeningSubscription.update({
            where: { id: subscription.id },
            data: {
              status: "FAILED",
              attempts: { increment: 1 },
              lastError:
                "No existe un proveedor preparado para enviar el aviso.",
            },
          });
          return;
        }
        const messageLog = await storePrisma.whatsappMessageLog.findFirst({
          where: { jobId: String(job.id ?? "") },
          orderBy: { id: "desc" },
          select: { id: true },
        });
        await rafflePrisma.raffleOpeningSubscription.update({
          where: { id: subscription.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
            messageLogId: messageLog?.id ?? null,
          },
        });
      } catch (error: any) {
        await rafflePrisma.raffleOpeningSubscription.update({
          where: { id: subscription.id },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            lastError:
              error?.message || "No se pudo enviar el aviso de apertura.",
          },
        });
        throw error;
      }
    }

    if (
      data.kind === "reservation" ||
      data.kind === "reservation-restored" ||
      data.kind === "reservation-cancelled" ||
      data.kind === "reservation-paid" ||
      data.kind === "reservation-refunded" ||
      data.kind === "reservation-reminder"
    ) {
      const raffleChannel = resolvedWhatsappChannels.find(
        (c) => c.purpose.toUpperCase() === "RAFFLES" && c.active,
      );

      // Preserve the intended identity in configuration-error logs.
      const instanceName = forcePrincipal
        ? principalInstanceName
        : raffleChannel?.instanceName || principalInstanceName;

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

      const principalTemplate =
        data.kind === "reservation"
          ? getSetting("whatsapp_global_raffle_res") || ""
          : data.kind === "reservation-restored"
            ? getSetting("whatsapp_global_raffle_restored") || ""
            : data.kind === "reservation-paid"
              ? getSetting("whatsapp_global_raffle_pay") || ""
              : data.kind === "reservation-refunded"
                ? getSetting("whatsapp_global_raffle_refunded") || ""
                : data.kind === "reservation-reminder"
                  ? getSetting("whatsapp_global_raffle_reminder") || ""
                  : getSetting("whatsapp_global_raffle_rel") || "";

      const template = principalTemplate;

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
            errorMessage:
              "No hay plantilla de WhatsApp configurada para este tipo de notificación.",
          },
        });
        return;
      }

      let raffleBankInfo = "";
      if (
        data.kind === "reservation" ||
        data.kind === "reservation-restored" ||
        data.kind === "reservation-reminder"
      ) {
        const payChannel = payChannels.find(
          (c) => c.purpose.toUpperCase() === "RAFFLES",
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

      const notification = buildReservationNotification(
        template,
        sales,
        raffleBankInfo,
        "timeLimit" in data ? data.timeLimit : undefined,
        "timeRemaining" in data && typeof data.timeRemaining === "string"
          ? data.timeRemaining
          : undefined,
      );
      notification.values.opportunity_count = String(sales[0].raffle.opportunities || 1);
      notification.values.additional_opportunity_count = String(
        Math.max(0, Number(sales[0].raffle.opportunities || 1) - 1),
      );

      await sendBusinessWhatsappNotification({
        preferredChannel: forcePrincipal ? null : raffleChannel,
        principal: principalWhatsapp,
        scope: "RAFFLES",
        type:
          data.kind === "reservation"
            ? "RESERVATION"
            : data.kind === "reservation-restored"
              ? "RESTORED"
              : data.kind === "reservation-paid"
                ? "PAYMENT_CONFIRMED"
                : data.kind === "reservation-refunded"
                  ? "PAYMENT_REFUNDED"
                  : data.kind === "reservation-reminder"
                    ? "REMINDER"
                    : "RELEASE",
        sourceContent: template,
        principalSourceContent: principalTemplate,
        recipientPhone: data.recipientPhone,
        renderedText: notification.message,
        principalRenderedText: renderTemplate(
          principalTemplate || template,
          notification.values,
        ),
        values: {
          ...notification.values,
          ticket_list: formatRaffleTicketList(sales),
        },
        templateName:
          data.kind === "reservation"
            ? "reservation_rifas"
            : data.kind === "reservation-restored"
              ? "reservation_restored_rifas"
              : data.kind === "reservation-paid"
                ? "reservation_paid_rifas"
                : data.kind === "reservation-refunded"
                  ? "reservation_refunded_rifas"
                  : data.kind === "reservation-reminder"
                    ? "reservation_reminder_rifas"
                    : "reservation_cancelled_rifas",
        ticketSaleId: sales[0].id,
        jobId: String(job.id ?? ""),
        attempt: job.attemptsMade + 1,
        forceProvider,
        kapsoEnabled,
      });
    }
  },
  { connection, concurrency: 5 },
);

whatsappWorker.on("failed", (job, err) => {
  console.error(`[WhatsApp Worker] Job ${job?.id} failed:`, err.message);
});

function renderTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (message, [key, value]) =>
      message.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value),
    template.replace(
      /\n*Consulta el detalle de tu participaci[^\n]*:\s*\n\s*\{\{participation_url\}\}\s*/i,
      "",
    ),
  );
}

function formatRecoveryExpiration(value: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.TZ || "America/Mexico_City",
  }).format(value);
}

function formatRecoveryAmount(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNotificationDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: process.env.TZ || "America/Mexico_City",
  }).format(new Date(value));
}

function resolvePaymentRecoveryOrderKind(
  items: Array<{
    productType: string;
    product?: { purpose?: string | null } | null;
  }>,
): OrderKind {
  const birds = items.filter((item) => item.productType === "BIRD");
  const hasItems = items.some((item) => item.productType === "ITEM");
  if (birds.length > 0 && !hasItems) {
    const purposes = Array.from(
      new Set(birds.map((item) => item.product?.purpose || null)),
    );
    const purpose =
      purposes.length === 1 &&
      (purposes[0] === "COMBAT" || purposes[0] === "BREEDING")
        ? purposes[0]
        : null;
    return { type: "birds_only", purpose };
  }
  return birds.length === 0 && hasItems
    ? { type: "articles_only" }
    : { type: "mixed" };
}

function buildStorePaymentRecoveryValues(hold: any, recoveryUrl: string) {
  return {
    customer_name: hold.customerName || "",
    item_list: hold.items
      .map((item: any) => `${item.quantity}x ${item.productName}`)
      .join("\n"),
    amount: formatRecoveryAmount(Number(hold.total)),
    expires_at: formatRecoveryExpiration(hold.expiresAt),
    recovery_url: recoveryUrl,
  };
}

function buildRafflePaymentRecoveryValues(hold: any, recoveryUrl: string) {
  const ticketList = formatRaffleTicketList(
    hold.tickets.map((ticket: any) => ({
      ticketNumber: ticket.ticketNumber,
      raffle: hold.raffle,
    })),
  );
  const total =
    Number(hold.raffle.ticketPrice) * hold.tickets.length -
    Number(hold.discountTotal);
  return {
    customer_name: hold.customerName || "",
    raffle_name: hold.raffle.title || "",
    ticket_list: ticketList,
    amount: formatRecoveryAmount(Math.max(0, total)),
    expires_at: formatRecoveryExpiration(hold.expiresAt),
    recovery_url: recoveryUrl,
  };
}

function buildOrderNotification(
  template: string,
  order: any,
  bankInfo: string,
  timeLimit?: string,
  itemList?: string,
  timeRemaining?: string,
) {
  const hour = new Date().getHours();
  let greeting = "Buen día";
  if (hour >= 12 && hour < 19) greeting = "Buena tarde";
  else if (hour >= 19 || hour < 6) greeting = "Buena noche";

  const values: Record<string, string> = {
    greeting,
    order_id: order.id.toString(),
    customer_name: order.customerName ?? "",
    item_list: itemList || "",
    amount: Number(order.total).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    refund_amount: Number(order.mpRefundedAmount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    refund_id: order.mpRefundId || "",
    refunded_at: formatNotificationDate(order.mpRefundedAt),
    bank_info: bankInfo,
    ...getBankTemplateValues(bankInfo),
    time_store: timeLimit || "",
    time_remaining: timeRemaining || "",
  };
  return { message: renderTemplate(template, values), values };
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

function getBankTemplateValues(bankInfo: string) {
  const valueFor = (label: string) => {
    const line = bankInfo
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${label}:`));
    return line?.slice(label.length + 1).trim() || "N/A";
  };

  return {
    bank_name: valueFor("Banco"),
    bank_beneficiary: valueFor("Beneficiario"),
    bank_account: valueFor("No. Cuenta"),
    bank_clabe: valueFor("CLABE"),
    bank_card: valueFor("Tarjeta"),
  };
}

function buildReservationNotification(
  template: string,
  sales: any[],
  bankInfo: string,
  timeLimit?: string,
  timeRemaining?: string,
) {
  const firstSale = sales[0];
  const ticketList = formatRaffleTicketList(sales);
  const subtotal = sales.reduce(
    (sum, s) => sum + parseFloat(s.raffle.ticketPrice.toString()),
    0,
  );
  const discountTotal = parseFloat(firstSale.discountTotal?.toString() || "0");
  const totalAmount = Math.max(0, subtotal - discountTotal);

  const values: Record<string, string> = {
    customer_name: firstSale.customerName ?? "",
    ticket_list: ticketList,
    raffle_name: firstSale.raffle?.title ?? "",
    amount: totalAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    refund_amount: Number(firstSale.mpRefundedAmount || 0).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ),
    refund_id: firstSale.mpRefundId || "",
    refunded_at: formatNotificationDate(firstSale.mpRefundedAt),
    customer_phone: firstSale.customerPhone ?? "",
    bank_info: bankInfo,
    ...getBankTemplateValues(bankInfo),
    time_raffle: timeLimit || "",
    time_remaining: timeRemaining || "",
  };
  return { message: renderTemplate(template, values), values };
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
