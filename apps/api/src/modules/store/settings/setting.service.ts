import { storePrisma } from "@nexus/db/store";

function getSettingGroup(setting: { key: string; group?: string }) {
  if (setting.key.startsWith("storage_r2_")) return "storage";
  return setting.group || "general";
}

export const settingService = {
  async getAllGrouped() {
    const storeSettings = await storePrisma.setting.findMany();
    
    let raffleSettings: any[] = [];
    if (process.env.RAFFLE_ENABLED === "true") {
      try {
        const { rafflePrisma } = await import("@nexus/db/raffle");
        raffleSettings = await rafflePrisma.setting.findMany();
      } catch (e) {
        console.error("Error fetching raffle settings", e);
      }
    }

    // Combine settings giving priority to store settings for core flags like raffle_enabled
    const combinedSettings = [...raffleSettings, ...storeSettings];

    return combinedSettings.reduce((acc: any, setting) => {
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
      const group = getSettingGroup(s);
      promises.push(storePrisma.setting.upsert({
        where: { key: s.key },
        update: { 
          value: s.value, 
          group,
          updated_at: new Date() 
        },
        create: { 
          key: s.key, 
          value: s.value, 
          group,
          updated_at: new Date() 
        },
      }));
    });

    // Provisioning logic for WhatsApp Instances if prefix changed
    const rawPrefix = settings.find(s => s.key === 'whatsapp_evolution_instance')?.value;
    if (rawPrefix) {
      // Clean prefix of any existing suffixes to avoid redundancy (manzana_main -> manzana)
      const cleanPrefix = rawPrefix.split('_')[0];
      // Trigger background provisioning to not block the main response
      this.provisionEvolutionInstances(cleanPrefix).catch(e => console.error("[WhatsApp] Auto-provisioning failed", e));
    }

    // Save Raffle settings if module is enabled or it's the master toggle
    if (raffleSettings.length > 0) {
      raffleSettings.forEach(s => {
        // raffle_enabled is the master toggle and should always be saved in storePrisma
        // to allow the UI to react even if the plugin isn't loaded yet.
        if (s.key === 'raffle_enabled' || process.env.RAFFLE_ENABLED === "true") {
          promises.push(storePrisma.setting.upsert({
            where: { key: s.key },
            update: { value: s.value, updated_at: new Date() },
            create: { key: s.key, value: s.value, group: s.group || "general", updated_at: new Date() },
          }));
        }
      });
    }

    return Promise.all(promises);
  },

  async provisionEvolutionInstances(prefix: string) {
    const settings = await this.getAllGrouped();
    const baseUrl = settings.general?.whatsapp_evolution_url || process.env.EVOLUTION_API_URL;
    const apiKey = settings.general?.whatsapp_evolution_key || process.env.EVOLUTION_API_KEY;

    if (!baseUrl || !apiKey) {
      console.warn("[WhatsApp] Provisioning skipped: URL or Key missing in settings.");
      return;
    }

    const purposes = ['main', 'combat', 'breeding', 'raffles'];
    const { evolutionClient } = await import("../../../services/evolution/evolution.client");

    for (const purpose of purposes) {
      const instanceName = `${prefix}_${purpose}`;
      try {
        console.log(`[WhatsApp] Auto-provisioning instance: ${instanceName}`);
        await evolutionClient.createInstance({
          baseUrl,
          apiKey,
          instanceName,
        });
      } catch (e: any) {
        // Evolution returns error if already exists, we can ignore that safely
        if (!e.message?.includes('already exists')) {
           console.error(`[WhatsApp] Failed to provision ${instanceName}:`, e.message);
        }
      }
    }
  },
};
