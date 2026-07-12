import { PrismaClient, RaffleStatus, TicketStatus } from "@prisma/client-raffle";
import { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import { getReminderDelayMs, reservationReminderQueue } from "../../../queues/reservation-reminder.queue";
import { ticketReleaseQueue } from "../../../queues/ticket-release.queue";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
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
      const raffle = await tx.raffle.findFirst({
        where: { id: raffleId, status: RaffleStatus.ACTIVE, published: true },
        select: { id: true },
      });
      if (!raffle) throw new Error("RAFFLE_UNAVAILABLE");

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
    const settings = await prisma.setting.findMany({
      where: { 
        key: {
          in: [
            "raffle_release_active",
            "raffle_release_hours",
            "raffle_reminder_active",
            "raffle_reminder_hours_before",
          ],
        }
      }
    });
    
    const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as any);
    
    const isReleaseActive = settingsMap["raffle_release_active"] === "1";
    const releaseHours = parseInt(settingsMap["raffle_release_hours"] || "24", 10);
    const isReminderActive = settingsMap["raffle_reminder_active"] === "1";
    const reminderHoursBefore = Number(settingsMap["raffle_reminder_hours_before"] || 4);

    // Send notification
    const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
    if (raffle) {
      const totalAmount = (parseFloat(raffle.ticketPrice.toString()) * result.reserved.length).toFixed(2);
      
      // Fetch the created sales to get IDs
      const sales = await prisma.ticketSale.findMany({
        where: {
          raffleId,
          ticketNumber: { in: result.reserved },
          paymentStatus: TicketStatus.PENDING,
          createdAt: { gte: new Date(Date.now() - 5000) } // Safety check for recent ones
        },
      });

      if (sales.length > 0) {
        // Enqueue release job if active
        if (isReleaseActive) {
          const expectedReleaseAt = new Date(Date.now() + releaseHours * 3600 * 1000);

          await ticketReleaseQueue.add(
            "release",
            { ticketSaleIds: sales.map(s => s.id) },
            { delay: releaseHours * 3600 * 1000 }
          );

          const reminderDelay = getReminderDelayMs(releaseHours, reminderHoursBefore);
          if (isReminderActive && reminderDelay) {
            await reservationReminderQueue.add(
              "raffle-reminder",
              {
                kind: "raffle",
                ticketSaleIds: sales.map(s => s.id),
                expectedReleaseAt: expectedReleaseAt.toISOString(),
              },
              { delay: reminderDelay },
            );
          }
        }

        // Enqueue WhatsApp notifications (Consolidated)
        await whatsappQueue.add("reservation-notification", {
          kind: "reservation",
          ticketSaleIds: sales.map(s => s.id),
          recipientPhone: sales[0].customerPhone,
          timeLimit: `${releaseHours} horas`
        });
      }

      // Fire and forget email notification
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
