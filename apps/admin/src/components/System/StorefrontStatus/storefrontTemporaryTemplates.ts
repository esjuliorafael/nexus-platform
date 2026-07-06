import { Sparkles, Wrench } from "lucide-react";

export type StorefrontTemplateMode = "maintenance" | "comingSoon";
export type StorefrontTemplateMediaType = "PHOTO" | "VIDEO";

export interface StorefrontTemplateConfig {
  mode: StorefrontTemplateMode;
  mediaUrl: string;
  posterUrl: string;
  mediaType: StorefrontTemplateMediaType;
  eyebrow: string;
  title: string;
  description: string;
  showLogo: boolean;
  desktopObjectPosition: string;
  mobileObjectPosition: string;
  primaryText: string;
  primaryHref: string;
  secondaryText: string;
  secondaryHref: string;
}

export const storefrontTemplateMeta = {
  maintenance: {
    label: "Mantenimiento",
    eyebrow: "Mantenimiento",
    title: "Estamos preparando una mejor experiencia",
    description:
      "La tienda estará disponible nuevamente en breve. Si necesitas atención, puedes contactarnos por WhatsApp.",
    icon: Wrench,
    iconVariant: "orange" as const,
    prefix: "storefront_maintenance",
  },
  comingSoon: {
    label: "Próximamente",
    eyebrow: "Próximamente",
    title: "Nueva temporada en camino",
    description:
      "Estamos preparando una selección especial. Vuelve pronto para conocer las novedades disponibles.",
    icon: Sparkles,
    iconVariant: "brand" as const,
    prefix: "storefront_coming_soon",
  },
};

export const getDefaultStorefrontTemplate = (
  mode: StorefrontTemplateMode,
): StorefrontTemplateConfig => {
  const meta = storefrontTemplateMeta[mode];

  return {
    mode,
    mediaUrl: "",
    posterUrl: "",
    mediaType: "PHOTO",
    eyebrow: meta.eyebrow,
    title: meta.title,
    description: meta.description,
    showLogo: true,
    desktopObjectPosition: "50% 50%",
    mobileObjectPosition: "50% 50%",
    primaryText: "",
    primaryHref: "",
    secondaryText: "",
    secondaryHref: "",
  };
};

export const readStorefrontTemplateFromSettings = (
  settings: Record<string, any>,
  mode: StorefrontTemplateMode,
): StorefrontTemplateConfig => {
  const defaults = getDefaultStorefrontTemplate(mode);
  const prefix = storefrontTemplateMeta[mode].prefix;
  const mediaType = settings[`${prefix}_media_type`];

  return {
    ...defaults,
    mediaUrl: settings[`${prefix}_media_url`] || "",
    posterUrl: settings[`${prefix}_poster_url`] || "",
    mediaType: mediaType === "VIDEO" ? "VIDEO" : "PHOTO",
    eyebrow: settings[`${prefix}_eyebrow`] || defaults.eyebrow,
    title: settings[`${prefix}_title`] || defaults.title,
    description: settings[`${prefix}_description`] || defaults.description,
    showLogo: settings[`${prefix}_show_logo`] !== "0",
    desktopObjectPosition:
      settings[`${prefix}_desktop_object_position`] ||
      defaults.desktopObjectPosition,
    mobileObjectPosition:
      settings[`${prefix}_mobile_object_position`] ||
      defaults.mobileObjectPosition,
    primaryText: settings[`${prefix}_primary_text`] || "",
    primaryHref: settings[`${prefix}_primary_href`] || "",
    secondaryText: settings[`${prefix}_secondary_text`] || "",
    secondaryHref: settings[`${prefix}_secondary_href`] || "",
  };
};

export const serializeStorefrontTemplate = (
  template: StorefrontTemplateConfig,
) => {
  const prefix = storefrontTemplateMeta[template.mode].prefix;

  return {
    [`${prefix}_media_url`]: template.mediaUrl,
    [`${prefix}_poster_url`]: template.posterUrl,
    [`${prefix}_media_type`]: template.mediaType,
    [`${prefix}_eyebrow`]: template.eyebrow,
    [`${prefix}_title`]: template.title,
    [`${prefix}_description`]: template.description,
    [`${prefix}_show_logo`]: template.showLogo ? "1" : "0",
    [`${prefix}_desktop_object_position`]: template.desktopObjectPosition,
    [`${prefix}_mobile_object_position`]: template.mobileObjectPosition,
    [`${prefix}_primary_text`]: template.primaryText,
    [`${prefix}_primary_href`]: template.primaryHref,
    [`${prefix}_secondary_text`]: template.secondaryText,
    [`${prefix}_secondary_href`]: template.secondaryHref,
  };
};
