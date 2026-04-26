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
      onlyActive: false,
    });
  });

  server.post("/", async (request) => {
    const validated = createProductSchema.parse(request.body);
    return productService.create(validated);
  });

  server.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const validated = updateProductSchema.parse(request.body);
    return productService.update(parseInt(id), validated);
  });

  server.patch("/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const validated = updateProductStatusSchema.parse(request.body);
    return productService.update(parseInt(id), validated);
  });

  server.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await productService.softDelete(parseInt(id));
    return { success: true };
  });
}
