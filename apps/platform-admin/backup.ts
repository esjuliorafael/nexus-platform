import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type BackupSource = { tenantKey: string; storeDatabaseUrl: string; raffleDatabaseUrl: string };
export type BackupResult = { tenantKey: string; database: "store" | "raffle"; key: string; bytes: number; completedAt: string };

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
      await execFileAsync("zstd", ["--threads=0", "--quiet", "--force", "--output", compressed, dump]);
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
