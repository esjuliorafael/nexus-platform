import { FastifyInstance } from "fastify";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import { reconcileRecoverableWhatsappJobs } from "../../../services/whatsapp-recovery.service";
import {
  invalidateWhatsappConnectionState,
  markWhatsappInstanceProviderRejected,
  normalizePrincipalInstanceName,
} from "../../../services/evolution/whatsapp-delivery.service";

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

  if (code || raw.includes("error") || raw.includes("fail") || raw === "-1") return "failed";
  if (!raw || raw.includes("pending") || raw === "0") return "pending";
  if (raw.includes("read") || raw.includes("played") || raw === "3" || raw === "4") return "read";
  if (raw.includes("delivery") || raw.includes("delivered") || raw === "2") return "delivered";
  if (raw.includes("server") || raw.includes("ack") || raw === "1") return "server_ack";
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

const shouldUpdateStatus = (currentStatus: string | null, nextStatus: string) => {
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

    if (configuredToken && incomingToken !== configuredToken && bearerToken !== configuredToken) {
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
    const eventName = String(firstValue(payload, ["event", "type"]) || "").toLowerCase();
    const connectionState = String(
      firstValue(payload, ["data.state", "data.status", "state", "status"]) || "",
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
        recoveryScheduled: instanceName !== "webhook" && connectionState === "open",
      });
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
      const shouldAdvanceStatus = shouldUpdateStatus(existing.status, nextStatus);

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
                ...(
                  existing.responsePayload &&
                  typeof existing.responsePayload === "object" &&
                  (existing.responsePayload as any).nexusRouting
                    ? { nexusRouting: (existing.responsePayload as any).nexusRouting }
                    : {}
                ),
              }
            : existing.responsePayload,
          lastStatusAt: shouldAdvanceStatus ? new Date() : existing.lastStatusAt,
          errorMessage: shouldAdvanceStatus
            ? nextStatus === "failed"
              ? failureMessage
              : null
            : existing.errorMessage,
        },
      });

      let fallbackScheduled = false;
      if (shouldAdvanceStatus && nextStatus === "failed" && existing.jobId) {
        if (String(failureCode) === "463") {
          markWhatsappInstanceProviderRejected(existing.instanceName);
        }
        const [principalSetting, originalJob] = await Promise.all([
          server.storePrisma.setting.findUnique({
            where: { key: "whatsapp_evolution_instance" },
            select: { value: true },
          }),
          whatsappQueue.getJob(existing.jobId),
        ]);
        const principalInstanceName = normalizePrincipalInstanceName(principalSetting?.value);

        if (originalJob && principalInstanceName && existing.instanceName !== principalInstanceName) {
          await whatsappQueue.add(
            `${originalJob.name}-principal-fallback`,
            {
              ...originalJob.data,
              forcePrincipal: true,
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
