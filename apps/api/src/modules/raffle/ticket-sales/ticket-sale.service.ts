import { PrismaClient, TicketStatus } from "@prisma/client-raffle";
import { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import { ticketReleaseQueue } from "../../../queues/ticket-release.queue";
import { raffleNotificationService } from "../notifications/raffle-notification.service";
import { ticketService } from "../tickets/ticket.service";

export const ticketSaleService = {
  async reserveTickets(
    prisma: PrismaClient,
    storePrisma: StorePrismaClient,
    data: {
      raffleId: number;
      tickets: string[];
      customerName: string;
      customerPhone: string;
      customerState?: string | null;
    }
  ) {
    const { raffleId, tickets, customerName, customerPhone, customerState } = data;

    const result = await prisma.$transaction(async (tx) => {
      // 0. Validate ticket numbers exist in universe
      const validNumbers = await ticketService.getAllNumbers(tx as any, raffleId);
      const invalid = tickets.filter(t => !validNumbers.has(t));
      if (invalid.length > 0) throw new Error('INVALID_TICKET_NUMBERS');

      // 1. Get current reservations for these tickets in this raffle
      const existing = await tx.ticketSale.findMany({
        where: {
          raffleId,
          ticketNumber: { in: tickets },
          paymentStatus: { in: [TicketStatus.PENDING, TicketStatus.PAID] },
        },
        select: { ticketNumber: true },
      });

      const takenTickets = new Set(existing.map((e) => e.ticketNumber));
      const reserved: string[] = [];
      const rejected: string[] = [];

      for (const ticket of tickets) {
        if (takenTickets.has(ticket)) {
          rejected.push(ticket);
        } else {
          reserved.push(ticket);
        }
      }

      if (reserved.length === 0) {
        throw new Error("ALL_TICKETS_REJECTED");
      }

      // 2. Insert reserved tickets
      await tx.ticketSale.createMany({
        data: reserved.map((ticketNumber) => ({
          raffleId,
          ticketNumber,
          customerName,
          customerPhone,
          customerState,
          paymentStatus: TicketStatus.PENDING,
        })),
      });

      return { reserved, rejected, partial: rejected.length > 0 };
    });

    // 3. Post-transaction actions
    // Enqueue release job
    const setting = await prisma.setting.findUnique({ where: { key: "ticket_release_hours" } });
    const releaseHours = parseInt(setting?.value || "24", 10);

    await ticketReleaseQueue.add(
      "release",
      { raffleId, releaseHours },
      { delay: releaseHours * 3600 * 1000 }
    );

    // Send notification
    const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
    if (raffle) {
      const totalAmount = (parseFloat(raffle.ticketPrice.toString()) * result.reserved.length).toFixed(2);
      // Fire and forget notification
      raffleNotificationService.sendTicketReservationEmail(storePrisma, prisma, {
        raffleTitle: raffle.title,
        customerName,
        customerPhone,
        tickets: result.reserved,
        totalAmount,
      }).catch(console.error);
    }

    return result;
  },

  async getAllAdmin(
    prisma: PrismaClient,
    filters: {
      raffleId?: number;
      status?: TicketStatus;
      search?: string;
    }
  ) {
    const where: any = {};
    if (filters.raffleId) where.raffleId = filters.raffleId;
    if (filters.status) where.paymentStatus = filters.status;
    if (filters.search) {
      where.OR = [
        { customerName: { contains: filters.search } },
        { customerPhone: { contains: filters.search } },
        { ticketNumber: { contains: filters.search } },
      ];
    }

    return prisma.ticketSale.findMany({
      where,
      include: { raffle: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(prisma: PrismaClient, id: number) {
    return prisma.ticketSale.findUnique({
      where: { id },
      include: { raffle: true },
    });
  },

  async updateStatus(prisma: PrismaClient, id: number, paymentStatus: TicketStatus) {
    return prisma.ticketSale.update({
      where: { id },
      data: { paymentStatus },
    });
  },

  async delete(prisma: PrismaClient, id: number) {
    return prisma.ticketSale.delete({
      where: { id },
    });
  },
};
