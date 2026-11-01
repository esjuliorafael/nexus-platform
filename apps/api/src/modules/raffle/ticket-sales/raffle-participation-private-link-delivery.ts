import type { PrismaClient as RafflePrismaClient } from "@prisma/client-raffle";
import type { WhatsappJobData } from "../../../queues/whatsapp.queue";
import { revokeRaffleParticipationAccess } from "./raffle-participation-access.service";

export type ManualParticipationLinkJobData = Extract<
  WhatsappJobData,
  { kind: "raffle-participation-link-manual" }
>;

export function getManualParticipationLinkJobId(requestEventId: number) {
  return `raffle-private-link-${requestEventId}`;
}

export async function finalizeManualParticipationLinkDelivery(params: {
  rafflePrisma: RafflePrismaClient;
  jobData: WhatsappJobData;
  outcome: "DELIVERED" | "FAILED";
  revokeAccess?: typeof revokeRaffleParticipationAccess;
}) {
  if (params.jobData.kind !== "raffle-participation-link-manual") return false;

  const event = await params.rafflePrisma.raffleParticipationEvent.findUnique({
    where: { id: params.jobData.requestEventId },
    select: { eventType: true, metadata: true },
  });
  if (!event || event.eventType !== "PRIVATE_LINK_SEND_REQUESTED") return false;

  if (params.outcome === "FAILED") {
    try {
      await (params.revokeAccess || revokeRaffleParticipationAccess)(
        params.rafflePrisma,
        params.jobData.accessToken,
      );
    } catch (error) {
      console.error(
        "[Raffle participation link] Could not revoke failed delivery link:",
        error,
      );
    }
  }

  const metadata =
    event.metadata &&
    typeof event.metadata === "object" &&
    !Array.isArray(event.metadata)
      ? event.metadata
      : {};
  await params.rafflePrisma.raffleParticipationEvent.update({
    where: { id: params.jobData.requestEventId },
    data: {
      eventType:
        params.outcome === "DELIVERED"
          ? "PRIVATE_LINK_SENT"
          : "PRIVATE_LINK_SEND_FAILED",
      message:
        params.outcome === "DELIVERED"
          ? "WhatsApp confirmó la entrega del enlace privado."
          : "No se pudo entregar el enlace privado por WhatsApp.",
      metadata: {
        ...metadata,
        deliveryStatus: params.outcome,
        whatsappJobId: getManualParticipationLinkJobId(
          params.jobData.requestEventId,
        ),
      },
    },
  });
  return true;
}
