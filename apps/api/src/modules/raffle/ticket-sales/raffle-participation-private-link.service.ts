import {
  TicketSaleOrigin,
  type PrismaClient as RafflePrismaClient,
} from "@prisma/client-raffle";
import { storePrisma as defaultStorePrisma } from "@nexus/db/store";
type StorePrismaClient = typeof defaultStorePrisma;
import {
  auditActorData,
  type AuditActor,
} from "../../../utils/admin-authorization";
import { normalizeCustomerPhone } from "../../../utils/customer-phone";
import { sendManualParticipationLinkNotification } from "./raffle-participation-lookup.service";
import {
  createRaffleParticipationAccess,
  revokeRaffleParticipationAccess,
} from "./raffle-participation-access.service";

async function resolveParticipation(
  rafflePrisma: RafflePrismaClient,
  participationId: string,
) {
  const legacyMatch = /^sale-(\d+)$/.exec(participationId);
  const sales = await rafflePrisma.ticketSale.findMany({
    where: legacyMatch
      ? { id: Number(legacyMatch[1]) }
      : { reservationId: participationId },
    orderBy: { ticketNumber: "asc" },
  });

  if (!sales.length) {
    throw Object.assign(new Error("No se encontró la participación."), {
      statusCode: 404,
    });
  }
  if (sales.some((sale) => sale.origin !== TicketSaleOrigin.PARTICIPANT)) {
    throw Object.assign(
      new Error("No se puede compartir un enlace para una protección operativa."),
      { statusCode: 409 },
    );
  }

  const phone = normalizeCustomerPhone(sales[0].customerPhone);
  if (!phone) {
    throw Object.assign(
      new Error("Actualiza el teléfono del participante antes de compartir el enlace."),
      { statusCode: 400 },
    );
  }

  const raffle = await rafflePrisma.raffle.findUnique({
    where: { id: sales[0].raffleId },
    select: { title: true },
  });
  if (!raffle) {
    throw Object.assign(new Error("No se encontró la rifa."), {
      statusCode: 404,
    });
  }

  return { sales, phone, raffleName: raffle.title };
}

async function recordPrivateLinkEvent(params: {
  rafflePrisma: RafflePrismaClient;
  participationId: string;
  raffleId: number;
  eventType: string;
  message: string;
  actor: AuditActor;
  expiresAt: Date;
  ticketNumbers: string[];
}) {
  await params.rafflePrisma.raffleParticipationEvent.create({
    data: {
      participationId: params.participationId,
      raffleId: params.raffleId,
      eventType: params.eventType,
      message: params.message,
      ...auditActorData(params.actor),
      metadata: {
        expiresAt: params.expiresAt.toISOString(),
        ticketNumbers: params.ticketNumbers,
      },
    },
  });
}

export async function generateParticipationPrivateLink(params: {
  rafflePrisma: RafflePrismaClient;
  participationId: string;
  actor: AuditActor;
}) {
  const { sales, phone } = await resolveParticipation(
    params.rafflePrisma,
    params.participationId,
  );
  const access = await createRaffleParticipationAccess({
    rafflePrisma: params.rafflePrisma,
    raffleId: sales[0].raffleId,
    participationId: params.participationId,
    phone,
  });

  try {
    await recordPrivateLinkEvent({
      rafflePrisma: params.rafflePrisma,
      participationId: params.participationId,
      raffleId: sales[0].raffleId,
      eventType: "PRIVATE_LINK_GENERATED",
      message: "Se generó un enlace privado para compartir manualmente.",
      actor: params.actor,
      expiresAt: access.expiresAt,
      ticketNumbers: sales.map((sale) => sale.ticketNumber),
    });
  } catch (error) {
    await revokeRaffleParticipationAccess(params.rafflePrisma, access.token);
    throw error;
  }

  return { url: access.url, expiresAt: access.expiresAt.toISOString() };
}

export async function sendParticipationPrivateLink(params: {
  rafflePrisma: RafflePrismaClient;
  storePrisma: StorePrismaClient;
  participationId: string;
  actor: AuditActor;
}) {
  const { sales, phone, raffleName } = await resolveParticipation(
    params.rafflePrisma,
    params.participationId,
  );
  const access = await createRaffleParticipationAccess({
    rafflePrisma: params.rafflePrisma,
    raffleId: sales[0].raffleId,
    participationId: params.participationId,
    phone,
  });

  try {
    await sendManualParticipationLinkNotification({
      storePrisma: params.storePrisma,
      recipientPhone: phone,
      participationUrl: access.url,
      customerName: sales[0].customerName || "participante",
      raffleName,
      ticketSaleId: sales[0].id,
    });
  } catch {
    await revokeRaffleParticipationAccess(params.rafflePrisma, access.token).catch(
      (error) => {
        console.error("[Raffle participation link] Could not revoke failed delivery link:", error);
      },
    );
    await recordPrivateLinkEvent({
      rafflePrisma: params.rafflePrisma,
      participationId: params.participationId,
      raffleId: sales[0].raffleId,
      eventType: "PRIVATE_LINK_SEND_FAILED",
      message: "No se pudo enviar el enlace privado por WhatsApp.",
      actor: params.actor,
      expiresAt: access.expiresAt,
      ticketNumbers: sales.map((sale) => sale.ticketNumber),
    });
    throw Object.assign(
      new Error("No se pudo enviar el enlace privado por WhatsApp."),
      { statusCode: 503 },
    );
  }

  await recordPrivateLinkEvent({
    rafflePrisma: params.rafflePrisma,
    participationId: params.participationId,
    raffleId: sales[0].raffleId,
    eventType: "PRIVATE_LINK_SENT",
    message: "Se envió por WhatsApp un enlace privado de participación.",
    actor: params.actor,
    expiresAt: access.expiresAt,
    ticketNumbers: sales.map((sale) => sale.ticketNumber),
  });

  return { success: true, expiresAt: access.expiresAt.toISOString() };
}
