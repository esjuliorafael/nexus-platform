"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getStorefrontAnnouncements,
  StorefrontAnnouncement,
  StorefrontAnnouncementScope,
} from "../../api/storefront-announcements";
import { useCartUiStore } from "../../store/cart-ui.store";
import { useRaffleSelectionUiStore } from "../../store/raffle-selection-ui.store";
import { useToastStore } from "../../store/toast.store";
import { StorefrontAnnouncementDialog } from "./StorefrontAnnouncementDialog";

function resolveContext(pathname: string): { scope: StorefrontAnnouncementScope; targetId?: number } {
  if (pathname === "/checkout") return { scope: "STORE_CHECKOUT" };
  const raffleCheckout = pathname.match(/^\/raffles\/(\d+)\/checkout/);
  if (raffleCheckout) return { scope: "RAFFLE_CHECKOUT", targetId: Number(raffleCheckout[1]) };
  const raffle = pathname.match(/^\/raffles\/(\d+)/);
  if (raffle) return { scope: "RAFFLE", targetId: Number(raffle[1]) };
  if (pathname === "/raffles") return { scope: "RAFFLES" };
  const product = pathname.match(/^\/store\/(\d+)/);
  if (product) return { scope: "PRODUCT", targetId: Number(product[1]) };
  if (pathname === "/store") return { scope: "STORE" };
  return { scope: "GLOBAL" };
}

const seenKey = (item: StorefrontAnnouncement) => `sf:announcement:${item.id}:v${item.version}`;
const wasSeen = (item: StorefrontAnnouncement) => {
  if (item.frequency === "ALWAYS") return false;
  const storage = item.frequency === "ONCE_SESSION" ? sessionStorage : localStorage;
  return storage.getItem(seenKey(item)) === "1";
};
const markSeen = (item: StorefrontAnnouncement) => {
  if (item.frequency === "ALWAYS") return;
  const storage = item.frequency === "ONCE_SESSION" ? sessionStorage : localStorage;
  storage.setItem(seenKey(item), "1");
};

export function StorefrontAnnouncementHost() {
  const pathname = usePathname();
  const isCartOpen = useCartUiStore((state) => state.isCartOpen);
  const isSelectionOpen = useRaffleSelectionUiStore((state) => state.isOpen);
  const toastMessage = useToastStore((state) => state.message);
  const [queue, setQueue] = useState<StorefrontAnnouncement[]>([]);
  const [ready, setReady] = useState(false);
  const context = useMemo(() => resolveContext(pathname), [pathname]);
  const blocked = isCartOpen || isSelectionOpen || Boolean(toastMessage);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setQueue([]);
    const timer = window.setTimeout(async () => {
      try {
        const items = await getStorefrontAnnouncements(context.scope, context.targetId);
        if (!cancelled) setQueue(items.filter((item) => !wasSeen(item)));
      } catch (error) {
        console.error("No se pudieron cargar los avisos del Storefront:", error);
      } finally {
        if (!cancelled) setReady(true);
      }
    }, 720);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [context.scope, context.targetId, pathname]);

  const current = ready && !blocked ? queue[0] || null : null;
  const dismiss = () => {
    if (!current) return;
    markSeen(current);
    setQueue([]);
  };

  return <StorefrontAnnouncementDialog announcement={current} onDismiss={dismiss} />;
}
