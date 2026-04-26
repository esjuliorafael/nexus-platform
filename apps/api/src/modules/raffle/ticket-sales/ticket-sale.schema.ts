import { z } from "zod";
import { TicketStatus } from "@prisma/client-raffle";

export const reserveTicketsSchema = z.object({
  raffleId: z.number().int().positive(),
  tickets: z.array(z.string().min(1)).min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerState: z.string().optional().nullable(),
});

export const updateTicketStatusSchema = z.object({
  paymentStatus: z.nativeEnum(TicketStatus),
});
