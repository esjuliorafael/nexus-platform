import { createServer } from "node:http";
import { createCipheriv, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { configuredSources, createBackup, pruneBackups, type BackupSource } from "./backup.js";

type Tenant = { key: string; name: string; status: string; backupEnabled: boolean; lastBackup: string | null; lastBackupError?: string | null };
type R2Config = { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string };
type Store = { tenants: Tenant[]; centralStorage?: R2Config };

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "../dist");
const dataDir = process.env.PLATFORM_DATA_DIR || "/data";
const storePath = join(dataDir, "platform-admin.json");
const sessionTtlMs = 8 * 60 * 60 * 1000;
const sessions = new Map<string, number>();
let backupRunning = false;

const defaultTenants: Tenant[] = [
  { key: "trojes", name: "Las Trojes", status: "Activo", backupEnabled: false, lastBackup: null },
  { key: "manzana", name: "Manzana", status: "Activo", backupEnabled: false, lastBackup: null },
];

function readStore(): Store {
  try { return JSON.parse(readFileSync(storePath, "utf8")) as Store; } catch { return { tenants: defaultTenants }; }
}

function writeStore(store: Store) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(storePath, JSON.stringify(store, null, 2), { mode: 0o600 });
}

function json(res: any, status: number, payload: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

async function body(req: any): Promise<any> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function cookie(req: any, name: string) {
  return String(req.headers.cookie || "").split(";").map((item: string) => item.trim().split("=")).find((item: string[]) => item[0] === name)?.[1];
}

function setSession(res: any, token: string) {
  res.setHeader("Set-Cookie", `nexus_platform_session=${token}; Max-Age=${sessionTtlMs / 1000}; Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

function authenticated(req: any) {
  const token = cookie(req, "nexus_platform_session");
  const expires = token ? sessions.get(token) : undefined;
  if (!token || !expires || expires < Date.now()) { if (token) sessions.delete(token); return false; }
  return true;
}

function passwordMatches(input: string) {
  const hash = process.env.PLATFORM_ADMIN_PASSWORD_HASH || "";
  if (hash.startsWith("scrypt$") ) {
    const [, salt, expected] = hash.split("$");
    const actual = scryptSync(input, salt, 64).toString("hex");
    return expected && actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  }
  const configured = process.env.PLATFORM_ADMIN_PASSWORD;
  return Boolean(configured && input === configured && process.env.NODE_ENV !== "production");
}

function encryptSecret(value: string) {
  const key = Buffer.from(process.env.PLATFORM_ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) throw new Error("PLATFORM_ENCRYPTION_KEY debe tener 32 bytes en hexadecimal.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted.toString("hex")}`;
}

function publicTenant(tenant: Tenant) {
  return { key: tenant.key, name: tenant.name, status: tenant.status, backupEnabled: tenant.backupEnabled, lastBackup: tenant.lastBackup, lastBackupError: tenant.lastBackupError || null };
}

function publicStorage(store: Store) {
  return { configured: Boolean(store.centralStorage), bucket: store.centralStorage?.bucket || null, endpoint: store.centralStorage?.endpoint || null };
}

async function runEnabledBackups() {
  if (backupRunning) throw new Error("Ya hay una ejecución de backups en curso.");
  const store = readStore();
  if (!store.centralStorage) throw new Error("El bucket central de backups aún no está configurado.");
  const sources = configuredSources();
  const enabled = store.tenants.filter((tenant) => tenant.backupEnabled);
  if (!enabled.length) return [];
  backupRunning = true;
  try {
    const results = [];
    for (const tenant of enabled) {
      const source = sources.find((item) => item.tenantKey === tenant.key);
      if (!source) {
        tenant.lastBackupError = "No existe una fuente de base de datos configurada.";
        continue;
      }
      try {
        const completed = await createBackup({ source, r2: { ...store.centralStorage, encryptedSecretAccessKey: store.centralStorage.secretAccessKey } });
        await pruneBackups({ r2: { ...store.centralStorage, encryptedSecretAccessKey: store.centralStorage.secretAccessKey }, tenantKey: tenant.key, daily: Number(process.env.PLATFORM_BACKUP_RETENTION_DAILY || 14), weekly: Number(process.env.PLATFORM_BACKUP_RETENTION_WEEKLY || 8), monthly: Number(process.env.PLATFORM_BACKUP_RETENTION_MONTHLY || 6) });
        tenant.lastBackup = completed.at(-1)?.completedAt || new Date().toISOString();
        tenant.lastBackupError = null;
        results.push(...completed);
      } catch (error) {
        tenant.lastBackupError = error instanceof Error ? error.message : "Error desconocido al crear el backup.";
      }
    }
    writeStore(store);
    return results;
  } finally {
    backupRunning = false;
  }
}

function mime(path: string) {
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".ico": "image/x-icon" } as Record<string, string>)[extname(path)] || "application/octet-stream";
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://platform-admin");
    if (url.pathname === "/api/health") return json(res, 200, { status: "ok", service: "platform-admin" });
    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      const input = await body(req);
      const username = process.env.PLATFORM_ADMIN_USERNAME || "";
      if (!username || !passwordMatches(String(input.password || "")) || input.username !== username) return json(res, 401, { message: "Credenciales no válidas." });
      const token = randomBytes(32).toString("base64url");
      sessions.set(token, Date.now() + sessionTtlMs);
      setSession(res, token);
      return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
      const token = cookie(req, "nexus_platform_session");
      if (token) sessions.delete(token);
      res.setHeader("Set-Cookie", "nexus_platform_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict");
      return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/auth/me" && req.method === "GET") return authenticated(req) ? json(res, 200, { ok: true }) : json(res, 401, { message: "No autenticado." });
    if (url.pathname === "/api/tenants" && req.method === "GET") {
      if (!authenticated(req)) return json(res, 401, { message: "No autenticado." });
      const store = readStore();
      return json(res, 200, { tenants: store.tenants.map(publicTenant), storage: publicStorage(store) });
    }
    if (url.pathname === "/api/backups" && req.method === "GET") {
      if (!authenticated(req)) return json(res, 401, { message: "No autenticado." });
      const store = readStore();
      return json(res, 200, { running: backupRunning, tenants: store.tenants.map(publicTenant), sourcesConfigured: configuredSources().map((item: BackupSource) => item.tenantKey) });
    }
    if (url.pathname === "/api/backups/run" && req.method === "POST") {
      if (!authenticated(req)) return json(res, 401, { message: "No autenticado." });
      const results = await runEnabledBackups();
      return json(res, 200, { results });
    }
    if (url.pathname === "/api/storage" && req.method === "PATCH") {
      if (!authenticated(req)) return json(res, 401, { message: "No autenticado." });
      const input = await body(req);
      const store = readStore();
      const current = store.centralStorage;
      const r2 = input.r2 as R2Config;
      const accessKeyId = r2?.accessKeyId || current?.accessKeyId;
      if (!r2?.endpoint || !r2.bucket || !accessKeyId) return json(res, 400, { message: "Endpoint, bucket y Access Key ID son obligatorios." });
      if (r2.secretAccessKey) store.centralStorage = { endpoint: r2.endpoint, bucket: r2.bucket, accessKeyId, secretAccessKey: encryptSecret(r2.secretAccessKey) };
      else if (current) store.centralStorage = { ...current, endpoint: r2.endpoint, bucket: r2.bucket, accessKeyId };
      else return json(res, 400, { message: "La Secret Access Key es obligatoria para la primera configuración." });
      writeStore(store);
      return json(res, 200, { storage: publicStorage(store) });
    }
    const tenantMatch = url.pathname.match(/^\/api\/tenants\/([^/]+)\/backup$/);
    if (tenantMatch && req.method === "PATCH") {
      if (!authenticated(req)) return json(res, 401, { message: "No autenticado." });
      const input = await body(req);
      const store = readStore();
      const tenant = store.tenants.find((item) => item.key === tenantMatch[1]);
      if (!tenant) return json(res, 404, { message: "Tenant no encontrado." });
      if (typeof input.enabled === "boolean") tenant.backupEnabled = input.enabled;
      writeStore(store);
      return json(res, 200, { tenant: publicTenant(tenant) });
    }
    if (!url.pathname.startsWith("/api/")) {
      const requested = url.pathname === "/" ? "/index.html" : normalize(url.pathname);
      const file = join(publicDir, requested);
      if (!file.startsWith(publicDir) || !existsSync(file)) return json(res, 404, { message: "Not found" });
      res.writeHead(200, { "Content-Type": mime(file), "Cache-Control": file.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable" });
      return res.end(readFileSync(file));
    }
    return json(res, 404, { message: "Not found" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { message: "Error interno del Platform Admin." });
  }
});

server.listen(Number(process.env.PORT || 80), "0.0.0.0", () => console.log("Platform Admin listening"));

const intervalMinutes = Number(process.env.PLATFORM_BACKUP_INTERVAL_MINUTES || 0);
if (intervalMinutes > 0) {
  setInterval(() => void runEnabledBackups().catch((error) => console.error("Scheduled backup failed:", error)), intervalMinutes * 60_000);
  console.log(`Platform backups scheduled every ${intervalMinutes} minutes`);
}
