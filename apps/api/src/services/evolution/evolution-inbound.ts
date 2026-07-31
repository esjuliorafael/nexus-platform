const getNested = (source: any, path: string) =>
  path.split(".").reduce((value, key) => value?.[key], source);

const firstValue = (source: any, paths: string[]) => {
  for (const path of paths) {
    const value = getNested(source, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

const jidToPhone = (jid: unknown) => {
  const value = String(jid || "").trim();
  if (!value || value.endsWith("@g.us") || value.endsWith("@broadcast")) return null;
  const phone = value.split("@")[0]?.split(":")[0]?.replace(/\D/g, "") || "";
  return phone || null;
};

export type EvolutionInboundMessage = {
  messageId: string;
  senderPhone: string | null;
  text: string;
  fromMe: boolean;
};

export const getEvolutionInboundMessage = (payload: any): EvolutionInboundMessage => {
  const data = payload?.data ?? payload ?? {};
  const key = data?.key ?? data?.message?.key ?? payload?.key ?? {};
  const message = data?.message ?? payload?.message ?? {};
  const text = String(firstValue(message, [
    "conversation",
    "extendedTextMessage.text",
    "imageMessage.caption",
    "videoMessage.caption",
    "documentMessage.caption",
  ]) || "").trim();

  return {
    messageId: String(key?.id ?? data?.id ?? payload?.id ?? ""),
    senderPhone: jidToPhone(key?.remoteJid ?? data?.remoteJid ?? payload?.remoteJid),
    text,
    fromMe: key?.fromMe === true,
  };
};

export const isEvolutionIncomingMessageEvent = (eventName: string) => {
  const normalized = eventName.trim().toLowerCase();
  return normalized === "messages.upsert" || normalized === "messages_upsert";
};
