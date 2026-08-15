const MEXICO_CITY_TIME_ZONE = "America/Mexico_City";

export function calculateRaffleReservationExpiration(
  createdAt: Date,
  drawDate: Date | null | undefined,
  releaseHours: number,
  now = new Date(),
) {
  const configuredDeadline = new Date(
    createdAt.getTime() + Math.max(0, releaseHours) * 3_600_000,
  );

  if (drawDate && drawDate > createdAt && drawDate < configuredDeadline) {
    return drawDate;
  }

  return configuredDeadline > now ? configuredDeadline : now;
}

export function formatRaffleTimeLimit(expiresAt: Date, now = new Date()) {
  const totalMinutes = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - now.getTime()) / 60_000),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
  if (minutes === 0) return `${hours} hora${hours === 1 ? "" : "s"}`;
  return `${hours} hora${hours === 1 ? "" : "s"} y ${minutes} minuto${minutes === 1 ? "" : "s"}`;
}

export function formatRaffleDeadline(expiresAt: Date) {
  const value = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: MEXICO_CITY_TIME_ZONE,
  }).format(expiresAt);

  return value.charAt(0).toLocaleUpperCase("es-MX") + value.slice(1);
}
