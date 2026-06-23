import type { MediaAsset, MediaType } from "@prisma/client-store";

export interface MediaProcessingJobData {
  assetId: string;
}

export interface MediaUploadResult {
  assetId: string;
  status: MediaAsset["status"];
  type: MediaType;
  mimeType: string;
  url: string | null;
  posterUrl: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  error: string | null;
}

export function serializeMediaAsset(asset: MediaAsset): MediaUploadResult {
  return {
    assetId: asset.id,
    status: asset.status,
    type: asset.mediaType,
    mimeType: asset.mimeType,
    url: asset.mediaUrl,
    posterUrl: asset.posterUrl,
    durationMs: asset.durationMs,
    width: asset.width,
    height: asset.height,
    error: asset.errorMessage,
  };
}
