export function parseCalendarDate(value?: string | null): Date | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year
      && date.getMonth() === month - 1
      && date.getDate() === day
    ) {
      return date;
    }
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatCalendarDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = "Por definir",
) {
  const date = parseCalendarDate(value);
  return date ? new Intl.DateTimeFormat("es-MX", options).format(date) : fallback;
}
