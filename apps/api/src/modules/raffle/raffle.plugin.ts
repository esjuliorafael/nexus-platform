import { FastifyInstance } from "fastify";
import { raffleRoutes } from "./raffles/raffle.routes";
import { ticketSaleRoutes } from "./ticket-sales/ticket-sale.routes";
import { raffleSettingRoutes } from "./settings/raffle-setting.routes";
import { raffleIntelligenceRoutes } from "./intelligence/raffle-intelligence.routes";
import { raffleCouponAdminRoutes, raffleCouponPublicRoutes } from "./coupons/raffle-coupon.routes";

export async function rafflePlugin(server: FastifyInstance) {
  await server.register(raffleRoutes, { prefix: "/raffles" });
  await server.register(ticketSaleRoutes, { prefix: "/ticket-sales" });
  await server.register(raffleSettingRoutes, { prefix: "/settings" });
  await server.register(raffleIntelligenceRoutes, { prefix: "/admin/raffle-intelligence" });
  await server.register(raffleCouponPublicRoutes, { prefix: "/raffle-coupons" });
  await server.register(raffleCouponAdminRoutes, { prefix: "/admin/raffle-coupons" });
}
