import { createHash, randomBytes } from "node:crypto";
import { TicketStatus, type PrismaClient as RafflePrismaClient } from "@prisma/client-raffle";
import { normalizeCustomerPhone } from "../../../utils/customer-phone";

const ACCESS_TOKEN_TTL_DAYS = 180;

const hash = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const storefrontBaseUrl = () =>
  (
    process.env.STOREFRONT_HTTPS_URL ||
    process.env.STOREFRONT_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

export async function createRaffleParticipationAccess(params: {
  rafflePrisma: RafflePrismaClient;
  raffleId: number;
  phone: string;
}) {
  const normalizedPhone = normalizeCustomerPhone(params.phone);
  if (!normalizedPhone) {
    throw new Error("El n\u00famero de WhatsApp no tiene un formato internacional v\u00e1lido.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_DAYS * 86_400_000);
  await params.rafflePrisma.raffleParticipationAccessToken.create({
    data: {
      raffleId: params.raffleId,
      phoneHash: hash(normalizedPhone),
      tokenHash: hash(token),
      expiresAt,
    },
  });

  return {
    token,
    url: `${storefrontBaseUrl()}/participations/${token}`,
    expiresAt,
  };
}

const paymentStatusLabel = (status: TicketStatus) => {
  if (status === TicketStatus.PAID) return "Pago confirmado";
  if (status === TicketStatus.CANCELLED) return "Participaci\u00f3n cancelada";
  return "Apartado pendiente de pago";
};

export async function getRaffleParticipationAccess(
  rafflePrisma: RafflePrismaClient,
  token: string,
) {
  const access = await rafflePrisma.raffleParticipationAccessToken.findUnique({
    where: { tokenHash: hash(token) },
  });
  if (!access || access.revokedAt || (access.expiresAt && access.expiresAt < new Date())) {
    return null;
  }

  const raffle = await rafflePrisma.raffle.findUnique({
    where: { id: access.raffleId },
    include: {
      prizes: { orderBy: { position: "asc" } },
      extraOpportunities: true,
    },
  });

  // The database stores only a hash. Resolve sales with a separate candidate query
  // after checking each candidate hash, so the token never exposes the phone itself.
  if (!raffle) return null;
  const sales = await rafflePrisma.ticketSale.findMany({
    where: { raffleId: raffle.id },
    orderBy: [{ reservationId: "asc" }, { ticketNumber: "asc" }],
  });
  const ownedSales = sales.filter((sale) => {
    const normalized = normalizeCustomerPhone(sale.customerPhone);
    return normalized ? hash(normalized) === access.phoneHash : false;
  });
  if (!ownedSales.length) return null;

  const opportunitiesByTicket = new Map(
    raffle.extraOpportunities.map((item) => [
      item.mainTicketNumber,
      Array.isArray(item.extraOpportunities)
        ? item.extraOpportunities.map(String)
        : [],
    ]),
  );
  const groups = new Map<string, typeof ownedSales>();
  ownedSales.forEach((sale) => {
    const key = sale.reservationId || `sale-${sale.id}`;
    groups.set(key, [...(groups.get(key) || []), sale]);
  });

  return {
    raffle: {
      id: raffle.id,
      title: raffle.title,
      image: raffle.imagePoster || raffle.image,
      drawDate: raffle.drawDate,
      opportunities: raffle.opportunities,
      ticketPrice: Number(raffle.ticketPrice),
      prizes: raffle.prizes.map((prize) => ({
        position: prize.position,
        title: prize.title,
        description: prize.description,
      })),
    },
    participations: Array.from(groups.entries()).map(([reference, items]) => {
      const subtotal = items.reduce((total, item) => total + Number(raffle.ticketPrice), 0);
      const discount = Number(items[0]?.discountTotal || 0);
      return {
        reference,
        status: paymentStatusLabel(items[0].paymentStatus),
        paymentStatus: items[0].paymentStatus,
        paymentMethod: items[0].paymentMethod,
        total: Math.max(0, subtotal - discount),
        tickets: items.map((item) => ({
          number: item.ticketNumber,
          opportunities: opportunitiesByTicket.get(item.ticketNumber) || [],
        })),
      };
    }),
    expiresAt: access.expiresAt,
  };
}
