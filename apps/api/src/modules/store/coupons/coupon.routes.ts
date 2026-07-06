import { FastifyInstance } from "fastify";
import { couponService } from "./coupon.service";
import { createCouponSchema, updateCouponSchema, validateCouponSchema } from "./coupon.schema";

export async function couponPublicRoutes(server: FastifyInstance) {
  server.post("/validate", async (request, reply) => {
    try {
      const body = validateCouponSchema.parse(request.body);
      return await couponService.validate(body.code, body.items);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({
          message: "Validation error",
          errors: error.issues,
        });
      }
      return reply.status(error?.statusCode || 400).send({ message: error.message });
    }
  });
}

export async function couponAdminRoutes(server: FastifyInstance) {
  server.get("/", { preHandler: [server.authenticate] }, async () => {
    return couponService.getAll();
  });

  server.post("/", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const body = createCouponSchema.parse(request.body);
      return await couponService.create(body);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({
          message: "Validation error",
          errors: error.issues,
        });
      }
      return reply.status(error?.statusCode || 400).send({ message: error.message });
    }
  });

  const updateCouponHandler = async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };
      const couponId = parseInt(id, 10);
      if (!Number.isInteger(couponId) || couponId < 1) {
        return reply.status(400).send({ message: "Invalid coupon id" });
      }

      const body = updateCouponSchema.parse(request.body);
      return await couponService.update(couponId, body);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({
          message: "Validation error",
          errors: error.issues,
        });
      }
      return reply.status(error?.statusCode || 400).send({ message: error.message });
    }
  };

  server.patch("/:id", { preHandler: [server.authenticate] }, updateCouponHandler);
  server.put("/:id", { preHandler: [server.authenticate] }, updateCouponHandler);

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const couponId = parseInt(id, 10);
      if (!Number.isInteger(couponId) || couponId < 1) {
        return reply.status(400).send({ message: "Invalid coupon id" });
      }

      await couponService.delete(couponId);
      return { success: true };
    } catch (error: any) {
      return reply.status(error?.statusCode || 400).send({ message: error.message });
    }
  });
}
