const keyForRaffle = (raffleId: number) => `nexus_raffle_early_access_${raffleId}`;

interface StoredRaffleEarlyAccess {
  accessToken: string;
  expiresAt: string | null;
}

export function saveRaffleEarlyAccess(
  raffleId: number,
  access: StoredRaffleEarlyAccess,
) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(keyForRaffle(raffleId), JSON.stringify(access));
}

export function getRaffleEarlyAccessToken(raffleId: number) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(keyForRaffle(raffleId));
    if (!raw) return null;
    const access = JSON.parse(raw) as StoredRaffleEarlyAccess;
    return access.accessToken || null;
  } catch {
    sessionStorage.removeItem(keyForRaffle(raffleId));
    return null;
  }
}
