import { PrismaClient, RaffleStatus, RaffleDistribution } from "@prisma/client-raffle";
import { ticketService } from "../tickets/ticket.service";
import { storageService } from "../../../services/storage.service";

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

    // 1. Gestionar borrado de imagen anterior en R2
    if (data.image) {
      const current = await prisma.raffle.findUnique({ where: { id } });
      if (current?.image && current.image !== data.image) {
        await storageService.deleteFile(current.image);
      }
    }

    return prisma.raffle.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(prisma: PrismaClient, id: number) {
    // 1. Buscar para obtener la imagen de portada y galería
    const raffle = await prisma.raffle.findUnique({
      where: { id },
      include: { gallery: true }
    });

    if (raffle) {
      // 2. Borrar portada de R2
      if (raffle.image) {
        await storageService.deleteFile(raffle.image);
      }
      // 3. Borrar galería de R2
      for (const item of raffle.gallery) {
        await storageService.deleteFile(item.filePath);
      }
    }

    // 4. Borrado físico de la base de datos (Cascade borrará RaffleGallery en DB)
    return prisma.raffle.delete({
      where: { id },
    });
  },
};
