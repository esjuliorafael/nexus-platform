import { FastifyInstance } from "fastify";
import { raffleRoutes } from "./raffles/raffle.routes";
import { ticketSaleRoutes } from "./ticket-sales/ticket-sale.routes";
import { raffleSettingRoutes } from "./settings/raffle-setting.routes";

export async function rafflePlugin(server: FastifyInstance) {
  await server.register(raffleRoutes, { prefix: "/raffles" });
  await server.register(ticketSaleRoutes, { prefix: "/ticket-sales" });
  await server.register(raffleSettingRoutes, { prefix: "/settings" });
}
