import { PrismaClient } from "@prisma/client-raffle";

export const raffleSettingService = {
  async getAllGrouped(prisma: PrismaClient) {
    const settings = await prisma.setting.findMany();
    return settings.reduce((acc: any, setting) => {
      if (!acc[setting.group]) acc[setting.group] = {};
      acc[setting.group][setting.key] = setting.value;
      return acc;
    }, {});
  },

  async getByKey(prisma: PrismaClient, key: string) {
    return prisma.setting.findUnique({ where: { key } });
  },

  async getValue(prisma: PrismaClient, key: string, defaultValue: string = "") {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? defaultValue;
  },

  async upsert(prisma: PrismaClient, key: string, data: { value: string | null; description?: string; group?: string }) {
    return prisma.setting.upsert({
      where: { key },
      update: data,
      create: { key, value: data.value, description: data.description, group: data.group ?? "general" },
    });
  },

  async bulkUpsert(prisma: PrismaClient, settings: { key: string; value: string | null }[]) {
    return prisma.$transaction(
      settings.map((s) =>
        prisma.setting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value, group: "general" },
        })
      )
    );
  },
};
