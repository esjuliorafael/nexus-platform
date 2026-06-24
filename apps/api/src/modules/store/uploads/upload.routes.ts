import { FastifyInstance } from "fastify";
import { createWriteStream } from "fs";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { pipeline } from "stream/promises";
import { z } from "zod";
import { mediaAssetService } from "../media-assets/media-asset.service";

const assetParamsSchema = z.object({ id: z.string().uuid() });
const directUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().optional(),
});

export async function uploadRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.post("/", async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ message: "Selecciona un archivo." });

    const workDir = await mkdtemp(path.join(tmpdir(), "nexus-upload-"));
    const inputPath = path.join(workDir, "upload.bin");
    try {
      await pipeline(data.file, createWriteStream(inputPath));
      if (data.file.truncated) {
        return reply.status(413).send({ message: "El archivo supera el limite de 500 MB." });
      }
      return await mediaAssetService.createFromFile(inputPath, data.filename);
    } catch (error: any) {
      server.log.error(error);
      const statusCode = error?.statusCode || (error?.code === "FST_REQ_FILE_TOO_LARGE" ? 413 : 500);
      return reply.status(statusCode).send({
        message: error?.message || "No se pudo cargar el archivo.",
      });
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });

  server.post("/direct", async (request, reply) => {
    try {
      const body = directUploadSchema.parse(request.body);
      const result = await mediaAssetService.createDirectVideoUpload(body);
      return {
        asset: result.asset,
        uploadUrl: result.uploadUrl,
        expiresInSeconds: result.expiresInSeconds,
      };
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      const statusCode = error?.statusCode || 500;
      return reply.status(statusCode).send({
        message: error?.message || "No se pudo iniciar la carga directa.",
      });
    }
  });

  server.post("/:id/complete", async (request, reply) => {
    try {
      const { id } = assetParamsSchema.parse(request.params);
      return await mediaAssetService.completeDirectUpload(id);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Identificador de asset invalido." });
      }
      const statusCode = error?.statusCode || 500;
      return reply.status(statusCode).send({
        message: error?.message || "No se pudo finalizar la carga directa.",
      });
    }
  });

  server.get("/:id", async (request, reply) => {
    try {
      const { id } = assetParamsSchema.parse(request.params);
      const asset = await mediaAssetService.getById(id);
      if (!asset) return reply.status(404).send({ message: "Asset no encontrado." });
      return asset;
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Identificador de asset invalido." });
      }
      throw error;
    }
  });

  server.delete("/:id", async (request, reply) => {
    try {
      const { id } = assetParamsSchema.parse(request.params);
      const deleted = await mediaAssetService.releaseIfUnreferenced(id);
      if (!deleted) {
        return reply.status(409).send({ message: "El asset sigue asociado a contenido." });
      }
      return { success: true };
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Identificador de asset invalido." });
      }
      throw error;
    }
  });
}
