import { PrismaClient, RaffleStatus, RaffleDistribution } from "@prisma/client-raffle";
import { ticketService } from "../tickets/ticket.service";
import { mediaAssetService } from "../../store/media-assets/media-asset.service";

export const raffleService = {
  async getAllActive(prisma: PrismaClient) {
    return prisma.raffle.findMany({
      where: { status: RaffleStatus.ACTIVE, published: true },
      include: { gallery: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getPublicById(prisma: PrismaClient, id: number) {
    return prisma.raffle.findFirst({
      where: { id, status: RaffleStatus.ACTIVE, published: true },
      include: {
        gallery: true,
        extraOpportunities: true,
      },
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
    const { gallery, ...raffleData } = data;
    return prisma.$transaction(async (tx) => {
      const raffle = await tx.raffle.create({
        data: {
          ...raffleData,
          ticketPrice: raffleData.ticketPrice.toString(), // Prisma Decimal
          gallery: gallery?.length ? { create: gallery } : undefined,
        },
      });

      const { digits, startFromZero } = await ticketService.generateOpportunities(tx, raffle);

      return tx.raffle.update({
        where: { id: raffle.id },
        data: { digits, useZero: startFromZero },
      });
    });
  },

  async update(prisma: PrismaClient, id: number, data: any) {
    const { gallery, ...updateData } = data;
    if (data.ticketPrice) updateData.ticketPrice = data.ticketPrice.toString();

    // Release replaced media only after the database update succeeds.
    const current = await prisma.raffle.findUnique({ where: { id }, include: { gallery: true } });
    const universeDefinitionChanged = Boolean(
      current &&
      ((updateData.ticketQuantity !== undefined && updateData.ticketQuantity !== current.ticketQuantity) ||
        (updateData.opportunities !== undefined && updateData.opportunities !== current.opportunities) ||
        (updateData.distribution !== undefined && updateData.distribution !== current.distribution)),
    );

    const updated = await prisma.$transaction(async (tx) => {
      const raffle = await tx.raffle.update({
        where: { id },
        data: {
          ...updateData,
          ...(gallery !== undefined
            ? {
                gallery: {
                  deleteMany: {},
                  ...(gallery.length ? { create: gallery } : {}),
                },
              }
            : {}),
        },
      });

      if (!universeDefinitionChanged) return raffle;

      await tx.raffleOpportunity.deleteMany({ where: { raffleId: id } });
      const { digits, startFromZero } = await ticketService.generateOpportunities(tx, raffle);
      return tx.raffle.update({
        where: { id },
        data: { digits, useZero: startFromZero },
      });
    });

    if (data.image !== undefined && current?.image && current.image !== data.image) {
      await mediaAssetService.releaseByUrlIfUnreferenced(current.image);
    }

    if (gallery !== undefined && current) {
      const retainedUrls = new Set(gallery.map((item: { filePath: string }) => item.filePath));
      for (const item of current.gallery) {
        if (!retainedUrls.has(item.filePath)) {
          await mediaAssetService.releaseByUrlIfUnreferenced(item.filePath);
        }
      }
    }

    return updated;
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
        await mediaAssetService.releaseByUrlIfUnreferenced(raffle.image);
      }
      // 3. Borrar galería de R2
      for (const item of raffle.gallery) {
        await mediaAssetService.releaseByUrlIfUnreferenced(item.filePath);
      }
    }

    // 4. Borrado físico de la base de datos (Cascade borrará RaffleGallery en DB)
    return prisma.raffle.delete({
      where: { id },
    });
  },
};
