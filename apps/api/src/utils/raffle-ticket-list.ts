interface RaffleOpportunityLike {
  mainTicketNumber: string | number;
  extraOpportunities?: unknown;
}

interface RaffleTicketSaleLike {
  ticketNumber: string | number;
  raffle?: {
    extraOpportunities?: RaffleOpportunityLike[];
  } | null;
}

const compareTicketNumbers = (left: string, right: string) => {
  const numericDifference = Number(left) - Number(right);
  return numericDifference || left.localeCompare(right);
};

const formatListWithConjunction = (values: string[]) => {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} y ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} y ${values.at(-1)}`;
};

export function formatRaffleTicketList(sales: RaffleTicketSaleLike[]): string {
  const opportunityMap = new Map<string, string[]>();
  const raffleOpportunities = sales[0]?.raffle?.extraOpportunities ?? [];

  for (const opportunity of raffleOpportunities) {
    const extras = Array.isArray(opportunity.extraOpportunities)
      ? opportunity.extraOpportunities
          .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
          .map(String)
          .sort(compareTicketNumbers)
      : [];

    opportunityMap.set(String(opportunity.mainTicketNumber), extras);
  }

  const ticketNumbers = Array.from(new Set(sales.map((sale) => String(sale.ticketNumber))))
    .sort(compareTicketNumbers);
  const ticketSummary = formatListWithConjunction(ticketNumbers);
  const opportunityLines = ticketNumbers
    .map((ticketNumber) => {
      const extras = opportunityMap.get(ticketNumber) ?? [];
      return extras.length > 0 ? `${ticketNumber}: ${extras.join(", ")}` : null;
    })
    .filter((line): line is string => Boolean(line));

  if (opportunityLines.length === 0) return ticketSummary;

  return [
    ticketSummary,
    "",
    "✨ Oportunidades adicionales:",
    "",
    opportunityLines.join("\n"),
  ].join("\n");
}
