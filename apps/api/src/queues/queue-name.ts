function getQueueNamespace() {
  const explicitNamespace = process.env.QUEUE_NAMESPACE || process.env.TENANT_ID;
  if (explicitNamespace) return sanitizeQueuePart(explicitNamespace);

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl);
      const databaseName = parsed.pathname.replace(/^\//, "");
      if (databaseName) return sanitizeQueuePart(databaseName);
    } catch {
      // Fall through to the shared local namespace.
    }
  }

  return "local";
}

function sanitizeQueuePart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "local";
}

export function queueName(baseName: string) {
  return `${getQueueNamespace()}-${baseName}`;
}
