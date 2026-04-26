import { FastifyInstance } from "fastify";
import { categoryService } from "./category.service";
import { createCategorySchema, updateCategorySchema, createSubcategorySchema } from "./category.schema";

export async function categoryRoutes(server: FastifyInstance) {
  server.get("/", async () => {
    return categoryService.getAll();
  });

  server.post("/", { preHandler: [server.authenticate] }, async (request) => {
    const validated = createCategorySchema.parse(request.body);
    return categoryService.create(validated);
  });

  server.put("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const validated = updateCategorySchema.parse(request.body);
    return categoryService.update(parseInt(id), validated);
  });

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return categoryService.delete(parseInt(id));
  });

  server.post("/:id/subcategories", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const validated = createSubcategorySchema.parse(request.body);
    return categoryService.addSubcategory(parseInt(id), validated.name);
  });

  // Note: requirement says DELETE /admin/subcategories/:id but this is registered under /admin/categories
  // So we'll handle it here or in a separate plugin. 
  // Let's stick to the aggregate structure.
}

// Extra subcategory route since it's at /admin/subcategories
export async function subcategoryRoutes(server: FastifyInstance) {
    server.delete("/:id", { preHandler: [server.authenticate] }, async (request) => {
        const { id } = request.params as { id: string };
        return categoryService.removeSubcategory(parseInt(id));
    });
}
