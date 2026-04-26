import { PrismaClient, Raffle, RaffleDistribution } from "@prisma/client-raffle";

export const ticketService = {
  // Calculates universe metadata from raffle config
  computeUniverse(ticketQuantity: number, opportunities: number) {
    const universo = ticketQuantity * opportunities;
    const isPowerOf10 = Number.isInteger(Math.log10(universo)) && Math.log10(universo) >= 1;
    const startFromZero = isPowerOf10;
    const digits = startFromZero
      ? Math.log10(universo)          // 100 → 2 digits (00-99)
      : String(universo).length;      // 99  → 2 digits (01-99)
    return { universo, startFromZero, digits };
  },

  // Generates and persists RaffleOpportunity rows
  async generateOpportunities(prisma: PrismaClient, raffle: Raffle) {
    const { universo, startFromZero, digits } = this.computeUniverse(
      raffle.ticketQuantity,
      raffle.opportunities
    );

    const pad = (n: number) => String(n).padStart(digits, '0');

    // Full number pool
    const pool = Array.from({ length: universo }, (_, i) =>
      pad(startFromZero ? i : i + 1)
    );

    const primary = pool.slice(0, raffle.ticketQuantity);
    let extras = pool.slice(raffle.ticketQuantity);

    // Fisher-Yates shuffle for RANDOM distribution
    if (raffle.distribution === RaffleDistribution.RANDOM && extras.length > 0) {
      for (let i = extras.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [extras[i], extras[j]] = [extras[j], extras[i]];
      }
    }

    // Build RaffleOpportunity records
    const opps = primary.map((num, idx) => {
      const myExtras: string[] = [];
      for (let k = 0; k < raffle.opportunities - 1; k++) {
        myExtras.push(extras[idx + k * raffle.ticketQuantity]);
      }
      return {
        raffleId: raffle.id,
        mainTicketNumber: num,
        extraOpportunities: myExtras, // stored as Json
      };
    });

    await prisma.raffleOpportunity.createMany({ data: opps });

    return { digits, startFromZero, universo };
  },

  // Returns all valid numbers for a raffle (for reservation validation)
  async getAllNumbers(prisma: PrismaClient, raffleId: number) {
    const opps = await prisma.raffleOpportunity.findMany({
      where: { raffleId },
    });
    const all = new Set<string>();
    opps.forEach(o => {
      all.add(o.mainTicketNumber);
      const extras = o.extraOpportunities as string[];
      if (Array.isArray(extras)) {
        extras.forEach(n => all.add(n));
      }
    });
    return all;
  },
};
