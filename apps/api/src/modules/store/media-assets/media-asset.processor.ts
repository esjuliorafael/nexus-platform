import { execFile } from "child_process";
import { createReadStream } from "fs";
import { mkdtemp, readFile, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import { storePrisma } from "@nexus/db/store";
import { storageService } from "../../../services/storage.service";
import { createStorageKey } from "../../../utils/file.utils";

const execFileAsync = promisify(execFile);
const ffprobePath = (require("ffprobe-static") as { path: string }).path;
const ffmpegThreads = String(
  Math.max(
    1,
    Math.min(4, Number(process.env.MEDIA_PROCESSING_FFMPEG_THREADS) || 2),
  ),
);

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
    [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      inputPath,
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const result = JSON.parse(stdout) as ProbeResult;
  const videoStream = result.streams?.find(
    (stream) => stream.codec_type === "video",
  );
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

export async function processVideoAsset(assetId: string, revision = "v1") {
  if (!ffmpegPath) throw new Error("FFmpeg no esta disponible");

  const asset = await storePrisma.mediaAsset.findUnique({
    where: { id: assetId },
  });
  if (!asset || !asset.sourceKey) throw new Error("Asset de video incompleto");

  const workDir = await mkdtemp(path.join(tmpdir(), "nexus-media-"));
  const sourceExtension = path.extname(asset.sourceKey) || ".bin";
  const inputPath = path.join(workDir, `source${sourceExtension}`);
  const posterPath = path.join(workDir, "poster.webp");
  const webVideoPath = path.join(workDir, "video-web.mp4");
  const posterKey = createStorageKey(asset.id, "webp", "-poster");
  const safeRevision =
    revision.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16) || "v1";
  const webVideoKey = createStorageKey(asset.id, "mp4", `-web-${safeRevision}`);
  let generatedPosterUrl: string | null = null;
  let generatedPosterCommitted = false;
  let webVideoUrl: string | null = null;
  let renditionCommitted = false;

  try {
    await storageService.downloadObjectToFile(asset.sourceKey, inputPath);
    const metadata = await probeVideo(inputPath);

    if (!asset.posterUrl) {
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

      generatedPosterUrl = await storageService.uploadObject(
        await readFile(posterPath),
        posterKey,
        "image/webp",
      );

      const adoptedPoster = await storePrisma.mediaAsset.updateMany({
        where: { id: assetId, posterUrl: null },
        data: { posterUrl: generatedPosterUrl },
      });
      generatedPosterCommitted = adoptedPoster.count === 1;

      if (!generatedPosterCommitted) {
        await storageService.deleteFile(generatedPosterUrl);
        generatedPosterUrl = null;
      }
    }

    await run(ffmpegPath, [
      "-y",
      "-i",
      inputPath,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-map_metadata",
      "-1",
      "-map_chapters",
      "-1",
      "-filter_threads",
      ffmpegThreads,
      "-vf",
      "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos",
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-level:v",
      "4.0",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-threads",
      ffmpegThreads,
      "-crf",
      "23",
      "-maxrate",
      "5M",
      "-bufsize",
      "10M",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      webVideoPath,
    ]);

    const webVideoStats = await stat(webVideoPath);
    webVideoUrl = await storageService.uploadObject(
      createReadStream(webVideoPath),
      webVideoKey,
      "video/mp4",
    );
    const originalUrl = await storageService.publicUrlForKey(asset.sourceKey);
    const previousMediaUrl = asset.mediaUrl;

    const processedAsset = await storePrisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        mediaUrl: webVideoUrl,
        mimeType: "video/mp4",
        status: "READY",
        errorMessage: null,
        durationMs: Math.round(metadata.durationSeconds * 1000),
        width: metadata.width,
        height: metadata.height,
        sizeBytes: webVideoStats.size,
      },
    });
    renditionCommitted = true;

    if (
      previousMediaUrl &&
      previousMediaUrl !== originalUrl &&
      previousMediaUrl !== webVideoUrl
    ) {
      await storageService.deleteFile(previousMediaUrl);
    }

    return processedAsset;
  } catch (error) {
    if (!renditionCommitted) {
      if (generatedPosterUrl && !generatedPosterCommitted) {
        await storageService.deleteFile(generatedPosterUrl);
      }
      if (webVideoUrl) await storageService.deleteFile(webVideoUrl);
    }
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
