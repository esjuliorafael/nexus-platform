import { PrismaClient, RaffleStatus, RaffleDistribution } from "@prisma/client-raffle";
import { ticketService } from "../tickets/ticket.service";
import { mediaAssetService } from "../../store/media-assets/media-asset.service";
import bcrypt from "bcrypt";
import { toPublicRaffle } from "./raffle-access";

export const raffleService = {
  async getAllActive(prisma: PrismaClient) {
    const raffles = await prisma.raffle.findMany({
      where: { status: RaffleStatus.ACTIVE, published: true },
      include: { gallery: true, prizes: { orderBy: { position: "asc" } } },
      orderBy: [
        { featured: "desc" },
        { featuredOrder: "asc" },
        { createdAt: "desc" },
      ],
    });
    const raffleIds = raffles.map((raffle) => raffle.id);
    if (!raffleIds.length) return [];

    const recentThreshold = new Date(Date.now() - 60 * 60 * 1000);
    const [salesByStatus, recentSales, activeHolds] = await Promise.all([
      prisma.ticketSale.groupBy({
        by: ["raffleId", "paymentStatus"],
        where: {
          raffleId: { in: raffleIds },
          paymentStatus: { in: ["PENDING", "PAID"] },
        },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.ticketSale.groupBy({
        by: ["raffleId"],
        where: {
          raffleId: { in: raffleIds },
          paymentStatus: { in: ["PENDING", "PAID"] },
          createdAt: { gte: recentThreshold },
        },
        _count: { _all: true },
      }),
      prisma.rafflePaymentHoldTicket.findMany({
        where: {
          raffleId: { in: raffleIds },
          hold: { status: { in: ["ACTIVE", "PROCESSING"] }, expiresAt: { gt: new Date() } },
        },
        select: { raffleId: true },
      }),
    ]);

    const metrics = new Map<
      number,
      { reserved: number; paid: number; recentActivityCount: number; lastParticipationAt: Date | null }
    >();
    raffleIds.forEach((id) =>
      metrics.set(id, { reserved: 0, paid: 0, recentActivityCount: 0, lastParticipationAt: null }),
    );

    salesByStatus.forEach((group) => {
      const current = metrics.get(group.raffleId);
      if (!current) return;
      if (group.paymentStatus === "PAID") current.paid = group._count._all;
      if (group.paymentStatus === "PENDING") current.reserved = group._count._all;
      if (
        group._max.createdAt &&
        (!current.lastParticipationAt || group._max.createdAt > current.lastParticipationAt)
      ) {
        current.lastParticipationAt = group._max.createdAt;
      }
    });
    recentSales.forEach((group) => {
      const current = metrics.get(group.raffleId);
      if (current) current.recentActivityCount = group._count._all;
    });
    activeHolds.forEach((hold) => {
      const current = metrics.get(hold.raffleId);
      if (current) current.reserved += 1;
    });

    return raffles.map((raffle) => {
      const raffleMetrics = metrics.get(raffle.id)!;
      const occupied = raffleMetrics.reserved + raffleMetrics.paid;
      return {
        ...toPublicRaffle(raffle),
        ticketStats: {
          total: raffle.ticketQuantity,
          available: Math.max(0, raffle.ticketQuantity - occupied),
          reserved: raffleMetrics.reserved,
          paid: raffleMetrics.paid,
          occupancyPercent: raffle.ticketQuantity
            ? Math.min(100, Math.round((occupied / raffle.ticketQuantity) * 100))
            : 0,
          recentActivityCount: raffleMetrics.recentActivityCount,
          lastParticipationAt: raffleMetrics.lastParticipationAt?.toISOString() ?? null,
        },
      };
    });
  },

  async getRecentResults(prisma: PrismaClient) {
    const raffles = await prisma.raffle.findMany({
      where: {
        status: RaffleStatus.FINISHED,
        published: true,
        winningNumber: { not: null },
        resultPublishedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        image: true,
        imagePoster: true,
        drawDate: true,
        winningNumber: true,
        resultPublishedAt: true,
        opportunities: true,
        digits: true,
      },
      orderBy: { resultPublishedAt: "desc" },
      take: 3,
    });

    return raffles;
  },

  async getPublicById(prisma: PrismaClient, id: number) {
    const raffle = await prisma.raffle.findFirst({
      where: {
        id,
        published: true,
        OR: [
          { status: RaffleStatus.ACTIVE },
          { status: RaffleStatus.FINISHED, winningNumber: { not: null } },
        ],
      },
      include: {
        gallery: true,
        extraOpportunities: true,
        prizes: { orderBy: { position: "asc" } },
      },
    });
    return raffle ? toPublicRaffle(raffle) : null;
  },

  async getById(prisma: PrismaClient, id: number) {
    return prisma.raffle.findUnique({
      where: { id },
      include: {
        gallery: true,
        extraOpportunities: true,
        prizes: { orderBy: { position: "asc" } },
      },
    });
  },

  async getAllAdmin(prisma: PrismaClient) {
    const raffles = await prisma.raffle.findMany({
      include: { gallery: true, prizes: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return raffles.map(toPublicRaffle);
  },

  async create(prisma: PrismaClient, data: any) {
    const {
      gallery,
      earlyAccessCode,
      clearEarlyAccessCode: _clearEarlyAccessCode,
      coverPosterAssetId,
      prizes,
      ...raffleData
    } = data;
    const earlyAccessCodeHash = earlyAccessCode ? await bcrypt.hash(earlyAccessCode, 12) : null;
    if (coverPosterAssetId && raffleData.image) {
      raffleData.imagePoster = await mediaAssetService.adoptPosterByUrl(
        raffleData.image,
        coverPosterAssetId,
      );
    }
    if (raffleData.winningNumber) raffleData.resultPublishedAt = new Date();
    const created = await prisma.$transaction(async (tx) => {
      const raffle = await tx.raffle.create({
        data: {
          ...raffleData,
          earlyAccessCodeHash,
          ticketPrice: raffleData.ticketPrice.toString(), // Prisma Decimal
          gallery: gallery?.length ? { create: gallery } : undefined,
          prizes: {
            create: prizes.map((prize: { title: string; description: string; winnerRule?: string | null }, index: number) => ({
              ...prize,
              winnerRule: prize.winnerRule || null,
              position: index + 1,
            })),
          },
        },
      });

      const { digits, startFromZero } = await ticketService.generateOpportunities(tx, raffle);

      return tx.raffle.update({
        where: { id: raffle.id },
        data: { digits, useZero: startFromZero },
        include: {
          gallery: true,
          prizes: { orderBy: { position: "asc" } },
        },
      });
    });

    return toPublicRaffle(created);
  },

  async updateFeatured(
    prisma: PrismaClient,
    id: number,
    featured: boolean,
    featuredOrder?: number | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.raffle.findUnique({ where: { id } });
      if (!current) return null;

      if (featured) {
        if (current.status !== RaffleStatus.ACTIVE || !current.published) {
          throw new Error("RAFFLE_NOT_ELIGIBLE_FOR_FEATURED");
        }

        const featuredCount = await tx.raffle.count({
          where: {
            featured: true,
            id: { not: id },
          },
        });
        if (!current.featured && featuredCount >= 3) {
          throw new Error("FEATURED_RAFFLE_LIMIT");
        }

        const highestOrder = await tx.raffle.aggregate({
          where: { featured: true, id: { not: id } },
          _max: { featuredOrder: true },
        });
        const resolvedOrder =
          featuredOrder ?? current.featuredOrder ?? (highestOrder._max.featuredOrder ?? 0) + 1;

        const updated = await tx.raffle.update({
          where: { id },
          data: { featured: true, featuredOrder: resolvedOrder },
        });
        return toPublicRaffle(updated);
      }

      const updated = await tx.raffle.update({
        where: { id },
        data: { featured: false, featuredOrder: null },
      });
      return toPublicRaffle(updated);
    });
  },

  async reorderFeatured(prisma: PrismaClient, ids: number[]) {
    return prisma.$transaction(async (tx) => {
      const eligible = await tx.raffle.findMany({
        where: {
          id: { in: ids },
          featured: true,
          published: true,
          status: RaffleStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (eligible.length !== ids.length) {
        throw new Error("INVALID_FEATURED_RAFFLE_ORDER");
      }

      await Promise.all(
        ids.map((id, index) =>
          tx.raffle.update({
            where: { id },
            data: { featuredOrder: index + 1 },
          }),
        ),
      );

      const raffles = await tx.raffle.findMany({
        where: { id: { in: ids } },
        include: { gallery: true, prizes: { orderBy: { position: "asc" } } },
        orderBy: { featuredOrder: "asc" },
      });
      return raffles.map(toPublicRaffle);
    });
  },

  async update(prisma: PrismaClient, id: number, data: any) {
    const { gallery, prizes, earlyAccessCode, clearEarlyAccessCode, coverPosterAssetId, ...updateData } = data;
    // Read the current record once for result publication, universe changes, and media cleanup.
    const current = await prisma.raffle.findUnique({ where: { id }, include: { gallery: true } });
    if (coverPosterAssetId) {
      const videoUrl = updateData.image ?? current?.image;
      if (!videoUrl) throw new Error("La portada de video no esta disponible.");
      updateData.imagePoster = await mediaAssetService.adoptPosterByUrl(
        videoUrl,
        coverPosterAssetId,
      );
    }
    if (earlyAccessCode) updateData.earlyAccessCodeHash = await bcrypt.hash(earlyAccessCode, 12);
    if (clearEarlyAccessCode || updateData.earlyAccessEnabled === false) updateData.earlyAccessCodeHash = null;
    if (data.ticketPrice) updateData.ticketPrice = data.ticketPrice.toString();
    if (updateData.status && updateData.status !== RaffleStatus.ACTIVE) {
      updateData.featured = false;
      updateData.featuredOrder = null;
    }
    if (updateData.published === false) {
      updateData.featured = false;
      updateData.featuredOrder = null;
    }
    if (updateData.winningNumber !== undefined) {
      if (!updateData.winningNumber) {
        updateData.resultPublishedAt = null;
      } else if (
        updateData.winningNumber !== current?.winningNumber ||
        !current?.resultPublishedAt
      ) {
        updateData.resultPublishedAt = new Date();
      }
    }

    // Release replaced media only after the database update succeeds.
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
          ...(prizes !== undefined
            ? {
                prizes: {
                  deleteMany: {},
                  create: prizes.map((prize: { title: string; description: string; winnerRule?: string | null }, index: number) => ({
                    ...prize,
                    winnerRule: prize.winnerRule || null,
                    position: index + 1,
                  })),
                },
              }
            : {}),
        },
        include: {
          gallery: true,
          prizes: { orderBy: { position: "asc" } },
        },
      });

      if (!universeDefinitionChanged) return raffle;

      await tx.raffleOpportunity.deleteMany({ where: { raffleId: id } });
      const { digits, startFromZero } = await ticketService.generateOpportunities(tx, raffle);
      return tx.raffle.update({
        where: { id },
        data: { digits, useZero: startFromZero },
        include: {
          gallery: true,
          prizes: { orderBy: { position: "asc" } },
        },
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

    return toPublicRaffle(updated);
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
