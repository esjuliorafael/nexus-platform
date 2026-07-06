import { useCallback, useEffect, useMemo, useState } from "react";
import { settingsApi } from "../api/settings";
import { GroupedSettings } from "../types";

type StorefrontStatus = "LIVE" | "MAINTENANCE" | "COMING_SOON";

const LIMITED_STOREFRONT_POLL_MS = 15000;

function resolveStorefrontStatus(settings: GroupedSettings | null): StorefrontStatus {
  const rawStatus = settings?.storefront?.storefront_status;

  if (rawStatus === "MAINTENANCE" || rawStatus === "COMING_SOON") {
    return rawStatus;
  }

  return "LIVE";
}

function getTemplatePrefix(status: StorefrontStatus) {
  if (status === "COMING_SOON") return "storefront_coming_soon";
  return "storefront_maintenance";
}

export function useSettings() {
  const [settings, setSettings] = useState<GroupedSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storefrontStatus = useMemo(
    () => resolveStorefrontStatus(settings),
    [settings],
  );
  const isStorefrontLimited = storefrontStatus !== "LIVE";

  const fetchSettings = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await settingsApi.getStoreSettings();
      setSettings(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!isStorefrontLimited) return;

    const intervalId = window.setInterval(() => {
      fetchSettings({ silent: true });
    }, LIMITED_STOREFRONT_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchSettings, isStorefrontLimited]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSettings({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchSettings]);

  const getBranding = () => {
    const branding = settings?.branding;

    return {
      brand_name:
        branding?.brand_name || branding?.branding_brand_name || "Nexus Store",
      logo_url: branding?.branding_logo_url || branding?.logo_url || null,
      primary_color:
        branding?.primary_color ||
        branding?.branding_primary_color ||
        "#8b5e3c",
    };
  };

  const getContact = () => {
    return (
      settings?.contact || {
        phone: "",
        email: "",
        address: "",
        whatsapp: "",
      }
    );
  };

  const getSetting = (
    group: string,
    key: string,
    defaultValue: string = "",
  ) => {
    return settings?.[group]?.[key] ?? defaultValue;
  };

  const isModuleEnabled = (moduleKey: string) => {
    // Search in any group for the enable flag
    if (!settings) return false;
    for (const group in settings) {
      if (settings[group][moduleKey] === "1") return true;
    }
    return false;
  };

  const getStorefrontAvailability = () => {
    const storefront = settings?.storefront || {};
    const status = storefrontStatus;
    const prefix = getTemplatePrefix(status);
    const legacyTitle = storefront.storefront_unavailable_title;
    const legacyDescription = storefront.storefront_unavailable_description;
    const legacyBackgroundUrl = storefront.storefront_unavailable_background_url;
    const legacyShowLogo = storefront.storefront_unavailable_show_logo;

    return {
      status,
      isUnavailable: status !== "LIVE",
      showLogo: (storefront[`${prefix}_show_logo`] ?? legacyShowLogo) !== "0",
      eyebrow:
        storefront[`${prefix}_eyebrow`] ||
        (status === "COMING_SOON" ? "Próximamente" : "Mantenimiento"),
      title:
        storefront[`${prefix}_title`] ||
        legacyTitle ||
        (status === "COMING_SOON"
          ? "Nueva temporada en camino"
          : "Estamos preparando una mejor experiencia"),
      description:
        storefront[`${prefix}_description`] ||
        legacyDescription ||
        (status === "COMING_SOON"
          ? "Estamos preparando una selección especial. Vuelve pronto para conocer las novedades disponibles."
          : "La tienda estará disponible nuevamente en breve. Si necesitas atención, puedes contactarnos por WhatsApp."),
      mediaUrl: storefront[`${prefix}_media_url`] || legacyBackgroundUrl || "",
      posterUrl: storefront[`${prefix}_poster_url`] || "",
      mediaType:
        storefront[`${prefix}_media_type`] === "VIDEO"
          ? ("VIDEO" as const)
          : ("PHOTO" as const),
      desktopObjectPosition:
        storefront[`${prefix}_desktop_object_position`] || "50% 50%",
      mobileObjectPosition:
        storefront[`${prefix}_mobile_object_position`] || "50% 50%",
      primaryText:
        storefront[`${prefix}_primary_text`] ||
        storefront.storefront_unavailable_cta_label ||
        "",
      primaryHref:
        storefront[`${prefix}_primary_href`] ||
        storefront.storefront_unavailable_cta_href ||
        "",
      secondaryText: storefront[`${prefix}_secondary_text`] || "",
      secondaryHref: storefront[`${prefix}_secondary_href`] || "",
    };
  };

  return {
    settings,
    loading,
    error,
    getBranding,
    getContact,
    getSetting,
    isModuleEnabled,
    getStorefrontAvailability,
  };
}
