import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type BackupSource = { tenantKey: string; storeDatabaseUrl: string; raffleDatabaseUrl: string };
export type BackupResult = { tenantKey: string; database: "store" | "raffle"; key: string; bytes: number; completedAt: string };

function monthKey(date: Date) { return date.toISOString().slice(0, 7); }

function weekKey(date: Date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return `${copy.getUTCFullYear()}-${Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)}`;
}

function encryptionKey() {
  const key = Buffer.from(process.env.PLATFORM_ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) throw new Error("PLATFORM_ENCRYPTION_KEY debe tener 32 bytes en hexadecimal.");
  return key;
}

function decryptSecret(value: string) {
  const [ivHex, tagHex, encryptedHex] = value.split(":");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Secret Access Key cifrada inválida.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}

// The encrypted R2 secret is kept in Platform Admin's data file; callers pass
// the decrypted value only for the duration of this upload.
export async function createBackup(args: {
  source: BackupSource;
  r2: { endpoint: string; bucket: string; accessKeyId: string; encryptedSecretAccessKey: string };
  now?: Date;
}) {
  const now = args.now || new Date();
  const date = now.toISOString().slice(0, 10);
  const temp = await mkdtemp(join(tmpdir(), "nexus-backup-"));
  const client = new S3Client({ endpoint: args.r2.endpoint, region: "auto", credentials: { accessKeyId: args.r2.accessKeyId, secretAccessKey: decryptSecret(args.r2.encryptedSecretAccessKey) } });
  const results: BackupResult[] = [];
  try {
    for (const [database, url] of [["store", args.source.storeDatabaseUrl], ["raffle", args.source.raffleDatabaseUrl]] as const) {
      const dump = join(temp, `${database}.dump`);
      const compressed = join(temp, `${database}.dump.zst`);
      const encrypted = join(temp, `${database}.dump.zst.enc`);
      await execFileAsync("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", dump, url], { maxBuffer: 1024 * 1024 });
      await execFileAsync("zstd", ["-T0", "--quiet", "--force", "-o", compressed, dump]);
      const plaintext = await readFile(compressed);
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      await writeFile(encrypted, Buffer.concat([Buffer.from("NEXUS-BACKUP-1\0"), iv, cipher.getAuthTag(), ciphertext]), { mode: 0o600 });
      const objectKey = `${args.source.tenantKey}/${database}/${date}.dump.zst.enc`;
      const body = await readFile(encrypted);
      await client.send(new PutObjectCommand({ Bucket: args.r2.bucket, Key: objectKey, Body: body, ContentType: "application/octet-stream", Metadata: { tenant: args.source.tenantKey, database, format: "pg_dump+zstd+aes-256-gcm" } }));
      results.push({ tenantKey: args.source.tenantKey, database, key: objectKey, bytes: body.byteLength, completedAt: now.toISOString() });
    }
    return results;
  } finally {
    await rm(temp, { recursive: true, force: true });
    client.destroy();
  }
}

export async function pruneBackups(args: {
  r2: { endpoint: string; bucket: string; accessKeyId: string; encryptedSecretAccessKey: string };
  tenantKey: string;
  now?: Date;
  daily?: number;
  weekly?: number;
  monthly?: number;
}) {
  const now = args.now || new Date();
  const client = new S3Client({ endpoint: args.r2.endpoint, region: "auto", credentials: { accessKeyId: args.r2.accessKeyId, secretAccessKey: decryptSecret(args.r2.encryptedSecretAccessKey) } });
  const deleted: string[] = [];
  try {
    for (const database of ["store", "raffle"] as const) {
      const response = await client.send(new ListObjectsV2Command({ Bucket: args.r2.bucket, Prefix: `${args.tenantKey}/${database}/` }));
      const objects = (response.Contents || []).flatMap((item) => {
        const match = item.Key?.match(/\/(\d{4}-\d{2}-\d{2})\.dump\.zst\.enc$/);
        return item.Key && match ? [{ key: item.Key, date: new Date(`${match[1]}T00:00:00.000Z`) }] : [];
      }).sort((a, b) => b.date.getTime() - a.date.getTime());
      const keep = new Set<string>();
      const recentDays = new Set(objects.filter((item) => (now.getTime() - item.date.getTime()) / 86400000 < (args.daily ?? 14)).map((item) => item.key));
      const recentWeeks = new Set(objects.map((item) => weekKey(item.date)).slice(0, args.weekly ?? 8));
      const recentMonths = new Set(objects.map((item) => monthKey(item.date)).slice(0, args.monthly ?? 6));
      for (const item of objects) if (recentDays.has(item.key) || recentWeeks.has(weekKey(item.date)) || recentMonths.has(monthKey(item.date))) keep.add(item.key);
      const remove = objects.filter((item) => !keep.has(item.key)).map((item) => item.key);
      if (remove.length) {
        await client.send(new DeleteObjectsCommand({ Bucket: args.r2.bucket, Delete: { Objects: remove.map((Key) => ({ Key })), Quiet: true } }));
        deleted.push(...remove);
      }
    }
    return deleted;
  } finally { client.destroy(); }
}

export function configuredSources() {
  const raw = process.env.PLATFORM_BACKUP_DATABASES_JSON;
  if (!raw) return [] as BackupSource[];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("PLATFORM_BACKUP_DATABASES_JSON debe ser un arreglo.");
  return parsed.map((item: any) => {
    if (!item?.tenantKey || !item?.storeDatabaseUrl || !item?.raffleDatabaseUrl) throw new Error("Cada fuente requiere tenantKey, storeDatabaseUrl y raffleDatabaseUrl.");
    return { tenantKey: String(item.tenantKey), storeDatabaseUrl: String(item.storeDatabaseUrl), raffleDatabaseUrl: String(item.raffleDatabaseUrl) };
  });
}
