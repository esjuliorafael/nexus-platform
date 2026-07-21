import type { Raffle } from "@prisma/client-raffle";

type RaffleAccessFields = Pick<
  Raffle,
  "status" | "published" | "participationStartsAt" | "participationEndsAt" | "earlyAccessEnabled"
>;

export type RaffleParticipationState = "OPEN" | "UPCOMING" | "EARLY_ACCESS" | "CLOSED" | "UNAVAILABLE";

export const getRaffleParticipationState = (
  raffle: RaffleAccessFields,
  now = new Date(),
): RaffleParticipationState => {
  if (!raffle.published || raffle.status !== "ACTIVE") return "UNAVAILABLE";
  if (raffle.participationEndsAt && now >= raffle.participationEndsAt) return "CLOSED";
  if (raffle.participationStartsAt && now < raffle.participationStartsAt) {
    return raffle.earlyAccessEnabled ? "EARLY_ACCESS" : "UPCOMING";
  }
  return "OPEN";
};

export const canParticipateInRaffle = (
  raffle: RaffleAccessFields,
  earlyAccessAuthorized = false,
  now = new Date(),
) => {
  const state = getRaffleParticipationState(raffle, now);
  return state === "OPEN" || (state === "EARLY_ACCESS" && earlyAccessAuthorized);
};

export const toPublicRaffle = <T extends { earlyAccessCodeHash?: string | null }>(raffle: T) => {
  const { earlyAccessCodeHash, ...publicRaffle } = raffle;
  return {
    ...publicRaffle,
    earlyAccessConfigured: Boolean(earlyAccessCodeHash),
    participationState: getRaffleParticipationState(publicRaffle as unknown as RaffleAccessFields),
  };
};
