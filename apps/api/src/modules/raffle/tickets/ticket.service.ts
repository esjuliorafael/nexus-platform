import { Prisma, PrismaClient, Raffle, RaffleDistribution } from "@prisma/client-raffle";

type RaffleDatabaseClient = PrismaClient | Prisma.TransactionClient;

export const ticketService = {
  // Calculates universe metadata from raffle config
  computeUniverse(ticketQuantity: number, opportunities: number) {
    const universo = ticketQuantity * opportunities;
    
    // Check if power of 10 using integer arithmetic to avoid floating point issues
    const isPowerOf10 = (() => {
      let n = universo;
      if (n < 10) return false;
      while (n % 10 === 0) n /= 10;
      return n === 1;
    })();

    const startFromZero = isPowerOf10;
    const digits = startFromZero
      ? Math.round(Math.log10(universo))  // 100 -> 2 (00-99)
      : String(universo).length;          // 99 -> 2 (01-99)
    return { universo, startFromZero, digits };
  },

  // Generates and persists RaffleOpportunity rows
  async generateOpportunities(prisma: RaffleDatabaseClient, raffle: Raffle) {
    const { universo, startFromZero, digits } = this.computeUniverse(
      raffle.ticketQuantity,
      raffle.opportunities
    );

    const pad = (n: number) => String(n).padStart(digits, '0');

    // Full number pool
    const pool = Array.from({ length: universo }, (_, i) => {
      // In OPPORTUNITIES raffles, tickets ALWAYS start at 1 (01, 001...). 
      // The 00 belongs to the extra opportunities pool.
      if (raffle.opportunities > 1 && startFromZero) {
        return pad((i + 1) % universo); // Sequence: 01, 02, ..., 99, 00
      }
      return pad(startFromZero ? i : i + 1);
    });

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

  // Only main ticket folios can be reserved. Extra opportunities are assigned to
  // their main folio and must never be offered or sold independently.
  async getPrimaryTicketNumbers(prisma: RaffleDatabaseClient, raffleId: number) {
    const opps = await prisma.raffleOpportunity.findMany({
      where: { raffleId },
      orderBy: { mainTicketNumber: "asc" },
      select: { mainTicketNumber: true },
    });
    return new Set(opps.map((opportunity) => opportunity.mainTicketNumber));
  },
};
