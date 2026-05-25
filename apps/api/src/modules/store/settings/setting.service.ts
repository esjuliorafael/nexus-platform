import { storePrisma } from "@nexus/db/store";

export const settingService = {
  async getAllGrouped() {
    const storeSettings = await storePrisma.setting.findMany();
    let allSettings = [...storeSettings];

    if (process.env.RAFFLE_ENABLED === "true") {
      try {
        const { rafflePrisma } = await import("@nexus/db/raffle");
        const raffleSettings = await rafflePrisma.setting.findMany();
        allSettings = [...allSettings, ...raffleSettings];
      } catch (e) {
        console.error("Error fetching raffle settings", e);
      }
    }

    return allSettings.reduce((acc: any, setting) => {
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

  async bulkUpsert(settings: { key: string; value: string; group?: string }[]) {
    const { rafflePrisma } = await import("@nexus/db/raffle");

    const storeSettings = settings.filter(s => !s.key.startsWith('raffle_'));
    const raffleSettings = settings.filter(s => s.key.startsWith('raffle_'));

    const promises: any[] = [];

    // Save Store settings
    storeSettings.forEach(s => {
      promises.push(storePrisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value, updated_at: new Date() },
        create: { key: s.key, value: s.value, group: s.group || "general", updated_at: new Date() },
      }));

    });

    // Save Raffle settings if module is enabled
    if (raffleSettings.length > 0 && process.env.RAFFLE_ENABLED === "true") {
      raffleSettings.forEach(s => {
        promises.push(storePrisma.setting.upsert({
          where: { key: s.key },
          update: { value: s.value, updated_at: new Date() },
          create: { key: s.key, value: s.value, group: s.group || "general", updated_at: new Date() },
        }));

      });
    }

    return Promise.all(promises);
  },
};
