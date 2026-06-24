import { storePrisma } from "@nexus/db/store";
import { mediaAssetService } from "../media-assets/media-asset.service";

const normalizeDates = (data: any) => ({
  ...data,
  startsAt: data.startsAt ? new Date(data.startsAt) : data.startsAt,
  endsAt: data.endsAt ? new Date(data.endsAt) : data.endsAt,
});

function serializeSlide(slide: any) {
  const { asset, ...data } = slide;
  return {
    ...data,
    mediaUrl: asset.mediaUrl,
    posterUrl: asset.posterUrl,
    assetStatus: asset.status,
    type: asset.mediaType,
    mimeType: asset.mimeType,
  };
}

async function assertAssetUsable(assetId: string) {
  const asset = await storePrisma.mediaAsset.findFirst({
    where: {
      id: assetId,
      status: { in: ["UPLOADING", "READY"] },
      mediaUrl: { not: null },
    },
  });
  if (!asset) {
    const error = new Error("El medio del slide no esta disponible.") as Error & {
      statusCode?: number;
    };
    error.statusCode = 409;
    throw error;
  }
}

const assertSortOrderAvailable = async (sortOrder: number, currentId?: number) => {
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
    const slides = await storePrisma.homeSlide.findMany({
      where: {
        active: true,
        asset: { status: "READY", mediaUrl: { not: null } },
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { asset: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return slides.map(serializeSlide);
  },

  async getAdmin() {
    const slides = await storePrisma.homeSlide.findMany({
      include: { asset: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return slides.map(serializeSlide);
  },

  async create(data: any) {
    await assertAssetUsable(data.assetId);
    if (typeof data.sortOrder === "number") await assertSortOrderAvailable(data.sortOrder);
    const slide = await storePrisma.homeSlide.create({
      data: normalizeDates(data),
      include: { asset: true },
    });
    return serializeSlide(slide);
  },

  async update(id: number, data: any) {
    const current = await storePrisma.homeSlide.findUnique({ where: { id } });
    if (!current) throw new Error("Slide not found");
    if (data.assetId) await assertAssetUsable(data.assetId);
    if (typeof data.sortOrder === "number") await assertSortOrderAvailable(data.sortOrder, id);

    const slide = await storePrisma.homeSlide.update({
      where: { id },
      data: normalizeDates(data),
      include: { asset: true },
    });
    if (data.assetId && data.assetId !== current.assetId) {
      await mediaAssetService.releaseIfUnreferenced(current.assetId);
    }
    return serializeSlide(slide);
  },

  async reorder(ids: number[]) {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length !== ids.length) {
      const error = new Error("La lista de slides contiene duplicados.") as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    const existingSlides = await storePrisma.homeSlide.findMany({
      select: { id: true, sortOrder: true },
    });
    const existingIds = new Set(existingSlides.map((slide) => slide.id));
    if (ids.length !== existingSlides.length || ids.some((id) => !existingIds.has(id))) {
      const error = new Error("La lista de slides no coincide con los registros actuales.") as Error & {
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
        await tx.homeSlide.update({
          where: { id: ids[index] },
          data: { sortOrder: tempStart + index },
        });
      }
      for (let index = 0; index < ids.length; index += 1) {
        await tx.homeSlide.update({
          where: { id: ids[index] },
          data: { sortOrder: index + 1 },
        });
      }
    });

    return this.getAdmin();
  },

  async delete(id: number) {
    const slide = await storePrisma.homeSlide.delete({ where: { id } });
    await mediaAssetService.releaseIfUnreferenced(slide.assetId);
    return slide;
  },
};
