"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, BellRing, Info, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { StorefrontAnnouncement } from "../../api/storefront-announcements";
import { BottomSheet } from "../ui/BottomSheet";
import { StorefrontModal } from "../ui/Modal";
import { Button } from "../ui/Button";

const visualByVariant = {
  INFO: { icon: Info, iconVariant: "brand" as const, modal: "brand" as const, button: "brand" as const },
  SUCCESS: { icon: BadgeCheck, iconVariant: "success" as const, modal: "success" as const, button: "success" as const },
  WARNING: { icon: AlertTriangle, iconVariant: "warning" as const, modal: "brand" as const, button: "warning" as const },
  CRITICAL: { icon: AlertTriangle, iconVariant: "error" as const, modal: "danger" as const, button: "danger" as const },
  PROMO: { icon: Sparkles, iconVariant: "brand" as const, modal: "brand" as const, button: "brand" as const },
};

interface Props {
  announcement: StorefrontAnnouncement | null;
  onDismiss: () => void;
}

export function StorefrontAnnouncementDialog({ announcement, onDismiss }: Props) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobile(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  if (!announcement) return null;
  const visual = visualByVariant[announcement.variant] || {
    icon: BellRing,
    iconVariant: "brand" as const,
    modal: "brand" as const,
    button: "brand" as const,
  };

  const handleCta = () => {
    const href = announcement.ctaHref;
    onDismiss();
    if (!href) return;
    if (href.startsWith("/")) router.push(href);
    else window.location.assign(href);
  };

  if (isMobile === null) return null;

  const content = (
    <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
      <p className="sf-text-body font-medium text-stone-600">{announcement.message}</p>
      {announcement.ctaLabel ? (
        <Button className="w-full" context="section" variant={visual.button} onClick={handleCta}>
          {announcement.ctaLabel}
        </Button>
      ) : announcement.dismissible ? (
        <Button className="w-full" context="section" variant="brand" onClick={onDismiss}>
          Entendido
        </Button>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen
        onClose={onDismiss}
        dismissible={announcement.dismissible}
        eyebrow={announcement.eyebrow || "Aviso"}
        title={announcement.title}
        icon={visual.icon}
        iconVariant={visual.iconVariant}
      >
        {content}
      </BottomSheet>
    );
  }

  return (
    <StorefrontModal
      isOpen
      onClose={onDismiss}
      dismissible={announcement.dismissible}
      eyebrow={announcement.eyebrow || "Aviso"}
      title={announcement.title}
      icon={visual.icon}
      variant={visual.modal}
      width="compact"
      showDefaultActions={false}
    >
      {content}
    </StorefrontModal>
  );
}
