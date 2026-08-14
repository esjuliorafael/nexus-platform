import { FastifyInstance } from "fastify";
import { rafflePrisma } from "@nexus/db/raffle";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import { reconcileRecoverableWhatsappJobs } from "../../../services/whatsapp-recovery.service";
import {
  invalidateWhatsappConnectionState,
  markWhatsappInstanceProviderRejected,
} from "../../../services/evolution/whatsapp-delivery.service";
import {
  getEvolutionInboundMessage,
  isEvolutionIncomingMessageEvent,
} from "../../../services/evolution/evolution-inbound";
import { getWhatsappMarketingOptInKeyword, getWhatsappMarketingOptOutKeyword, whatsappMarketingConsentService } from "../../../services/whatsapp-marketing-consent.service";
import { sendMarketingConsentConfirmation } from "../../../services/whatsapp/whatsapp-marketing-consent-confirmation.service";
import { buildWhatsappAsyncFallbackPatch } from "../../../services/whatsapp/whatsapp-async-fallback";
import { refreshRaffleDrawReminderCampaign } from "../../raffle/raffles/raffle-draw-reminder.service";
import { getEvolutionConfigFromSettings } from "../../../services/evolution/evolution.config";
import { sendWhatsappAndLog } from "../../../services/whatsapp/whatsapp-send.service";
import { handleRaffleWhatsappMessage } from "../../raffle/ticket-sales/raffle-whatsapp-assistant.service";

const STATUS_PRIORITY: Record<string, number> = {
  failed: 0,
  pending: 1,
  sent: 2,
  server_ack: 3,
  delivered: 4,
  read: 5,
};

const normalizeStatus = (value?: unknown, failureCode?: unknown) => {
  const raw = String(value ?? "").toLowerCase();
  const code = String(failureCode ?? "").trim();

  if (code || raw.includes("error") || raw.includes("fail") || raw === "-1")
    return "failed";
  if (!raw || raw.includes("pending") || raw === "0") return "pending";
  if (
    raw.includes("read") ||
    raw.includes("played") ||
    raw === "3" ||
    raw === "4"
  )
    return "read";
  if (raw.includes("delivery") || raw.includes("delivered") || raw === "2")
    return "delivered";
  if (raw.includes("server") || raw.includes("ack") || raw === "1")
    return "server_ack";
  if (raw.includes("sent")) return "sent";

  return raw;
};

const getNested = (source: any, path: string) =>
  path.split(".").reduce((value, key) => value?.[key], source);

const firstValue = (source: any, paths: string[]) => {
  for (const path of paths) {
    const value = getNested(source, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

const shouldUpdateStatus = (
  currentStatus: string | null,
  nextStatus: string,
) => {
  if (nextStatus === "failed") {
    return currentStatus !== "delivered" && currentStatus !== "read";
  }
  const currentPriority = STATUS_PRIORITY[currentStatus || "sent"] ?? 1;
  const nextPriority = STATUS_PRIORITY[nextStatus] ?? currentPriority;
  return nextPriority >= currentPriority;
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function evolutionWebhookRoutes(server: FastifyInstance) {
  server.post("/evolution", async (request, reply) => {
    const configuredToken =
      process.env.EVOLUTION_WEBHOOK_TOKEN ||
      process.env.WHATSAPP_WEBHOOK_TOKEN ||
      "";
    const incomingToken =
      request.headers["x-evolution-token"] ||
      request.headers["x-webhook-token"] ||
      request.headers["x-nexus-webhook-token"];
    const authorization = request.headers.authorization || "";
    const bearerToken = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";

    if (
      configuredToken &&
      incomingToken !== configuredToken &&
      bearerToken !== configuredToken
    ) {
      return reply.status(401).send({ message: "Unauthorized webhook" });
    }

    const rawPayload = request.body as any;
    const payload = Array.isArray(rawPayload?.data)
      ? { ...rawPayload, data: rawPayload.data[0] }
      : rawPayload;
    const data = payload?.data ?? payload;
    const instanceName =
      firstValue(payload, ["instance", "data.instance", "data.instanceName"]) ||
      "webhook";
    const eventName = String(
      firstValue(payload, ["event", "type"]) || "",
    ).toLowerCase();
    const connectionState = String(
      firstValue(payload, ["data.state", "data.status", "state", "status"]) ||
        "",
    ).toLowerCase();

    if (eventName.includes("connection") || connectionState === "open") {
      if (instanceName !== "webhook" && connectionState === "open") {
        invalidateWhatsappConnectionState(String(instanceName));
        void reconcileRecoverableWhatsappJobs().catch((error) => {
          request.log.error(
            `[WhatsApp recovery] Could not recover ${instanceName}: ${error?.message || error}`,
          );
        });
      }

      return reply.send({
        ok: true,
        connectionUpdate: true,
        recoveryScheduled:
          instanceName !== "webhook" && connectionState === "open",
      });
    }

    if (isEvolutionIncomingMessageEvent(eventName)) {
      const inbound = getEvolutionInboundMessage(payload);
      if (inbound.fromMe || !inbound.messageId || !inbound.senderPhone) {
        return reply.send({ ok: true, ignored: "non_contact_inbound_message" });
      }

      const externalEventId = `evolution:${String(instanceName)}:${inbound.messageId}`;
      const baseMetadata = {
        provider: "EVOLUTION",
        instanceName: String(instanceName),
        messageId: inbound.messageId,
      };
      const optOutKeyword = getWhatsappMarketingOptOutKeyword(inbound.text);
      if (optOutKeyword) {
        const outcome = await whatsappMarketingConsentService.optOut(server.storePrisma, {
          phone: inbound.senderPhone,
          keyword: optOutKeyword,
          externalEventId,
          metadata: baseMetadata,
        });
        if (outcome.changed) {
          await sendMarketingConsentConfirmation({
            recipientPhone: inbound.senderPhone,
            kind: "OPTED_OUT",
            transport: { provider: "EVOLUTION", instanceName: String(instanceName) },
            inboundMessageId: inbound.messageId,
          });
        }
        return reply.send({ ok: true, marketingConsent: "OPTED_OUT" });
      }

      const optInKeyword = getWhatsappMarketingOptInKeyword(inbound.text);
      if (optInKeyword) {
        const outcome = await whatsappMarketingConsentService.grant(server.storePrisma, {
          phone: inbound.senderPhone,
          source: "INBOUND_KEYWORD",
          externalEventId,
          keyword: optInKeyword,
          metadata: { ...baseMetadata, keyword: optInKeyword },
        });
        if (outcome.changed) {
          await sendMarketingConsentConfirmation({
            recipientPhone: inbound.senderPhone,
            kind: "GRANTED",
            transport: { provider: "EVOLUTION", instanceName: String(instanceName) },
            inboundMessageId: inbound.messageId,
          });
        }
        return reply.send({ ok: true, marketingConsent: "GRANTED" });
      }

      const channel = await server.storePrisma.whatsappChannel.findFirst({
        where: { instanceName: String(instanceName) },
        select: { evolutionUrl: true, evolutionKey: true },
      });
      const globalEvolution = await getEvolutionConfigFromSettings();
      const evolution = {
        instanceName: String(instanceName),
        baseUrl: channel?.evolutionUrl || globalEvolution.baseUrl,
        apiKey: channel?.evolutionKey || globalEvolution.apiKey,
      };
      if (evolution.baseUrl && evolution.apiKey) {
        const assistant = await handleRaffleWhatsappMessage({
          rafflePrisma,
          storePrisma: server.storePrisma,
          phone: inbound.senderPhone,
          channelKey: `evolution:${instanceName}`,
          text: inbound.text,
        });
        if (assistant.handled && assistant.reply) {
          await sendWhatsappAndLog({
            transport: { provider: "EVOLUTION", instance: evolution },
            recipientPhone: inbound.senderPhone,
            message: { text: assistant.reply },
            templateName: "raffle_whatsapp_assistant",
            routing: {
              route: "DIRECT",
              preferredInstanceName: evolution.instanceName,
              policyClass: "OPERATIONAL",
              providerPriority: ["EVOLUTION"],
            },
          });
        }
      }

      return reply.send({ ok: true, ignored: "unrecognized_inbound_message" });
    }

    const messageId = firstValue(payload, [
      "data.keyId",
      "data.key.id",
      "data.message.key.id",
      "data.messageId",
      "data.id",
      "message.key.id",
      "key.id",
      "messageId",
      "id",
    ]);

    if (!messageId) {
      return reply.send({ ok: true, ignored: "missing_message_id" });
    }

    const providerStatus = firstValue(payload, [
      "data.status",
      "data.update.status",
      "data.message.status",
      "data.ack",
      "data.update.ack",
      "status",
      "ack",
      "event",
    ]);
    const failureCode = firstValue(payload, [
      "data.update.messageStubParameters.0",
      "data.messageStubParameters.0",
      "update.messageStubParameters.0",
      "messageStubParameters.0",
      "data.error.code",
      "error.code",
    ]);
    const nextStatus = normalizeStatus(providerStatus, failureCode);
    let existing = await server.storePrisma.whatsappMessageLog.findFirst({
      where: { messageId: String(messageId) },
      orderBy: { sentAt: "desc" },
    });

    // Evolution can emit an ACK before the send request has finished writing its log.
    if (!existing) {
      await wait(500);
      existing = await server.storePrisma.whatsappMessageLog.findFirst({
        where: { messageId: String(messageId) },
        orderBy: { sentAt: "desc" },
      });
    }

    if (existing) {
      const failureMessage = failureCode
        ? `WhatsApp rechazó el mensaje (código ${String(failureCode)}).`
        : String(
            firstValue(payload, ["data.error", "error", "message"]) ||
              existing.errorMessage ||
              "Evolution reportó fallo.",
          );
      const shouldAdvanceStatus = shouldUpdateStatus(
        existing.status,
        nextStatus,
      );

      await server.storePrisma.whatsappMessageLog.update({
        where: { id: existing.id },
        data: {
          status: shouldAdvanceStatus ? nextStatus : existing.status,
          providerStatus:
            shouldAdvanceStatus && providerStatus
              ? String(providerStatus)
              : existing.providerStatus,
          responsePayload: shouldAdvanceStatus
            ? {
                ...(payload && typeof payload === "object" ? payload : {}),
                ...(existing.responsePayload &&
                typeof existing.responsePayload === "object" &&
                (existing.responsePayload as any).nexusRouting
                  ? {
                      nexusRouting: (existing.responsePayload as any)
                        .nexusRouting,
                    }
                  : {}),
              }
            : existing.responsePayload,
          lastStatusAt: shouldAdvanceStatus
            ? new Date()
            : existing.lastStatusAt,
          errorMessage: shouldAdvanceStatus
            ? nextStatus === "failed"
              ? failureMessage
              : null
            : existing.errorMessage,
        },
      });

      // Evolution may accept a send request and emit its rejection afterward.
      // Keep the raffle reminder recipient aligned with that definitive outcome.
      if (
        shouldAdvanceStatus &&
        nextStatus === "failed" &&
        existing.templateUsed === "raffle_draw_reminder"
      ) {
        const recipient = await rafflePrisma.raffleDrawReminderRecipient.findFirst({
          where: { messageLogId: existing.id },
          select: { id: true, campaignId: true },
        });
        if (recipient) {
          await rafflePrisma.raffleDrawReminderRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "FAILED",
              sentAt: null,
              lastError: failureMessage,
            },
          });
          await refreshRaffleDrawReminderCampaign(
            rafflePrisma,
            recipient.campaignId,
          );
        }
      }

      let fallbackScheduled = false;
      if (shouldAdvanceStatus && nextStatus === "failed" && existing.jobId) {
        if (String(failureCode) === "463") {
          markWhatsappInstanceProviderRejected(existing.instanceName);
        }
        const originalJob = await whatsappQueue.getJob(existing.jobId);
        const responsePayload =
          existing.responsePayload &&
          typeof existing.responsePayload === "object" &&
          !Array.isArray(existing.responsePayload)
            ? (existing.responsePayload as Record<string, unknown>)
            : {};
        const routing =
          responsePayload.nexusRouting &&
          typeof responsePayload.nexusRouting === "object"
            ? (responsePayload.nexusRouting as Record<string, unknown>)
            : null;
        const fallbackPatch = originalJob
          ? buildWhatsappAsyncFallbackPatch({
              failedProvider: "EVOLUTION",
              routing: routing as any,
              originalJob: originalJob.data,
            })
          : null;

        if (originalJob && fallbackPatch) {
          await whatsappQueue.add(
            `${originalJob.name}-provider-fallback`,
            {
              ...originalJob.data,
              ...fallbackPatch,
              fallbackOfMessageId: String(messageId),
            },
            { jobId: `provider-fallback-${String(messageId)}` },
          );
          fallbackScheduled = true;
        }
      }

      return reply.send({ ok: true, updated: true, fallbackScheduled });
    }

    return reply.send({ ok: true, ignored: "unknown_message_id" });
  });
}
