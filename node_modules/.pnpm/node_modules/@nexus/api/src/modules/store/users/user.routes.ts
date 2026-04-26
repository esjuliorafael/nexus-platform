import { FastifyInstance } from "fastify";
import { userService } from "./user.service";
import { createUserSchema, updateUserSchema } from "./user.schema";

export async function userRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.get("/", async () => {
    return userService.getAll();
  });

  server.post("/", async (request) => {
    const validated = createUserSchema.parse(request.body);
    return userService.create(validated);
  });

  server.put("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const validated = updateUserSchema.parse(request.body);
    return userService.update(parseInt(id), validated);
  });

  server.delete("/:id", async (request) => {
    const { id } = request.params as { id: string };
    return userService.delete(parseInt(id));
  });
}
