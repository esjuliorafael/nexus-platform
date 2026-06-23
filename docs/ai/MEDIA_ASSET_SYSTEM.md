# Nexus Media Asset System

## Purpose

`MediaAsset` is the single source of truth for uploaded images and videos. Domain
records reference an asset ID; they do not own or infer media URLs independently.

## Domain Relations

- `Product.coverAssetId` references the real product cover.
- `ProductGallery.assetId` references each secondary product medium.
- `Media.assetId` references an entry in the public gallery.
- `HomeSlide.assetId` references the slide background medium.

API responses expose semantic convenience fields:

- `mediaUrl`: the real image or normalized video.
- `posterUrl`: the static representation of a video; `null` for photos.
- `mediaType`: `PHOTO` or `VIDEO`.
- Product covers use `coverMediaUrl`, `coverPosterUrl`, and `coverMediaType`.

Do not infer media type from a URL extension.

## Storage Keys

New R2 objects use immutable UUID keys:

```text
media/YYYY/MM/<uuid>.webp
media/YYYY/MM/<uuid>.mp4
media/YYYY/MM/<uuid>-poster.webp
media/YYYY/MM/<uuid>-source.<ext>
```

The `-source` object is temporary and is deleted after successful video
normalization. Existing R2 objects keep their current URLs.

## Upload Lifecycle

### Images

1. Stream multipart input to a temporary local file.
2. Detect the real format from file bytes.
3. Apply EXIF rotation, constrain dimensions to 2000x2000, and encode WebP.
4. Upload the UUID object to R2.
5. Create a `READY` `MediaAsset`.

### Videos

1. Stream multipart input to a temporary local file.
2. Detect and validate the real container.
3. Upload a temporary UUID source object to R2.
4. Create a `PROCESSING` asset and enqueue one BullMQ job.
5. FFmpeg normalizes the video to MP4/H.264/AAC with `yuv420p` and fast start.
6. FFmpeg generates a WebP poster from a representative frame.
7. Upload normalized outputs, mark the asset `READY`, and delete the source.

The worker processes one video at a time per API instance to constrain VPS CPU
and memory usage. Failed jobs retry twice and finish as `FAILED` only after the
last attempt. The final failure also removes the temporary source object, even
when the browser that initiated the upload is no longer connected.

## Accepted Inputs

- Images: JPEG, PNG, WebP, GIF, HEIC, and HEIF.
- Videos: MP4, QuickTime/MOV, WebM, Matroska, 3GP, and 3G2.
- Maximum upload size: 500 MB.

The declared browser MIME type is not trusted; the API inspects file signatures.

## Posters

Every newly processed video must have a poster. The generated poster is the
default. ProductForm may replace it with a selected browser frame or a manually
uploaded image. Failure to extract frames in the browser must never block save;
the server poster remains the fallback.

## Reference And Deletion Rules

- Multiple domain records may reference the same asset.
- Removing one owner does not delete a shared object.
- R2 media, poster, temporary source, and the database row are deleted only after
  the final domain reference is removed.
- Raffle and identity settings use URL-based release because they live outside
  the Store relational ownership graph.
- Failed uploads are releasable and must not leave temporary R2 objects.

## Compatibility

The migration backfills existing product thumbnails, product gallery items,
gallery media, and home slides into `READY` assets without renaming R2 objects.
Historical product thumbnails are treated as photos because the old schema did
not reliably distinguish a photo cover from a video poster.

Temporary `thumbnail`, `filePath`, and `fileType` aliases remain in selected API
responses for rolling deployment compatibility. New code must use the semantic
asset fields.
