import { storePrisma } from "@nexus/db/store";

export const settingService = {
  async getAllGrouped() {
    const settings = await storePrisma.setting.findMany();
    return settings.reduce((acc: any, setting) => {
      if (!acc[setting.group]) acc[setting.group] = {};
      acc[setting.group][setting.key] = setting.value;
      return acc;
    }, {});
  },

  async getByKey(key: string) {
    return storePrisma.setting.findUnique({ where: { key } });
  },

  async upsert(key: string, data: { value: string; description?: string; group?: string }) {
    return storePrisma.setting.upsert({
      where: { key },
      update: data,
      create: { key, ...data },
    });
  },

  async bulkUpsert(settings: { key: string; value: string }[]) {
    return storePrisma.$transaction(
      settings.map((s) =>
        storePrisma.setting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value, group: "general" },
        })
      )
    );
  },
};
