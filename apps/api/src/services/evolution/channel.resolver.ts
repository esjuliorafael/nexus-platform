export type OrderItemPurpose = "BREEDING" | "COMBAT" | null;

export interface ChannelConfig {
  id: number;
  name: string;
  purpose: string;
  instanceName: string | null;
  evolutionUrl: string | null;
  evolutionKey: string | null;
  phone: string;
  template: string;
  templates?: any[]; // Dynamic templates from relation
}

export type OrderKind =
  | { type: "mixed" }
  | { type: "articles_only" }
  | { type: "birds_only"; purpose: OrderItemPurpose }
  | { type: "raffle_reservation" };

export interface ResolvedChannels {
  paymentChannel: ChannelConfig | null;
  whatsappChannel: ChannelConfig | null;
}

export function resolveChannels(
  orderKind: OrderKind,
  availableChannels: ChannelConfig[]
): ResolvedChannels {
  const find = (purpose: string) =>
    availableChannels.find(
      (c) => c.purpose.toLowerCase() === purpose.toLowerCase()
    ) ?? null;

  switch (orderKind.type) {
    case "mixed":
    case "articles_only":
      // For general store orders, we don't return a specific channel
      // so the worker will use the global principal configuration.
      return { paymentChannel: null, whatsappChannel: null };

    case "birds_only": {
      if (!orderKind.purpose) return { paymentChannel: null, whatsappChannel: null };
      const ch = find(orderKind.purpose);
      return { paymentChannel: ch, whatsappChannel: ch };
    }

    case "raffle_reservation": {
      const ch = find("RAFFLES");
      return { paymentChannel: ch, whatsappChannel: ch };
    }
  }
}
