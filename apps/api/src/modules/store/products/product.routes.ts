import { FastifyInstance } from "fastify";
import { productService } from "./product.service";
import { createProductSchema, updateProductSchema, updateProductStatusSchema } from "./product.schema";
import { ProductType, SaleStatus } from "@prisma/client-store";
import { requireAuthenticatedActor } from "../../../utils/admin-authorization";

export async function productRoutes(server: FastifyInstance) {
  // Public Routes (Pre-fixed with /store/products in store.routes.ts)
  server.get("/", async (request) => {
    const { type, status, search, purpose, featured, limit } = request.query as any;
    return productService.getAll({
      type: type as ProductType,
      status: status as SaleStatus,
      search,
      purpose: purpose ? String(purpose).toUpperCase() : undefined,
      featured: featured === "true" ? true : undefined,
      limit: limit ? Number(limit) : undefined,
      onlyActive: true,
      onlyPublished: true,
      onlyReadyMedia: true,
    });
  });

  server.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await productService.getById(parseInt(id), {
      onlyPublished: true,
      onlyReadyMedia: true,
    });
    if (!product) return reply.status(404).send({ message: "Product not found" });
    return product;
  });
}

export async function productAdminRoutes(server: FastifyInstance) {
  // Admin Routes (Pre-fixed with /admin/products in store.routes.ts)
  server.addHook("preHandler", server.authenticate);

  server.get("/", async (request) => {
    const { type, status, search, purpose, featured, limit } = request.query as any;
    return productService.getAll({
      type: type as ProductType,
      status: status as SaleStatus,
      search,
      purpose: purpose ? String(purpose).toUpperCase() : undefined,
      featured: featured === "true" ? true : undefined,
      limit: limit ? Number(limit) : undefined,
      onlyActive: true,
    });
  });

  server.get("/:id/overview", async (request, reply) => {
    const { id } = request.params as { id: string };
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId < 1) {
      return reply.status(400).send({ message: "Invalid product id" });
    }
    const overview = await productService.getOverview(productId);
    if (!overview) return reply.status(404).send({ message: "Product not found" });
    return overview;
  });

  server.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId < 1) {
      return reply.status(400).send({ message: "Invalid product id" });
    }
    const product = await productService.getById(productId, { onlyActive: true });
    if (!product) return reply.status(404).send({ message: "Product not found" });
    return product;
  });

  server.post("/", async (request, reply) => {
    try {
      const actor = await requireAuthenticatedActor(server, request, reply);
      if (!actor) return;
      const validated = createProductSchema.parse(request.body);
      return await productService.create(validated, actor);
    } catch (err: any) {
      server.log.error(err);
      if (err?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: err.issues });
      }

      return reply.status(err?.statusCode || 500).send({
        message: "Error creating product", 
        error: err.message,
        details: err instanceof Error ? err.stack : undefined
      });
    }
  });

  server.put("/:id", async (request, reply) => {
    try {
      const actor = await requireAuthenticatedActor(server, request, reply);
      if (!actor) return;
      const { id } = request.params as { id: string };
      const validated = updateProductSchema.parse(request.body);
      return await productService.update(parseInt(id), validated, actor);
    } catch (err: any) {
      server.log.error(err);
      if (err?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: err.issues });
      }

      return reply.status(err?.statusCode || 500).send({
        message: "Error updating product", 
        error: err.message,
        details: err instanceof Error ? err.stack : undefined
      });
    }
  });

  server.patch("/:id/status", async (request, reply) => {
    try {
      const actor = await requireAuthenticatedActor(server, request, reply);
      if (!actor) return;
      const { id } = request.params as { id: string };
      const validated = updateProductStatusSchema.parse(request.body);
      return await productService.update(parseInt(id), validated, actor);
    } catch (err: any) {
      server.log.error(err);
      if (err?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: err.issues });
      }

      return reply.status(500).send({ 
        message: "Error updating product status", 
        error: err.message,
        details: err instanceof Error ? err.stack : undefined
      });
    }
  });

  server.delete("/:id", async (request, reply) => {
    const actor = await requireAuthenticatedActor(server, request, reply);
    if (!actor) return;
    const { id } = request.params as { id: string };
    await productService.softDelete(parseInt(id), actor);
    return { success: true };
  });
}
