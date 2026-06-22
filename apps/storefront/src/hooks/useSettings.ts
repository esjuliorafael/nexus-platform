import { useState, useEffect } from "react";
import { settingsApi } from "../api/settings";
import { GroupedSettings } from "../types";

export function useSettings() {
  const [settings, setSettings] = useState<GroupedSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    settingsApi
      .getStoreSettings()
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching settings:", err);
        setError("Failed to load settings");
        setLoading(false);
      });
  }, []);

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

  return {
    settings,
    loading,
    error,
    getBranding,
    getContact,
    getSetting,
    isModuleEnabled,
  };
}
