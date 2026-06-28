import { storePrisma } from "@nexus/db/store";
import { mediaAssetService } from "../media-assets/media-asset.service";

const normalizeDates = (data: any) => ({
  ...data,
  startsAt: data.startsAt ? new Date(data.startsAt) : data.startsAt,
  endsAt: data.endsAt ? new Date(data.endsAt) : data.endsAt,
});

function serializeStoreHero(hero: any) {
  const { asset, ...data } = hero;
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
    const error = new Error("El medio del hero no esta disponible.") as Error & {
      statusCode?: number;
    };
    error.statusCode = 409;
    throw error;
  }
}

const assertSortOrderAvailable = async (
  scope: string,
  sortOrder: number,
  currentId?: number,
) => {
  const existing = await storePrisma.storeHero.findFirst({
    where: {
      scope,
      sortOrder,
      ...(currentId ? { id: { not: currentId } } : {}),
    } as any,
    select: { id: true },
  });
  if (existing) {
    const error = new Error("Ya existe un hero con ese orden para este tipo.") as Error & {
      statusCode?: number;
    };
    error.statusCode = 409;
    throw error;
  }
};

export const storeHeroService = {
  async getPublic(scope?: string) {
    const now = new Date();
    const where: any = {
      active: true,
      asset: { status: "READY", mediaUrl: { not: null } },
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    };
    if (scope) where.scope = scope;

    const heroes = await storePrisma.storeHero.findMany({
      where,
      include: { asset: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return heroes.map(serializeStoreHero);
  },

  async getAdmin(scope?: string) {
    const heroes = await storePrisma.storeHero.findMany({
      where: scope ? ({ scope } as any) : undefined,
      include: { asset: true },
      orderBy: [{ scope: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return heroes.map(serializeStoreHero);
  },

  async create(data: any) {
    await assertAssetUsable(data.assetId);
    if (typeof data.sortOrder === "number") {
      await assertSortOrderAvailable(data.scope, data.sortOrder);
    }
    const hero = await storePrisma.storeHero.create({
      data: normalizeDates(data),
      include: { asset: true },
    });
    return serializeStoreHero(hero);
  },

  async update(id: number, data: any) {
    const current = await storePrisma.storeHero.findUnique({ where: { id } });
    if (!current) throw new Error("Store hero not found");
    if (data.assetId) await assertAssetUsable(data.assetId);

    const nextScope = data.scope ?? current.scope;
    const nextSortOrder = data.sortOrder ?? current.sortOrder;
    if (typeof nextSortOrder === "number") {
      await assertSortOrderAvailable(nextScope, nextSortOrder, id);
    }

    const hero = await storePrisma.storeHero.update({
      where: { id },
      data: normalizeDates(data),
      include: { asset: true },
    });
    if (data.assetId && data.assetId !== current.assetId) {
      await mediaAssetService.releaseIfUnreferenced(current.assetId);
    }
    return serializeStoreHero(hero);
  },

  async reorder(scope: string, ids: number[]) {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length !== ids.length) {
      const error = new Error("La lista de heroes contiene duplicados.") as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    const existingHeroes = await storePrisma.storeHero.findMany({
      where: { scope } as any,
      select: { id: true, sortOrder: true },
    });
    const existingIds = new Set(existingHeroes.map((hero) => hero.id));
    if (ids.length !== existingHeroes.length || ids.some((id) => !existingIds.has(id))) {
      const error = new Error("La lista de heroes no coincide con los registros actuales.") as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    const maxSortOrder = existingHeroes.reduce(
      (max, hero) => Math.max(max, hero.sortOrder),
      0,
    );
    const tempStart = maxSortOrder + ids.length + 1000;

    await storePrisma.$transaction(async (tx) => {
      for (let index = 0; index < ids.length; index += 1) {
        await tx.storeHero.update({
          where: { id: ids[index] },
          data: { sortOrder: tempStart + index },
        });
      }
      for (let index = 0; index < ids.length; index += 1) {
        await tx.storeHero.update({
          where: { id: ids[index] },
          data: { sortOrder: index + 1 },
        });
      }
    });

    return this.getAdmin(scope);
  },

  async delete(id: number) {
    const hero = await storePrisma.storeHero.delete({ where: { id } });
    await mediaAssetService.releaseIfUnreferenced(hero.assetId);
    return hero;
  },
};
