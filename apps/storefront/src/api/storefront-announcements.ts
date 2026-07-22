import client from "./client";

export type StorefrontAnnouncementScope =
  | "GLOBAL" | "STORE" | "RAFFLES" | "RAFFLE" | "PRODUCT" | "STORE_CHECKOUT" | "RAFFLE_CHECKOUT";
export type StorefrontAnnouncementVariant = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL" | "PROMO";
export type StorefrontAnnouncementFrequency = "ONCE_VISITOR" | "ONCE_SESSION" | "ALWAYS";

export interface StorefrontAnnouncement {
  id: number;
  scope: StorefrontAnnouncementScope;
  targetId?: number | null;
  presentation: "POPUP";
  variant: StorefrontAnnouncementVariant;
  frequency: StorefrontAnnouncementFrequency;
  eyebrow?: string | null;
  title: string;
  message: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  dismissible: boolean;
  priority: number;
  version: number;
}

export async function getStorefrontAnnouncements(scope: StorefrontAnnouncementScope, targetId?: number) {
  const response = await client.get<StorefrontAnnouncement[]>("/store/announcements", {
    params: { scope, ...(targetId ? { targetId } : {}) },
  });
  return response.data;
}

