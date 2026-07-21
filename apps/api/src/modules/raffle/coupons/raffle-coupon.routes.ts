import { FastifyInstance } from "fastify";
import { raffleCouponCreateSchema, raffleCouponUpdateSchema, raffleCouponValidationSchema } from "./raffle-coupon.schema";
import { RaffleCouponError, raffleCouponService } from "./raffle-coupon.service";

const sendError = (reply: any, error: unknown) => {
  if (error instanceof RaffleCouponError) return reply.status(400).send({ message: error.message });
  throw error;
};

export async function raffleCouponPublicRoutes(server: FastifyInstance) {
  server.post("/validate", async (request, reply) => {
    let body;
    try {
      body = raffleCouponValidationSchema.parse(request.body);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
    const raffle = await server.rafflePrisma.raffle.findUnique({
      where: { id: body.raffleId },
      select: { id: true, ticketPrice: true },
    });
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });
    try {
      const result = await raffleCouponService.validate(server.rafflePrisma, {
        code: body.code,
        raffle,
        ticketCount: new Set(body.tickets).size,
      });
      return {
        code: result.code,
        name: result.coupon.name,
        discountType: result.coupon.discountType,
        discountValue: Number(result.coupon.discountValue),
        subtotal: result.subtotal,
        discountTotal: result.discountTotal,
        total: result.total,
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

export async function raffleCouponAdminRoutes(server: FastifyInstance) {
  server.get("/", { preHandler: [server.authenticate] }, async () => raffleCouponService.getAll(server.rafflePrisma));

  server.post("/", { preHandler: [server.authenticate] }, async (request, reply) => {
    let body;
    try { body = raffleCouponCreateSchema.parse(request.body); } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
    try { return await raffleCouponService.create(server.rafflePrisma, body); } catch (error) { return sendError(reply, error); }
  });

  server.put("/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    let body;
    try { body = raffleCouponUpdateSchema.parse(request.body); } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
    try { return await raffleCouponService.update(server.rafflePrisma, id, body); } catch (error) { return sendError(reply, error); }
  });

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    await server.rafflePrisma.raffleCoupon.delete({ where: { id } });
    return reply.status(204).send();
  });
}
