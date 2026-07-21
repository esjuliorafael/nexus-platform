import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { settingService } from "../modules/store/settings/setting.service";

function getStorageSettings(settings: any) {
  const storage = settings.storage || {};

  return {
    accountId: (storage.storage_r2_account_id || "").trim(),
    accessKeyId: (storage.storage_r2_access_key || "").trim(),
    secretAccessKey: (storage.storage_r2_secret_key || "").trim(),
    bucketName: (storage.storage_r2_bucket_name || "").trim(),
    publicDomain: (storage.storage_r2_public_domain || "").trim(),
  };
}

async function getConfiguredStorage() {
  const settings = await settingService.getAllGrouped();
  const storage = getStorageSettings(settings);

  if (
    !storage.accountId ||
    !storage.accessKeyId ||
    !storage.secretAccessKey ||
    !storage.bucketName ||
    !storage.publicDomain
  ) {
    throw new Error("Configuracion de Cloudflare R2 incompleta");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${storage.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: storage.accessKeyId,
      secretAccessKey: storage.secretAccessKey,
    },
  });

  return { ...storage, client };
}

function joinPublicUrl(publicDomain: string, key: string) {
  const base = publicDomain.endsWith("/") ? publicDomain : `${publicDomain}/`;
  return `${base}${key}`;
}

export const storageService = {
  async publicUrlForKey(key: string) {
    const { publicDomain } = await getConfiguredStorage();
    return joinPublicUrl(publicDomain, key);
  },

  async uploadObject(
    body: Buffer | Readable,
    key: string,
    contentType: string,
  ) {
    const { bucketName, publicDomain, client } = await getConfiguredStorage();
    const upload = new Upload({
      client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      },
    });

    await upload.done();
    return joinPublicUrl(publicDomain, key);
  },

  async createSignedPutUrl(key: string, contentType: string) {
    const { bucketName, publicDomain, client } = await getConfiguredStorage();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 15 * 60 });
    return {
      uploadUrl,
      publicUrl: joinPublicUrl(publicDomain, key),
      expiresInSeconds: 15 * 60,
    };
  },

  async createSignedDownloadUrl(key: string, fileName: string) {
    const { bucketName, client } = await getConfiguredStorage();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${safeFileName}"`,
    });
    return getSignedUrl(client, command, { expiresIn: 5 * 60 });
  },

  async headObject(key: string) {
    const { bucketName, client } = await getConfiguredStorage();
    return client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
  },

  async downloadObjectToFile(key: string, destination: string) {
    const { bucketName, client } = await getConfiguredStorage();
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
    );

    if (!response.Body) {
      throw new Error("El objeto de origen no contiene datos");
    }

    await pipeline(response.Body as Readable, createWriteStream(destination));
  },

  async deleteKey(key: string) {
    if (!key) return;
    const { bucketName, client } = await getConfiguredStorage();
    await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
  },

  async keyFromUrl(url: string) {
    if (!url) return null;
    const settings = await settingService.getAllGrouped();
    const { publicDomain } = getStorageSettings(settings);
    if (!publicDomain) return null;

    try {
      const baseUrl = new URL(publicDomain);
      const objectUrl = new URL(url);
      if (baseUrl.host !== objectUrl.host) return null;

      const basePath = baseUrl.pathname.replace(/\/$/, "");
      const objectPath = objectUrl.pathname;
      if (basePath && !objectPath.startsWith(`${basePath}/`)) return null;

      return decodeURIComponent(objectPath.slice(basePath.length).replace(/^\//, ""));
    } catch {
      return null;
    }
  },

  async deleteFile(url: string) {
    try {
      const key = await this.keyFromUrl(url);
      if (key) await this.deleteKey(key);
    } catch (error) {
      console.error("Error al borrar archivo de R2:", error);
    }
  },
};
