import { FastifyInstance } from "fastify";
import { reconcileRecoverableWhatsappJobs } from "../../../services/whatsapp-recovery.service";
import { invalidateWhatsappConnectionState } from "../../../services/evolution/whatsapp-delivery.service";

const STATUS_PRIORITY: Record<string, number> = {
  failed: 0,
  sent: 1,
  server_ack: 2,
  delivered: 3,
  read: 4,
};

const normalizeStatus = (value?: unknown) => {
  const raw = String(value ?? "").toLowerCase();

  if (!raw) return "sent";
  if (raw.includes("read") || raw === "4") return "read";
  if (raw.includes("delivery") || raw.includes("delivered") || raw === "3") return "delivered";
  if (raw.includes("server") || raw.includes("ack") || raw === "2") return "server_ack";
  if (raw.includes("error") || raw.includes("fail") || raw === "-1") return "failed";
  if (raw.includes("sent") || raw === "1") return "sent";

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

const cleanRemotePhone = (value?: unknown) => {
  if (!value) return "";
  return String(value).replace(/@s\.whatsapp\.net|@c\.us|@g\.us/g, "");
};

const shouldUpdateStatus = (currentStatus: string | null, nextStatus: string) => {
  const currentPriority = STATUS_PRIORITY[currentStatus || "sent"] ?? 1;
  const nextPriority = STATUS_PRIORITY[nextStatus] ?? currentPriority;
  return nextPriority >= currentPriority;
};

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

    const payload = request.body as any;
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
    const nextStatus = normalizeStatus(providerStatus);
    const recipientPhone = cleanRemotePhone(
      firstValue(payload, [
        "data.key.remoteJid",
        "data.remoteJid",
        "data.message.key.remoteJid",
        "key.remoteJid",
        "remoteJid",
      ]),
    );

    const existing = await server.storePrisma.whatsappMessageLog.findFirst({
      where: { messageId: String(messageId) },
      orderBy: { sentAt: "desc" },
    });

    if (existing) {
      await server.storePrisma.whatsappMessageLog.update({
        where: { id: existing.id },
        data: {
          status: shouldUpdateStatus(existing.status, nextStatus) ? nextStatus : existing.status,
          providerStatus: providerStatus ? String(providerStatus) : existing.providerStatus,
          responsePayload: {
            ...(payload && typeof payload === "object" ? payload : {}),
            ...(
              existing.responsePayload &&
              typeof existing.responsePayload === "object" &&
              (existing.responsePayload as any).nexusRouting
                ? { nexusRouting: (existing.responsePayload as any).nexusRouting }
                : {}
            ),
          },
          lastStatusAt: new Date(),
          errorMessage: nextStatus === "failed"
            ? String(firstValue(payload, ["data.error", "error", "message"]) || existing.errorMessage || "Evolution reportó fallo.")
            : existing.errorMessage,
        },
      });

      return reply.send({ ok: true, updated: true });
    }

    await server.storePrisma.whatsappMessageLog.create({
      data: {
        status: nextStatus,
        providerStatus: providerStatus ? String(providerStatus) : null,
        responsePayload: payload,
        lastStatusAt: new Date(),
        instanceName: String(instanceName),
        messageId: String(messageId),
        recipientPhone: recipientPhone || "unknown",
        templateUsed: "webhook",
        errorMessage: nextStatus === "failed"
          ? String(firstValue(payload, ["data.error", "error", "message"]) || "Evolution reportó fallo.")
          : null,
      },
    });

    return reply.send({ ok: true, created: true });
  });
}
