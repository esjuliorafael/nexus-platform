import IORedis from "ioredis";
import {
  PaymentHoldStatus,
  RaffleStatus,
  TicketStatus,
} from "@prisma/client-raffle";
import type { PrismaClient as RafflePrismaClient } from "@prisma/client-raffle";
import type { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import {
  customerPhoneCandidates,
  normalizeCustomerPhone,
} from "../../../utils/customer-phone";
import { createRaffleParticipationAccess } from "./raffle-participation-access.service";
import {
  TicketAvailabilityConflictError,
  ticketSaleService,
} from "./ticket-sale.service";
import { ticketService } from "../tickets/ticket.service";

const SESSION_TTL_SECONDS = 15 * 60;
const REDIS_KEY_PREFIX = "nexus:raffle-whatsapp-assistant:";
const redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

type AssistantState = "RAFFLE_SELECT" | "TICKET_SELECT" | "CUSTOMER_NAME";

type AssistantSession = {
  state: AssistantState;
  raffleId?: number;
  selectedTickets?: string[];
  expiresAt: string;
};

type ActiveRaffle = {
  id: number;
  title: string;
  ticketPrice: unknown;
  ticketQuantity: number;
  opportunities: number;
  digits: number;
  primaryTickets: Set<string>;
  availableTickets: Set<string>;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-MX");

const sessionKey = (channelKey: string, phone: string) =>
  `${REDIS_KEY_PREFIX}${channelKey}:${normalizeCustomerPhone(phone)}`;

async function getSession(channelKey: string, phone: string) {
  const raw = await redis.get(sessionKey(channelKey, phone));
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AssistantSession;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await redis.del(sessionKey(channelKey, phone));
      return null;
    }
    return session;
  } catch {
    await redis.del(sessionKey(channelKey, phone));
    return null;
  }
}

async function saveSession(
  channelKey: string,
  phone: string,
  session: Omit<AssistantSession, "expiresAt">,
) {
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_SECONDS * 1000,
  ).toISOString();
  await redis.setex(
    sessionKey(channelKey, phone),
    SESSION_TTL_SECONDS,
    JSON.stringify({ ...session, expiresAt }),
  );
}

async function clearSession(channelKey: string, phone: string) {
  await redis.del(sessionKey(channelKey, phone));
}

function menuMessage() {
  return [
    "Hola. Puedo ayudarte con tus rifas. 🎟️",
    "",
    "1️⃣ Consultar boletos disponibles y apartar",
    "2️⃣ Consultar mis participaciones",
    "0️⃣ Salir",
    "",
    "Responde con el número de una opción.",
  ].join("\n");
}

async function getActiveRaffles(
  prisma: RafflePrismaClient,
): Promise<ActiveRaffle[]> {
  const now = new Date();
  const raffles = await prisma.raffle.findMany({
    where: {
      status: RaffleStatus.ACTIVE,
      published: true,
      resultPublishedAt: null,
      OR: [
        { participationStartsAt: null },
        { participationStartsAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { participationEndsAt: null },
            { participationEndsAt: { gt: now } },
          ],
        },
      ],
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      ticketPrice: true,
      ticketQuantity: true,
      opportunities: true,
      distribution: true,
    },
  });

  const result: ActiveRaffle[] = [];
  for (const raffle of raffles) {
    const primaryTickets = await ticketService.getPrimaryTicketNumbers(
      prisma,
      raffle.id,
    );
    const digits = ticketService.computeUniverse(
      raffle.ticketQuantity,
      raffle.opportunities,
    ).digits;
    const occupiedSales = await prisma.ticketSale.findMany({
      where: {
        raffleId: raffle.id,
        paymentStatus: { in: [TicketStatus.PENDING, TicketStatus.PAID] },
      },
      select: { ticketNumber: true },
    });
    const activeHolds = await prisma.rafflePaymentHold.findMany({
      where: {
        raffleId: raffle.id,
        status: PaymentHoldStatus.ACTIVE,
        expiresAt: { gt: now },
      },
      select: { ticketNumbers: true },
    });
    const occupied = new Set([
      ...occupiedSales.map((sale) => sale.ticketNumber),
      ...activeHolds.flatMap((hold) => hold.ticketNumbers),
    ]);
    result.push({
      ...raffle,
      digits,
      primaryTickets,
      availableTickets: new Set(
        Array.from(primaryTickets).filter((ticket) => !occupied.has(ticket)),
      ),
    });
  }
  return result;
}

function raffleListMessage(raffles: ActiveRaffle[]) {
  return [
    "Estas son las rifas disponibles. 🎟️",
    "",
    ...raffles.map(
      (raffle, index) =>
        `${index + 1}. ${raffle.title} · ${raffle.availableTickets.size} boletos disponibles`,
    ),
    "",
    "Responde con el número de la rifa.",
    "0️⃣ Cancelar",
  ].join("\n");
}

function ticketPrompt(raffle: ActiveRaffle) {
  const price = Number(raffle.ticketPrice).toFixed(2);
  const opportunityNote =
    raffle.opportunities > 1
      ? ` 🎯 Cada boleto participa con ${raffle.opportunities} números.`
      : "";
  return [
    `🎟️ Rifa seleccionada: ${raffle.title}`,
    `🎫 Boletos disponibles: ${raffle.availableTickets.size}`,
    `💰 Precio por boleto: $${price} MXN.${opportunityNote}`,
    "",
    "Escribe los números que deseas apartar, separados por coma.",
    "Ejemplo: 05, 13",
    "0️⃣ Cancelar",
  ].join("\n");
}

function parseTicketNumbers(text: string, digits: number) {
  const values = text.match(/\d+/g) || [];
  return Array.from(
    new Set(values.map((value) => value.padStart(digits, "0"))),
  );
}

async function listCustomerParticipations(
  prisma: RafflePrismaClient,
  phone: string,
) {
  const sales = await prisma.ticketSale.findMany({
    where: { customerPhone: { in: customerPhoneCandidates(phone) } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reservationId: true,
      ticketNumber: true,
      paymentStatus: true,
      raffleId: true,
      raffle: { select: { title: true } },
    },
  });
  if (sales.length === 0) {
    return "No encontramos participaciones asociadas a este número.";
  }

  const groups = new Map<string, typeof sales>();
  for (const sale of sales) {
    const key = `${sale.raffleId}:${sale.reservationId || `sale-${sale.id}`}`;
    groups.set(key, [...(groups.get(key) || []), sale]);
  }
  const lines = ["Encontré estas participaciones. 🔎", ""];
  for (const group of Array.from(groups.values())) {
    const first = group[0];
    const access = await createRaffleParticipationAccess({
      rafflePrisma: prisma,
      raffleId: first.raffleId,
      participationId: first.reservationId || `sale-${first.id}`,
      phone,
    });
    const status = group.every(
      (sale) => sale.paymentStatus === TicketStatus.PAID,
    )
      ? "Pagada"
      : group.some((sale) => sale.paymentStatus === TicketStatus.PENDING)
        ? "Pendiente de pago"
        : "Cancelada";
    lines.push(
      `🎟️ ${first.raffle.title}\n🎫 Boletos: ${group.map((sale) => sale.ticketNumber).join(", ")}\n📌 Estado: ${status}\n🔎 ${access.url}`,
      "",
    );
  }
  return lines.join("\n").trim();
}

export async function handleRaffleWhatsappMessage(params: {
  rafflePrisma: RafflePrismaClient;
  storePrisma: StorePrismaClient;
  phone: string;
  channelKey: string;
  text: string;
}) {
  const phone = normalizeCustomerPhone(params.phone);
  const text = normalizeText(params.text);
  if (!phone || !text) return { handled: false, reply: null };

  const session = await getSession(params.channelKey, phone);
  const isMenuCommand =
    /^(hola|menu|menú|iniciar|rifa|boletos|apartar|participar|1|2|0|cancelar|salir)$/.test(
      text,
    );
  if (!session && !isMenuCommand) return { handled: false, reply: null };
  if (text === "0" || text === "cancelar" || text === "salir") {
    await clearSession(params.channelKey, phone);
    return {
      handled: true,
      reply: "Operación cancelada. ✅ Escribe MENU cuando quieras comenzar.",
    };
  }

  if (text === "menu" || text === "hola" || text === "iniciar") {
    await clearSession(params.channelKey, phone);
    return { handled: true, reply: menuMessage() };
  }

  if (!session) {
    if (text === "2") {
      return {
        handled: true,
        reply: await listCustomerParticipations(params.rafflePrisma, phone),
      };
    }
    if (
      text === "1" ||
      text.includes("boleto") ||
      text.includes("apartar") ||
      text.includes("participar")
    ) {
      const raffles = await getActiveRaffles(params.rafflePrisma);
      if (raffles.length === 0) {
        return {
          handled: true,
          reply: "En este momento no hay rifas abiertas para apartar boletos. ℹ️",
        };
      }
      if (raffles.length === 1) {
        await saveSession(params.channelKey, phone, {
          state: "TICKET_SELECT",
          raffleId: raffles[0].id,
        });
        return { handled: true, reply: ticketPrompt(raffles[0]) };
      }
      await saveSession(params.channelKey, phone, { state: "RAFFLE_SELECT" });
      return { handled: true, reply: raffleListMessage(raffles) };
    }
    return { handled: true, reply: menuMessage() };
  }

  const raffles = await getActiveRaffles(params.rafflePrisma);
  if (session.state === "RAFFLE_SELECT") {
    const index = Number.parseInt(text, 10) - 1;
    if (!Number.isInteger(index) || !raffles[index]) {
      return {
        handled: true,
        reply:
          "No reconocí esa opción. Responde con el número de la rifa o 0 para cancelar.",
      };
    }
    await saveSession(params.channelKey, phone, {
      state: "TICKET_SELECT",
      raffleId: raffles[index].id,
    });
    return { handled: true, reply: ticketPrompt(raffles[index]) };
  }

  const raffle = raffles.find((item) => item.id === session.raffleId);
  if (!raffle) {
    await clearSession(params.channelKey, phone);
    return {
      handled: true,
      reply:
        "La rifa seleccionada ya no está disponible. Escribe MENU para comenzar de nuevo.",
    };
  }

  if (session.state === "TICKET_SELECT") {
    const tickets = parseTicketNumbers(text, raffle.digits);
    const invalid = tickets.filter(
      (ticket) => !raffle.primaryTickets.has(ticket),
    );
    const unavailable = tickets.filter(
      (ticket) => !raffle.availableTickets.has(ticket),
    );
    if (tickets.length === 0 || invalid.length > 0 || unavailable.length > 0) {
      return {
        handled: true,
        reply: [
          "No pude confirmar esos boletos. ⚠️",
          invalid.length
            ? `No pertenecen a esta boletera: ${invalid.join(", ")}.`
            : "",
          unavailable.length
            ? `Ya no están disponibles: ${unavailable.join(", ")}.`
            : "",
          "Escribe otros números separados por coma o 0 para cancelar.",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
    await saveSession(params.channelKey, phone, {
      state: "CUSTOMER_NAME",
      raffleId: raffle.id,
      selectedTickets: tickets,
    });
    return {
      handled: true,
      reply: `✅ Seleccionaste ${tickets.join(", ")}. Escribe tu nombre completo para crear el apartado por Depósito / Transferencia.`,
    };
  }

  const customerName = params.text.trim().replace(/\s+/g, " ");
  if (
    customerName.length < 2 ||
    customerName.length > 120 ||
    /\d/.test(customerName)
  ) {
    return {
      handled: true,
      reply: "Escribe tu nombre completo, sin números, o 0️⃣ para cancelar.",
    };
  }
  try {
    await ticketSaleService.reserveTickets(
      params.rafflePrisma,
      params.storePrisma,
      {
        raffleId: raffle.id,
        tickets: session.selectedTickets || [],
        customerName,
        customerPhone: phone,
        paymentMethod: "TRANSFER",
        marketingConsent: false,
      },
    );
    await clearSession(params.channelKey, phone);
    return {
      handled: true,
      // reserveTickets already queues the canonical reservation notification,
      // including the amount and payment instructions. Avoid sending a second
      // confirmation from the conversational transport.
      reply: null,
    };
  } catch (error: any) {
    if (error instanceof TicketAvailabilityConflictError) {
      return {
        handled: true,
        reply:
          "Uno de los boletos dejó de estar disponible. ⚠️ Escribe MENU para consultar nuevamente la boletera.",
      };
    }
    if (error?.message === "RAFFLE_UNAVAILABLE") {
      await clearSession(params.channelKey, phone);
      return { handled: true, reply: "La rifa ya no admite participaciones. ⚠️" };
    }
    throw error;
  }
}
