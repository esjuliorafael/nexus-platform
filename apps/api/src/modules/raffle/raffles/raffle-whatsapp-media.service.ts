import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { storageService } from "../../../services/storage.service";

const headerKey = (raffleId: number) =>
  `whatsapp/raffles/${raffleId}/invitation-cover-${randomUUID()}.jpg`;

export async function ensureRaffleWhatsappHeader(
  raffleId: number,
  sourceUrl: string | null | undefined,
) {
  if (!sourceUrl) return null;

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la portada (${response.status}).`);
  }

  const jpeg = await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return storageService.uploadObject(jpeg, headerKey(raffleId), "image/jpeg");
}

export async function releaseRaffleWhatsappHeader(url: string | null | undefined) {
  if (url) await storageService.deleteFile(url);
}
