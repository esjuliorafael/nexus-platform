import { createHmac, timingSafeEqual } from "node:crypto";

const STATUS_PRIORITY: Record<string, number> = {
  failed: 0,
  pending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};

export function verifyKapsoWebhookSignature(
  payload: unknown,
  signature: string | string[] | undefined,
  secret: string,
) {
  const incoming = Array.isArray(signature) ? signature[0] : signature;
  if (!incoming || !secret) return false;

  const expected = createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  const incomingBuffer = Buffer.from(incoming);
  const expectedBuffer = Buffer.from(expected);
  return (
    incomingBuffer.length === expectedBuffer.length &&
    timingSafeEqual(incomingBuffer, expectedBuffer)
  );
}

export function normalizeKapsoWebhookStatus(eventName: string, payload: any) {
  const eventStatus = eventName.split(".").pop()?.toLowerCase() || "";
  const payloadStatus = String(payload?.message?.kapso?.status || "").toLowerCase();
  const status = eventStatus || payloadStatus;
  if (["failed", "sent", "delivered", "read"].includes(status)) return status;
  return payloadStatus || "pending";
}

export function shouldAdvanceKapsoStatus(
  currentStatus: string | null | undefined,
  nextStatus: string,
) {
  if (nextStatus === "failed") {
    return currentStatus !== "delivered" && currentStatus !== "read";
  }
  const currentPriority = STATUS_PRIORITY[currentStatus || "pending"] ?? 0;
  const nextPriority = STATUS_PRIORITY[nextStatus] ?? currentPriority;
  return nextPriority >= currentPriority;
}

export function getKapsoWebhookError(payload: any) {
  const statuses = Array.isArray(payload?.message?.kapso?.statuses)
    ? payload.message.kapso.statuses
    : [];
  const latestWithError = [...statuses]
    .reverse()
    .find((status: any) => Array.isArray(status?.errors) && status.errors.length > 0);
  const error = latestWithError?.errors?.[0];
  if (Number(error?.code) === 131042) {
    return "La cuenta de WhatsApp Business no tiene configurada su moneda de facturación. Configúrala en Meta antes de reintentar el mensaje.";
  }
  return error
    ? [error.title, error.message, error.error_data?.details].filter(Boolean).join(": ")
    : null;
}

export function getKapsoInboundMessage(payload: any) {
  const messageId = String(payload?.message?.id || "").trim();
  const senderPhone = String(
    payload?.message?.from ||
    payload?.conversation?.phone_number ||
    payload?.message?.kapso?.phone_number ||
    "",
  ).trim();
  const text = String(
    payload?.message?.text?.body ||
    payload?.message?.kapso?.content ||
    "",
  ).trim();

  return {
    messageId: messageId || null,
    senderPhone: senderPhone || null,
    text,
    phoneNumberId:
      payload?.phone_number_id ||
      payload?.conversation?.phone_number_id ||
      null,
  };
}
