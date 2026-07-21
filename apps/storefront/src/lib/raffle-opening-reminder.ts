const keyForRaffle = (raffleId: number) =>
  `nexus:raffle-opening-reminder:${raffleId}`;

const RAFFLE_OPENING_REMINDER_EVENT = "nexus:raffle-opening-reminder-changed";

export function hasRegisteredRaffleOpeningReminder(raffleId: number) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(keyForRaffle(raffleId)) === "registered";
}

export function markRaffleOpeningReminderRegistered(raffleId: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyForRaffle(raffleId), "registered");
  window.dispatchEvent(
    new CustomEvent(RAFFLE_OPENING_REMINDER_EVENT, { detail: { raffleId } }),
  );
}

export function subscribeToRaffleOpeningReminder(
  raffleId: number,
  onChange: (isRegistered: boolean) => void,
) {
  if (typeof window === "undefined") return () => undefined;

  const sync = () => onChange(hasRegisteredRaffleOpeningReminder(raffleId));
  const handleReminderChange = (event: Event) => {
    if (
      event instanceof CustomEvent &&
      event.detail?.raffleId === raffleId
    ) {
      sync();
    }
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === keyForRaffle(raffleId)) sync();
  };

  window.addEventListener(RAFFLE_OPENING_REMINDER_EVENT, handleReminderChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(RAFFLE_OPENING_REMINDER_EVENT, handleReminderChange);
    window.removeEventListener("storage", handleStorage);
  };
}
