const PURPOSE_INSTANCE_SUFFIXES: Record<string, string> = {
  COMBAT: "combat",
  BREEDING: "breeding",
  RAFFLES: "raffles",
};

const INSTANCE_ROLE_SUFFIX = /_(main|combat|breeding|raffles)$/i;

export function resolveChannelInstanceName(
  principalInstance: string | null | undefined,
  purpose: string,
) {
  const suffix = PURPOSE_INSTANCE_SUFFIXES[purpose.toUpperCase()];
  if (!suffix) return "";

  const configuredInstance = principalInstance?.trim() || "nexus_main";
  const tenantPrefix = configuredInstance.replace(INSTANCE_ROLE_SUFFIX, "");
  return `${tenantPrefix || "nexus"}_${suffix}`;
}
