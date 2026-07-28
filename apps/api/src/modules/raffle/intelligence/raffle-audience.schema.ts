import { z } from "zod";

export const raffleAudienceRulesSchema = z.object({
  minPaidParticipations: z.number().int().min(0).max(1000).optional(),
  paidInRaffleId: z.number().int().positive().optional(),
  minPaidTickets: z.number().int().min(0).max(100000).optional(),
  minNetRevenue: z.number().min(0).max(100000000).optional(),
  maxDaysSinceLastPaid: z.number().int().min(1).max(3650).optional(),
  maxPaymentSpeedPercentile: z.number().int().min(1).max(100).optional(),
  paymentMethods: z.array(z.enum(["TRANSFER", "MERCADOPAGO"])).max(2).optional(),
  states: z.array(z.string().trim().min(1).max(100)).max(64).optional(),
  countries: z.array(z.enum(["MX", "US", "GT"])).max(3).optional(),
  winnerOnly: z.boolean().optional(),
  openingSubscriberOnly: z.boolean().optional(),
}).strict();

export type RaffleAudienceRules = z.infer<typeof raffleAudienceRulesSchema>;

export const raffleAudienceInputSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(240).nullable().optional(),
  rules: raffleAudienceRulesSchema,
  active: z.boolean().optional(),
}).strict();

export const raffleAudiencePreviewSchema = z.object({
  rules: raffleAudienceRulesSchema.optional(),
  audienceId: z.string().uuid().optional(),
  targetRaffleId: z.number().int().positive().optional(),
  frequencyWindowDays: z.number().int().min(1).max(365).default(30),
}).strict().refine(
  (value) => Boolean(value.rules || value.audienceId),
  { message: "Provide rules or an audienceId." },
);
