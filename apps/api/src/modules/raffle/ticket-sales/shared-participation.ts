export type RaffleParticipationMode = "FULL" | "SHARED";

export const SHARED_PARTICIPATION_SHARE_COUNT = 2;

export const isSharedParticipationPriceSupported = (ticketPrice: number | string) => {
  const cents = Math.round(Number(ticketPrice) * 100);
  return Number.isFinite(cents) && cents > 0 && cents % SHARED_PARTICIPATION_SHARE_COUNT === 0;
};

export const getParticipationUnitPrice = (
  ticketPrice: number | string,
  mode: RaffleParticipationMode,
) => {
  const price = Number(ticketPrice);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("INVALID_TICKET_PRICE");
  }

  if (mode === "FULL") return Number(price.toFixed(2));

  const cents = Math.round(price * 100);
  if (!isSharedParticipationPriceSupported(price)) {
    throw new Error("SHARED_PARTICIPATION_PRICE_NOT_DIVISIBLE");
  }
  return Number((cents / SHARED_PARTICIPATION_SHARE_COUNT / 100).toFixed(2));
};

export const getAvailableSharedShareIndex = (
  claims: Array<{
    participationMode?: string | null;
    shareIndex?: number | null;
  }>,
) => {
  if (claims.some((claim) => claim.participationMode !== "SHARED")) return null;

  const occupied = new Set(
    claims
      .map((claim) => claim.shareIndex)
      .filter((shareIndex): shareIndex is number => shareIndex === 1 || shareIndex === 2),
  );
  return occupied.has(1) && occupied.has(2)
    ? null
    : occupied.has(1)
      ? 2
      : 1;
};

export const assertSharedParticipationAllowed = (raffle: {
  sharedParticipationEnabled?: boolean;
  sharedParticipationActivatedAt?: Date | null;
}, mode: RaffleParticipationMode, ticketPrice: number | string) => {
  if (mode === "FULL") return;
  if (!raffle.sharedParticipationEnabled || !raffle.sharedParticipationActivatedAt) {
    throw new Error("SHARED_PARTICIPATION_DISABLED");
  }
  if (raffle.sharedParticipationActivatedAt.getTime() > Date.now()) {
    throw new Error("SHARED_PARTICIPATION_NOT_ACTIVE");
  }
  getParticipationUnitPrice(ticketPrice, mode);
};
