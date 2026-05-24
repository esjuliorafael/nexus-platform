import { FastifyInstance } from "fastify";
import { storageService } from "../../../services/storage.service";
import { sanitizeFileName } from "../../../utils/file.utils";

export async function uploadRoutes(server: FastifyInstance) {
  server.post("/", { preHandler: [server.authenticate] }, async (request, reply) => {
    const data = await request.file();
    
    if (!data) {
      return reply.status(400).send({ message: "No file uploaded" });
    }

    try {
      const buffer = await data.toBuffer();
      const fileName = sanitizeFileName(data.filename);
      const url = await storageService.uploadFile(buffer, fileName, data.mimetype);
      
      return { url };
    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({ message: error.message || "Error uploading file" });
    }
  });
}
