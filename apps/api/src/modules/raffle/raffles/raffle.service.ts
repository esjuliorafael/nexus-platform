import { PrismaClient, RaffleStatus, RaffleDistribution } from "@prisma/client-raffle";
import { ticketService } from "../tickets/ticket.service";

export const raffleService = {
  async getAllActive(prisma: PrismaClient) {
    return prisma.raffle.findMany({
      where: { status: RaffleStatus.ACTIVE },
      include: { gallery: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(prisma: PrismaClient, id: number) {
    return prisma.raffle.findUnique({
      where: { id },
      include: {
        gallery: true,
        extraOpportunities: true,
      },
    });
  },

  async getAllAdmin(prisma: PrismaClient) {
    return prisma.raffle.findMany({
      include: { gallery: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(prisma: PrismaClient, data: any) {
    const raffle = await prisma.raffle.create({
      data: {
        ...data,
        ticketPrice: data.ticketPrice.toString(), // Prisma Decimal
      },
    });

    const { digits, startFromZero } = await ticketService.generateOpportunities(prisma, raffle);

    return prisma.raffle.update({
      where: { id: raffle.id },
      data: { digits, useZero: startFromZero },
    });
  },

  async update(prisma: PrismaClient, id: number, data: any) {
    const updateData = { ...data };
    if (data.ticketPrice) updateData.ticketPrice = data.ticketPrice.toString();

    return prisma.raffle.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(prisma: PrismaClient, id: number) {
    // Gallery is Cascade deleted in schema
    return prisma.raffle.delete({
      where: { id },
    });
  },
};
