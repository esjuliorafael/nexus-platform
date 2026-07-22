export function getWhatsappDeliveryRouteLabel(responsePayload: unknown) {
  if (!responsePayload || typeof responsePayload !== "object") return null;
  const routing = (responsePayload as any).nexusRouting;
  if (!routing || typeof routing !== "object") return null;

  if (routing.route === "PRINCIPAL_FALLBACK") {
    return "Canal Principal por contingencia";
  }

  return null;
}
