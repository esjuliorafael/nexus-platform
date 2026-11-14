"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { storefrontCampaignApi } from "../../api/campaigns";
import { useCartStore } from "../../store/cart.store";
import type { StorefrontCampaign } from "../../types";

interface StorefrontCampaignContextValue {
  campaign: StorefrontCampaign | null;
}

const StorefrontCampaignContext = createContext<StorefrontCampaignContextValue>(
  {
    campaign: null,
  },
);

function getPersistedCouponCode() {
  try {
    const persistedCart = JSON.parse(
      window.localStorage.getItem("nexus_cart") || "null",
    );
    const code = persistedCart?.state?.coupon?.code;
    return typeof code === "string" ? code : null;
  } catch {
    return null;
  }
}

export function StorefrontCampaignProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [campaign, setCampaign] = useState<StorefrontCampaign | null>(null);
  const coupon = useCartStore((state) => state.coupon);
  const clearCoupon = useCartStore((state) => state.clearCoupon);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const nextCampaign = await storefrontCampaignApi.getActive();
        if (!mounted) return;
        setCampaign(nextCampaign);
      } catch {
        // Keep the last successful campaign if a refresh temporarily fails.
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const migrationKey = "nexus_campaign_manual_redemption_v1";
    if (window.localStorage.getItem(migrationKey)) return;

    const legacyCampaignCode = window.localStorage.getItem(
      "nexus_campaign_coupon_code",
    );
    const persistedCouponCode = getPersistedCouponCode();
    const legacyCodeNormalized = legacyCampaignCode?.toUpperCase();
    if (
      legacyCodeNormalized &&
      (coupon?.code.toUpperCase() === legacyCodeNormalized ||
        persistedCouponCode?.toUpperCase() === legacyCodeNormalized)
    ) {
      clearCoupon();
    }
    window.localStorage.removeItem("nexus_campaign_coupon_code");
    window.localStorage.setItem(migrationKey, "1");
  }, [coupon, clearCoupon]);

  const value = useMemo(() => ({ campaign }), [campaign]);

  return (
    <StorefrontCampaignContext.Provider value={value}>
      {children}
    </StorefrontCampaignContext.Provider>
  );
}

export function useStorefrontCampaign() {
  return useContext(StorefrontCampaignContext);
}
