import { storePrisma } from "@nexus/db/store";
import { customerPhoneIdentity } from "../../utils/customer-phone";

const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const whatsappCustomerServiceWindowService = {
  async openKapsoWindow(params: {
    recipientPhone: string;
    phoneNumberId: string | null | undefined;
    inboundMessageId: string | null | undefined;
    receivedAt?: Date;
  }) {
    const recipientPhone = customerPhoneIdentity(params.recipientPhone);
    const channelIdentity = String(params.phoneNumberId || "").trim();
    if (!recipientPhone || !channelIdentity) return null;

    const openedAt = params.receivedAt || new Date();
    const expiresAt = new Date(openedAt.getTime() + CUSTOMER_SERVICE_WINDOW_MS);
    return storePrisma.whatsappCustomerServiceWindow.upsert({
      where: {
        recipientPhone_channelIdentity_provider: {
          recipientPhone,
          channelIdentity,
          provider: "KAPSO",
        },
      },
      create: {
        recipientPhone,
        channelIdentity,
        provider: "KAPSO",
        lastInboundMessageId: params.inboundMessageId || null,
        openedAt,
        expiresAt,
      },
      update: {
        lastInboundMessageId: params.inboundMessageId || null,
        openedAt,
        expiresAt,
      },
    });
  },

  async hasActiveKapsoWindow(params: {
    recipientPhone: string;
    phoneNumberId: string;
    now?: Date;
  }) {
    const recipientPhone = customerPhoneIdentity(params.recipientPhone);
    const channelIdentity = String(params.phoneNumberId || "").trim();
    if (!recipientPhone || !channelIdentity) return false;
    const now = params.now || new Date();
    const window = await storePrisma.whatsappCustomerServiceWindow.findUnique({
      where: {
        recipientPhone_channelIdentity_provider: {
          recipientPhone,
          channelIdentity,
          provider: "KAPSO",
        },
      },
      select: { expiresAt: true },
    });
    return Boolean(window && window.expiresAt > now);
  },
};
