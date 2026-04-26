import { storePrisma } from "@nexus/db/store";
import { MediaType } from "@prisma/client-store";

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
    return storePrisma.media.update({
      where: { id },
      data,
    });
  },

  async delete(id: number) {
    return storePrisma.media.update({
      where: { id },
      data: { active: false },
    });
  },
};
