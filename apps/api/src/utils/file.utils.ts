import path from "path";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-matroska": "mkv",
  "video/3gpp": "3gp",
  "video/3gpp2": "3g2",
};

export function extensionForMime(mimeType: string, fallback = "bin") {
  return MIME_EXTENSIONS[mimeType.toLowerCase()] || fallback;
}

export function createStorageKey(
  assetId: string,
  extension: string,
  suffix = "",
  date = new Date(),
) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const normalizedExtension = extension.replace(/^\./, "").toLowerCase();
  return `media/${year}/${month}/${assetId}${suffix}.${normalizedExtension}`;
}

export function createVaultStorageKey(
  assetId: string,
  extension: string,
  date = new Date(),
) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const normalizedExtension = extension.replace(/^\./, "").toLowerCase();
  return `media-vault/${year}/${month}/${assetId}.${normalizedExtension}`;
}

export function normalizeOriginalName(fileName: string) {
  return path.basename(fileName).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255);
}
