import { createHash, randomBytes } from "node:crypto";
import { TicketStatus, type PrismaClient as RafflePrismaClient } from "@prisma/client-raffle";
import { storePrisma } from "@nexus/db/store";
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
  participationId: string;
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
      participationId: params.participationId,
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

const participantDisplayName = (value: string | null | undefined) => {
  const parts = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  const last = parts.at(-1) || "";
  return `${parts.slice(0, -1).join(" ")} ${last.charAt(0)}.`;
};

async function getRaffleBankInfo() {
  const [raffleChannel, settings] = await Promise.all([
    storePrisma.paymentChannel.findFirst({
      where: { purpose: "RAFFLES" },
      select: {
        bank: true,
        beneficiary: true,
        accountNumber: true,
        clabe: true,
        card: true,
      },
    }),
    storePrisma.setting.findMany({
      where: {
        key: {
          in: [
            "bank_main_name",
            "bank_main_beneficiary",
            "bank_main_account",
            "bank_main_clabe",
            "bank_main_card",
          ],
        },
      },
      select: { key: true, value: true },
    }),
  ]);

  const main = Object.fromEntries(settings.map((item) => [item.key, item.value]));
  const specializedReady = Boolean(raffleChannel?.bank?.trim() && raffleChannel?.beneficiary?.trim());
  const mainReady = Boolean(main.bank_main_name?.trim() && main.bank_main_beneficiary?.trim());
  if (!specializedReady && !mainReady) return null;

  return specializedReady
    ? {
        source: "SPECIALIZED" as const,
        label: "Canal de Rifas",
        bank: raffleChannel!.bank,
        beneficiary: raffleChannel!.beneficiary,
        accountNumber: raffleChannel!.accountNumber,
        clabe: raffleChannel!.clabe,
        card: raffleChannel!.card,
      }
    : {
        source: "MAIN" as const,
        label: "Canal Principal, respaldo",
        bank: main.bank_main_name!,
        beneficiary: main.bank_main_beneficiary!,
        accountNumber: main.bank_main_account || null,
        clabe: main.bank_main_clabe || null,
        card: main.bank_main_card || null,
      };
}

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
  const legacySaleMatch = /^sale-(\d+)$/.exec(access.participationId);
  const legacyToken = access.participationId.startsWith("legacy-");
  const lookupToken = access.participationId.startsWith("lookup-");
  const sales = await rafflePrisma.ticketSale.findMany({
    where: {
      raffleId: raffle.id,
      ...(legacyToken || lookupToken
        ? {}
        : legacySaleMatch
          ? { id: Number(legacySaleMatch[1]) }
          : { reservationId: access.participationId }),
    },
    orderBy: [{ reservationId: "asc" }, { ticketNumber: "asc" }],
  });
  const ownedSales = sales.filter((sale) => {
    const normalized = normalizeCustomerPhone(sale.customerPhone);
    return normalized ? hash(normalized) === access.phoneHash : false;
  });
  if (!ownedSales.length) return null;
  const bankInfo = ownedSales.some(
    (sale) => sale.paymentStatus === TicketStatus.PENDING && sale.paymentMethod === "TRANSFER",
  )
    ? await getRaffleBankInfo()
    : null;

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
    bankInfo,
    participantName: participantDisplayName(ownedSales[0]?.customerName),
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
