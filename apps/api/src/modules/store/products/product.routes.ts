import { FastifyInstance } from "fastify";
import { productService } from "./product.service";
import { createProductSchema, updateProductSchema, updateProductStatusSchema } from "./product.schema";
import { ProductType, SaleStatus } from "@prisma/client-store";

export async function productRoutes(server: FastifyInstance) {
  // Public Routes (Pre-fixed with /store/products in store.routes.ts)
  server.get("/", async (request) => {
    const { type, status, search } = request.query as any;
    return productService.getAll({
      type: type as ProductType,
      status: status as SaleStatus,
      search,
      onlyActive: true,
    });
  });

  server.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await productService.getById(parseInt(id));
    if (!product) return reply.status(404).send({ message: "Product not found" });
    return product;
  });
}

export async function productAdminRoutes(server: FastifyInstance) {
  // Admin Routes (Pre-fixed with /admin/products in store.routes.ts)
  server.addHook("preHandler", server.authenticate);

  server.get("/", async (request) => {
    const { type, status, search } = request.query as any;
    return productService.getAll({
      type: type as ProductType,
      status: status as SaleStatus,
      search,
      onlyActive: true,
    });
  });

  server.post("/", async (request, reply) => {
    try {
      const validated = createProductSchema.parse(request.body);
      return await productService.create(validated);
    } catch (err: any) {
      server.log.error(err);
      if (err?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: err.issues });
      }

      return reply.status(500).send({ 
        message: "Error creating product", 
        error: err.message,
        details: err instanceof Error ? err.stack : undefined
      });
    }
  });

  server.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validated = updateProductSchema.parse(request.body);
      return await productService.update(parseInt(id), validated);
    } catch (err: any) {
      server.log.error(err);
      if (err?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: err.issues });
      }

      return reply.status(500).send({ 
        message: "Error updating product", 
        error: err.message,
        details: err instanceof Error ? err.stack : undefined
      });
    }
  });

  server.patch("/:id/status", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validated = updateProductStatusSchema.parse(request.body);
      return await productService.update(parseInt(id), validated);
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
    const { id } = request.params as { id: string };
    await productService.softDelete(parseInt(id));
    return { success: true };
  });
}
