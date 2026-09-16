export type RaffleParticipationMode = 'FULL' | 'SHARED';

export const getRaffleParticipationUnitPrice = (
  ticketPrice: number | string,
  mode: RaffleParticipationMode,
) => mode === 'SHARED'
  ? Number((Number(ticketPrice) / 2).toFixed(2))
  : Number(ticketPrice);

export const isRaffleTicketPartiallyShared = (
  availability: {
    status: 'RESERVED' | 'PAID' | 'SHARED';
    shared?: { occupied: number } | null;
  } | undefined,
) => availability?.status === 'SHARED' && availability.shared?.occupied === 1;

export const getRaffleTicketDisplayStatus = (
  availability: {
    status: 'RESERVED' | 'PAID' | 'SHARED';
    shared?: { available: number; shares: Array<{ status: 'RESERVED' | 'PAID' }> } | null;
  } | undefined,
  mode: RaffleParticipationMode,
) => {
  if (!availability) return 'AVAILABLE' as const;
  if (mode === 'SHARED' && availability.status === 'SHARED' && (availability.shared?.available ?? 0) > 0) {
    return 'AVAILABLE' as const;
  }
  if (availability.status === 'SHARED') {
    return availability.shared?.shares.some((share) => share.status === 'RESERVED')
      ? 'RESERVED' as const
      : 'PAID' as const;
  }
  return availability.status;
};
