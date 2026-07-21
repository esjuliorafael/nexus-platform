const keyForRaffle = (raffleId: number) =>
  `nexus:raffle-opening-reminder:${raffleId}`;

export function hasRegisteredRaffleOpeningReminder(raffleId: number) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(keyForRaffle(raffleId)) === "registered";
}

export function markRaffleOpeningReminderRegistered(raffleId: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyForRaffle(raffleId), "registered");
}
