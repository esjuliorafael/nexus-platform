import { storePrisma } from "@nexus/db/store";
import { storageService } from "../../../services/storage.service";

const normalizeDates = (data: any) => ({
  ...data,
  startsAt: data.startsAt ? new Date(data.startsAt) : data.startsAt,
  endsAt: data.endsAt ? new Date(data.endsAt) : data.endsAt,
});

const assertSortOrderAvailable = async (
  sortOrder: number,
  currentId?: number,
) => {
  const existing = await storePrisma.homeSlide.findFirst({
    where: {
      sortOrder,
      ...(currentId ? { id: { not: currentId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    const error = new Error("Ya existe un slide con ese orden.") as Error & {
      statusCode?: number;
    };
    error.statusCode = 409;
    throw error;
  }
};

export const homeSlideService = {
  async getPublic() {
    const now = new Date();

    return storePrisma.homeSlide.findMany({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  },

  async getAdmin() {
    return storePrisma.homeSlide.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  },

  async create(data: any) {
    if (typeof data.sortOrder === "number") {
      await assertSortOrderAvailable(data.sortOrder);
    }

    return storePrisma.homeSlide.create({
      data: normalizeDates(data),
    });
  },

  async update(id: number, data: any) {
    const current = await storePrisma.homeSlide.findUnique({ where: { id } });

    if (typeof data.sortOrder === "number") {
      await assertSortOrderAvailable(data.sortOrder, id);
    }

    if (current && data.mediaUrl && current.mediaUrl !== data.mediaUrl) {
      await storageService.deleteFile(current.mediaUrl);
    }

    if (
      current &&
      data.posterUrl &&
      current.posterUrl !== data.posterUrl &&
      current.posterUrl
    ) {
      await storageService.deleteFile(current.posterUrl);
    }

    return storePrisma.homeSlide.update({
      where: { id },
      data: normalizeDates(data),
    });
  },

  async reorder(ids: number[]) {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length !== ids.length) {
      const error = new Error(
        "La lista de slides contiene duplicados.",
      ) as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    const existingSlides = await storePrisma.homeSlide.findMany({
      select: { id: true, sortOrder: true },
    });
    const existingIds = new Set(existingSlides.map((slide) => slide.id));

    if (
      ids.length !== existingSlides.length ||
      ids.some((id) => !existingIds.has(id))
    ) {
      const error = new Error(
        "La lista de slides no coincide con los registros actuales.",
      ) as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    const maxSortOrder = existingSlides.reduce(
      (max, slide) => Math.max(max, slide.sortOrder),
      0,
    );
    const tempStart = maxSortOrder + ids.length + 1000;

    await storePrisma.$transaction(async (tx) => {
      for (let index = 0; index < ids.length; index += 1) {
        const id = ids[index];
        await tx.homeSlide.update({
          where: { id },
          data: { sortOrder: tempStart + index },
        });
      }

      for (let index = 0; index < ids.length; index += 1) {
        const id = ids[index];
        await tx.homeSlide.update({
          where: { id },
          data: { sortOrder: index + 1 },
        });
      }
    });

    return storePrisma.homeSlide.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  },

  async delete(id: number) {
    const slide = await storePrisma.homeSlide.findUnique({ where: { id } });

    if (slide?.mediaUrl) {
      await storageService.deleteFile(slide.mediaUrl);
    }

    if (slide?.posterUrl) {
      await storageService.deleteFile(slide.posterUrl);
    }

    return storePrisma.homeSlide.delete({ where: { id } });
  },
};
