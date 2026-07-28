import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdminActor } from "../../../utils/admin-authorization";
import { inventoryIntegrityService } from "./inventory-integrity.service";

const productIdSchema = z.coerce.number().int().positive();

export async function inventoryIntegrityRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.get("/", async (_request, reply) => {
    return inventoryIntegrityService.audit();
  });

  server.post("/:productId/release", async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const productId = productIdSchema.parse(
        (request.params as { productId?: string }).productId,
      );
      return await inventoryIntegrityService.releaseOrphanReservation(productId, actor);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      return reply.status(error?.statusCode || 400).send({
        message: error?.message || "No se pudo liberar la reserva.",
      });
    }
  });
}
