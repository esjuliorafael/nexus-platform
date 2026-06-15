import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { settingService } from "../modules/store/settings/setting.service";
import sharp from "sharp";

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

export const storageService = {
  async getS3Client() {
    const settings = await settingService.getAllGrouped();
    const { accountId, accessKeyId, secretAccessKey } = getStorageSettings(settings);

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.error("[Storage] Configuración incompleta:", { 
        hasAccountId: !!accountId, 
        hasAccessKey: !!accessKeyId, 
        hasSecretKey: !!secretAccessKey 
      });
      throw new Error("Configuración de Cloudflare R2 incompleta");
    }

    return new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  },

  async uploadFile(file: Buffer, fileName: string, contentType: string) {
    const settings = await settingService.getAllGrouped();
    const { bucketName, publicDomain } = getStorageSettings(settings);

    if (!bucketName) {
      console.error("[Storage] Nombre del Bucket no encontrado en settings.storage");
      throw new Error("Nombre del Bucket R2 no configurado");
    }

    if (!publicDomain) {
      console.error("[Storage] Dominio publico no encontrado en settings.storage");
      throw new Error("Dominio publico R2 no configurado");
    }

    let fileToUpload = file;
    let finalFileName = fileName;
    let finalContentType = contentType;

    // 1. Optimización Inteligente de Imágenes
    if (contentType.startsWith('image/') && !contentType.includes('svg')) {
      try {
        console.log(`[Storage] Iniciando optimización para: ${fileName} (${contentType})`);
        const image = sharp(file);
        
        // Convertir a WebP con calidad premium (90)
        let pipeline = image
          .rotate() // Respeta la orientación original
          .webp({ quality: 90 });

        const metadata = await image.metadata();
        console.log(`[Storage] Dimensiones originales: ${metadata.width}x${metadata.height}`);

        // Redimensionar solo si la imagen es excesivamente grande (> 2000px)
        if (metadata.width && metadata.width > 2000) {
          console.log(`[Storage] Redimensionando a 2000px de ancho`);
          pipeline = pipeline.resize(2000, null, { withoutEnlargement: true });
        }

        fileToUpload = await pipeline.toBuffer();
        
        // Actualizar extensión y content-type
        const nameWithoutExt = fileName.split('.').slice(0, -1).join('.');
        finalFileName = `${nameWithoutExt || fileName}.webp`;
        finalContentType = 'image/webp';

        console.log(`[Storage] Optimización completada: ${finalFileName} (${fileToUpload.length} bytes)`);
      } catch (error: any) {
        console.error("[Storage] Error crítico en Sharp:", error);
        // En caso de error, subimos el original para no romper el flujo
        fileToUpload = file;
        finalFileName = fileName;
        finalContentType = contentType;
      }
    }

    const client = await this.getS3Client();
    
    console.log(`[Storage] Iniciando subida a R2 - Bucket: ${bucketName}, Key: ${finalFileName}`);
    
    try {
      const upload = new Upload({
        client,
        params: {
          Bucket: bucketName,
          Key: finalFileName,
          Body: fileToUpload,
          ContentType: finalContentType,
        },
      });

      await upload.done();
      console.log(`[Storage] Subida exitosa: ${finalFileName}`);

      const baseUrl = publicDomain?.endsWith('/') ? publicDomain : `${publicDomain}/`;
      return `${baseUrl}${finalFileName}`;
    } catch (error: any) {
      console.error("[Storage] Error fatal en Upload a R2:", error);
      console.error("[Storage] Detalles del error:", {
        code: error.code,
        message: error.message,
        requestId: error.$metadata?.requestId
      });
      throw error;
    }
  },

  async deleteFile(url: string) {
    if (!url) return;

    try {
      const settings = await settingService.getAllGrouped();
      const { bucketName, publicDomain } = getStorageSettings(settings);

      if (!bucketName || !publicDomain) return;

      // Extraer el nombre del archivo de la URL
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      if (!fileName) return;

      const client = await this.getS3Client();
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      });

      await client.send(command);
    } catch (error) {
      console.error("Error al borrar archivo de R2:", error);
    }
  }
};
