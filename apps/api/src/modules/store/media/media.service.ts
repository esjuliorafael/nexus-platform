import { storePrisma } from "@nexus/db/store";
import { MediaType } from "@prisma/client-store";
import { storageService } from "../../../services/storage.service";

export interface MediaFilters {
  categoryId?: number;
  subcategoryId?: number;
  type?: MediaType;
}

export const mediaService = {
  async getAll(filters: MediaFilters) {
    const where: any = { active: true };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.subcategoryId) where.subcategoryId = filters.subcategoryId;
    if (filters.type) where.type = filters.type;

    return storePrisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: any) {
    return storePrisma.media.create({ data });
  },

  async update(id: number, data: any) {
    // 1. Si el filePath cambió, borrar el anterior de R2
    if (data.filePath) {
      const current = await storePrisma.media.findUnique({ where: { id } });
      if (current?.filePath && current.filePath !== data.filePath) {
        await storageService.deleteFile(current.filePath);
      }
    }

    return storePrisma.media.update({
      where: { id },
      data,
    });
  },

  async delete(id: number) {
    // 1. Buscar el medio para obtener la URL del archivo
    const media = await storePrisma.media.findUnique({
      where: { id }
    });

    if (media && media.filePath) {
      // 2. Borrar de R2
      await storageService.deleteFile(media.filePath);
    }

    // 3. Borrado físico de la base de datos
    return storePrisma.media.delete({
      where: { id },
    });
  },
};
