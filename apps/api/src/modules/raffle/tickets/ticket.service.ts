import { Prisma, PrismaClient, Raffle, RaffleDistribution } from "@prisma/client-raffle";

type RaffleDatabaseClient = PrismaClient | Prisma.TransactionClient;

type RaffleUniverseConfig = Pick<
  Raffle,
  "id" | "ticketQuantity" | "opportunities" | "distribution"
>;

type RaffleOpportunityAssignment = {
  raffleId: number;
  mainTicketNumber: string;
  extraOpportunities: string[];
};

export class RaffleOpportunityInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RaffleOpportunityInvariantError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

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

  buildNumberPool(ticketQuantity: number, opportunities: number) {
    const { universo, startFromZero, digits } = this.computeUniverse(
      ticketQuantity,
      opportunities,
    );
    const pad = (number: number) => String(number).padStart(digits, "0");
    const numbers = Array.from({ length: universo }, (_, index) => {
      if (opportunities > 1 && startFromZero) {
        return pad((index + 1) % universo);
      }
      return pad(startFromZero ? index : index + 1);
    });

    return { universo, startFromZero, digits, numbers };
  },

  assertOpportunityAssignments(
    raffle: RaffleUniverseConfig,
    assignments: RaffleOpportunityAssignment[],
  ) {
    const { universo, numbers: expectedNumbers } = this.buildNumberPool(
      raffle.ticketQuantity,
      raffle.opportunities,
    );
    const expectedMainNumbers = expectedNumbers.slice(0, raffle.ticketQuantity);

    if (assignments.length !== raffle.ticketQuantity) {
      throw new RaffleOpportunityInvariantError(
        `Raffle ${raffle.id} generated ${assignments.length} main tickets; expected ${raffle.ticketQuantity}.`,
      );
    }

    assignments.forEach((assignment, index) => {
      if (assignment.raffleId !== raffle.id) {
        throw new RaffleOpportunityInvariantError(
          `Raffle ${raffle.id} generated an assignment for raffle ${assignment.raffleId}.`,
        );
      }
      if (assignment.mainTicketNumber !== expectedMainNumbers[index]) {
        throw new RaffleOpportunityInvariantError(
          `Raffle ${raffle.id} generated main ticket ${assignment.mainTicketNumber}; expected ${expectedMainNumbers[index]}.`,
        );
      }
      if (assignment.extraOpportunities.length !== raffle.opportunities - 1) {
        throw new RaffleOpportunityInvariantError(
          `Raffle ${raffle.id}, ticket ${assignment.mainTicketNumber}, generated ${assignment.extraOpportunities.length} additional opportunities; expected ${raffle.opportunities - 1}.`,
        );
      }
    });

    const assignedNumbers = assignments.flatMap((assignment) => [
      assignment.mainTicketNumber,
      ...assignment.extraOpportunities,
    ]);
    const assignedSet = new Set(assignedNumbers);
    const expectedSet = new Set(expectedNumbers);

    if (assignedNumbers.length !== universo) {
      throw new RaffleOpportunityInvariantError(
        `Raffle ${raffle.id} assigned ${assignedNumbers.length} numbers; expected ${universo}.`,
      );
    }
    if (assignedSet.size !== universo) {
      throw new RaffleOpportunityInvariantError(
        `Raffle ${raffle.id} contains duplicate ticket numbers or opportunities.`,
      );
    }

    const missingNumbers = expectedNumbers.filter((number) => !assignedSet.has(number));
    const outsideNumbers = assignedNumbers.filter((number) => !expectedSet.has(number));
    if (missingNumbers.length > 0 || outsideNumbers.length > 0) {
      throw new RaffleOpportunityInvariantError(
        `Raffle ${raffle.id} does not cover its closed universe exactly. Missing: ${missingNumbers.join(", ") || "none"}. Outside: ${outsideNumbers.join(", ") || "none"}.`,
      );
    }
  },

  // Generates and persists RaffleOpportunity rows
  async generateOpportunities(prisma: RaffleDatabaseClient, raffle: Raffle) {
    const { startFromZero, digits, numbers: pool } = this.buildNumberPool(
      raffle.ticketQuantity,
      raffle.opportunities
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

    this.assertOpportunityAssignments(raffle, opps);

    const inserted = await prisma.raffleOpportunity.createMany({ data: opps });
    if (inserted.count !== opps.length) {
      throw new RaffleOpportunityInvariantError(
        `Raffle ${raffle.id} persisted ${inserted.count} opportunity records; expected ${opps.length}.`,
      );
    }

    return { digits, startFromZero, universo: pool.length };
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
