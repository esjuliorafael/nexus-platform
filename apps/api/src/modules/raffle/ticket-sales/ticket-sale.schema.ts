import { z } from "zod";
import { TicketStatus } from "@prisma/client-raffle";

export const updateTicketStatusSchema = z.object({
  paymentStatus: z.nativeEnum(TicketStatus),
});
