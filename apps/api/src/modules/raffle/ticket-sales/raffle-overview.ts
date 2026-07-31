type RaffleOverviewParticipation = {
  id: string;
  status: string;
  ticketNumbers: string[];
  total: number;
  createdAt: Date | string;
};

type RaffleOverviewHold = {
  id: string;
  holdStatus?: string | null;
  expiresAt?: Date | string | null;
  ticketNumbers: string[];
  createdAt: Date | string;
};

type OperationalStatus = "available" | "review" | "reserved" | "paid";

export function buildRaffleOperationalOverview(input: {
  raffleId: number;
  ticketQuantity: number;
  participations: RaffleOverviewParticipation[];
  holds: RaffleOverviewHold[];
  now?: Date;
}) {
  const priority: Record<OperationalStatus, number> = {
    available: 0,
    review: 1,
    reserved: 2,
    paid: 3,
  };
  const statusByTicket = new Map<
    string,
    { status: OperationalStatus; participationId: string }
  >();
  const setTicketStatus = (
    ticketNumber: string,
    status: OperationalStatus,
    participationId: string,
  ) => {
    const current = statusByTicket.get(ticketNumber);
    if (!current || priority[status] >= priority[current.status]) {
      statusByTicket.set(ticketNumber, { status, participationId });
    }
  };

  for (const participation of input.participations) {
    const status: OperationalStatus | null =
      participation.status === "PAID"
        ? "paid"
        : participation.status === "PENDING" ||
            participation.status === "MIXED"
          ? "reserved"
          : participation.status === "PAYMENT_REVIEW"
            ? "review"
            : null;
    if (!status) continue;
    participation.ticketNumbers.forEach((ticketNumber) =>
      setTicketStatus(ticketNumber, status, participation.id),
    );
  }

  const now = (input.now || new Date()).getTime();
  for (const hold of input.holds) {
    const isProtected =
      ["ACTIVE", "PROCESSING"].includes(
        String(hold.holdStatus || "").toUpperCase(),
      ) &&
      (!hold.expiresAt || new Date(hold.expiresAt).getTime() > now);
    if (!isProtected) continue;
    hold.ticketNumbers.forEach((ticketNumber) =>
      setTicketStatus(ticketNumber, "review", hold.id),
    );
  }

  const ticketStatuses = Array.from(
    statusByTicket,
    ([ticketNumber, value]) => ({
      ticketNumber,
      status: value.status,
      participationId: value.participationId,
    }),
  ).sort((left, right) =>
    left.ticketNumber.localeCompare(right.ticketNumber, "es-MX", {
      numeric: true,
    }),
  );
  const paid = ticketStatuses.filter((entry) => entry.status === "paid").length;
  const reserved = ticketStatuses.filter(
    (entry) => entry.status === "reserved",
  ).length;
  const review = ticketStatuses.filter(
    (entry) => entry.status === "review",
  ).length;
  const occupied = paid + reserved + review;
  const available = Math.max(0, input.ticketQuantity - occupied);
  const revenue = input.participations
    .filter((participation) => participation.status === "PAID")
    .reduce(
      (total, participation) => total + Number(participation.total || 0),
      0,
    );
  const participationHistory = [
    ...input.participations,
    ...input.holds,
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );

  return {
    raffleId: input.raffleId,
    metrics: {
      paid,
      reserved,
      review,
      occupied,
      available,
      revenue: Number(revenue.toFixed(2)),
      occupancy:
        input.ticketQuantity > 0
          ? Number(((occupied / input.ticketQuantity) * 100).toFixed(2))
          : 0,
    },
    ticketStatuses,
    recentParticipations: participationHistory.slice(0, 5),
    participationHistory,
    updatedAt: (input.now || new Date()).toISOString(),
  };
}
