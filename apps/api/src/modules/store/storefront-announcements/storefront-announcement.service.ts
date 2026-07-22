import { rafflePrisma } from "@nexus/db/raffle";
import { storePrisma } from "@nexus/db/store";

const normalizeDates = (data: Record<string, any>) => ({
  ...data,
  startsAt: data.startsAt ? new Date(data.startsAt) : null,
  endsAt: data.endsAt ? new Date(data.endsAt) : null,
});

async function assertTargetExists(scope: string, targetId?: number | null) {
  if (scope === "PRODUCT" && targetId) {
    const product = await storePrisma.product.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!product) throw Object.assign(new Error("El producto seleccionado no existe."), { statusCode: 404 });
  }
  if (scope === "RAFFLE" && targetId) {
    const raffle = await rafflePrisma.raffle.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!raffle) throw Object.assign(new Error("La rifa seleccionada no existe."), { statusCode: 404 });
  }
}

async function assertAnnouncementExists(id: number) {
  const announcement = await storePrisma.storefrontAnnouncement.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!announcement) {
    throw Object.assign(new Error("El aviso no existe."), { statusCode: 404 });
  }
}

function publicScopes(scope: string, targetId?: number) {
  const filters: Array<Record<string, unknown>> = [{ scope: "GLOBAL", targetId: null }];
  if (scope === "STORE" || scope === "PRODUCT" || scope === "STORE_CHECKOUT") {
    filters.push({ scope: "STORE", targetId: null });
  }
  if (scope === "RAFFLES" || scope === "RAFFLE" || scope === "RAFFLE_CHECKOUT") {
    filters.push({ scope: "RAFFLES", targetId: null });
  }
  if (scope === "PRODUCT" && targetId) filters.push({ scope: "PRODUCT", targetId });
  if ((scope === "RAFFLE" || scope === "RAFFLE_CHECKOUT") && targetId) {
    filters.push({ scope: "RAFFLE", targetId });
  }
  if (scope === "STORE_CHECKOUT") filters.push({ scope: "STORE_CHECKOUT", targetId: null });
  if (scope === "RAFFLE_CHECKOUT") filters.push({ scope: "RAFFLE_CHECKOUT", targetId: null });
  return filters;
}

export const storefrontAnnouncementService = {
  async getPublic(scope: string, targetId?: number) {
    const now = new Date();
    return storePrisma.storefrontAnnouncement.findMany({
      where: {
        active: true,
        presentation: "POPUP",
        OR: publicScopes(scope, targetId) as any,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 10,
      select: {
        id: true,
        scope: true,
        targetId: true,
        presentation: true,
        variant: true,
        frequency: true,
        eyebrow: true,
        title: true,
        message: true,
        ctaLabel: true,
        ctaHref: true,
        dismissible: true,
        priority: true,
        version: true,
      },
    });
  },

  getAdmin() {
    return storePrisma.storefrontAnnouncement.findMany({
      orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
    });
  },

  async create(data: Record<string, any>) {
    await assertTargetExists(data.scope, data.targetId);
    return storePrisma.storefrontAnnouncement.create({ data: normalizeDates(data) as any });
  },

  async update(id: number, data: Record<string, any>) {
    await assertAnnouncementExists(id);
    await assertTargetExists(data.scope, data.targetId);
    return storePrisma.storefrontAnnouncement.update({
      where: { id },
      data: { ...normalizeDates(data), version: { increment: 1 } } as any,
    });
  },

  async updateStatus(id: number, active: boolean) {
    await assertAnnouncementExists(id);
    return storePrisma.storefrontAnnouncement.update({ where: { id }, data: { active } });
  },

  async remove(id: number) {
    await assertAnnouncementExists(id);
    await storePrisma.storefrontAnnouncement.delete({ where: { id } });
    return { success: true };
  },
};
