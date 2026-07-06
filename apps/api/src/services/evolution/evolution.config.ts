import { storePrisma } from "@nexus/db/store";

export async function getEvolutionConfigFromSettings() {
  const settings = await storePrisma.setting.findMany({
    where: {
      key: {
        in: ["whatsapp_evolution_url", "whatsapp_evolution_key"],
      },
    },
  });

  const settingUrl = settings.find((setting) => setting.key === "whatsapp_evolution_url")?.value;
  const settingKey = settings.find((setting) => setting.key === "whatsapp_evolution_key")?.value;

  return {
    baseUrl: settingUrl || process.env.EVOLUTION_API_URL || "",
    apiKey: settingKey || process.env.EVOLUTION_API_KEY || "",
  };
}
