export function getWhatsappDeliveryRouteLabel(responsePayload: unknown) {
  if (!responsePayload || typeof responsePayload !== "object") return null;
  const routing = (responsePayload as any).nexusRouting;
  if (!routing || typeof routing !== "object") return null;

  if (routing.route === "PRINCIPAL_FALLBACK") {
    return "Canal Principal por contingencia";
  }

  if (routing.route === "DIRECT" && routing.preferredInstanceName) {
    return `Canal Especializado · ${routing.preferredInstanceName}`;
  }

  if (routing.route === "DIRECT") {
    return "Canal Principal";
  }

  return null;
}

export function getWhatsappProviderLabel(provider?: string | null) {
  if (provider === "KAPSO") return "Kapso · WhatsApp Cloud API";
  if (provider === "EVOLUTION") return "Evolution API";
  return "Proveedor no identificado";
}
