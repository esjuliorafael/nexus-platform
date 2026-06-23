import { execFile } from "child_process";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import { storePrisma } from "@nexus/db/store";
import { storageService } from "../../../services/storage.service";
import { createStorageKey } from "../../../utils/file.utils";

const execFileAsync = promisify(execFile);
const ffprobePath = (require("ffprobe-static") as { path: string }).path;

interface ProbeResult {
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
  }>;
  format?: { duration?: string };
}

async function run(binary: string, args: string[]) {
  await execFileAsync(binary, args, { maxBuffer: 10 * 1024 * 1024 });
}

async function probeVideo(inputPath: string) {
  const { stdout } = await execFileAsync(
    ffprobePath,
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", inputPath],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const result = JSON.parse(stdout) as ProbeResult;
  const videoStream = result.streams?.find((stream) => stream.codec_type === "video");
  const durationSeconds = Number(result.format?.duration || 0);

  if (!videoStream?.width || !videoStream.height) {
    throw new Error("El archivo no contiene una pista de video valida");
  }

  return {
    width: videoStream.width,
    height: videoStream.height,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
  };
}

export async function processVideoAsset(assetId: string) {
  if (!ffmpegPath) throw new Error("FFmpeg no esta disponible");

  const asset = await storePrisma.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset || !asset.sourceKey) throw new Error("Asset de video incompleto");

  const workDir = await mkdtemp(path.join(tmpdir(), "nexus-media-"));
  const sourceExtension = path.extname(asset.sourceKey) || ".bin";
  const inputPath = path.join(workDir, `source${sourceExtension}`);
  const posterPath = path.join(workDir, "poster.webp");
  const posterKey = createStorageKey(asset.id, "webp", "-poster");
  let posterUrl: string | null = null;

  try {
    await storageService.downloadObjectToFile(asset.sourceKey, inputPath);
    const metadata = await probeVideo(inputPath);
    const posterSecond = Math.min(
      Math.max(metadata.durationSeconds * 0.2, 0.2),
      5,
    );
    const posterArgs = (seekSecond: number) => [
      "-y",
      "-ss",
      seekSecond.toFixed(3),
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-vf",
      "scale=w='min(1600,iw)':h='min(1600,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos",
      "-quality",
      "82",
      posterPath,
    ];

    try {
      await run(ffmpegPath, posterArgs(posterSecond));
    } catch {
      await run(ffmpegPath, posterArgs(0));
    }

    posterUrl = await storageService.uploadObject(
      await readFile(posterPath),
      posterKey,
      "image/webp",
    );
    const mediaUrl =
      asset.mediaUrl || (await storageService.publicUrlForKey(asset.sourceKey));

    await storePrisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        mediaUrl,
        sourceKey: null,
        status: "READY",
        errorMessage: null,
        durationMs: Math.round(metadata.durationSeconds * 1000),
        width: metadata.width,
        height: metadata.height,
      },
    });
    const posterAssignment = await storePrisma.mediaAsset.updateMany({
      where: { id: assetId, posterUrl: null },
      data: { posterUrl },
    });

    if (posterAssignment.count === 0) {
      await storageService.deleteFile(posterUrl);
      posterUrl = null;
    }

    return await storePrisma.mediaAsset.findUniqueOrThrow({
      where: { id: assetId },
    });
  } catch (error) {
    if (posterUrl) await storageService.deleteFile(posterUrl);
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
