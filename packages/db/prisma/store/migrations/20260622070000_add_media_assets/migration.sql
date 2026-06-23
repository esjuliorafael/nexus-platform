-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('processing', 'ready', 'failed');

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "media_url" TEXT,
    "poster_url" TEXT,
    "source_key" TEXT,
    "media_type" "MediaType" NOT NULL,
    "mime_type" TEXT NOT NULL,
    "original_name" TEXT,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'processing',
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_assets_media_url_key" ON "media_assets"("media_url");
CREATE INDEX "media_assets_status_created_at_idx" ON "media_assets"("status", "created_at");

ALTER TABLE "products" ADD COLUMN "cover_asset_id" UUID;
ALTER TABLE "product_gallery" ADD COLUMN "asset_id" UUID;
ALTER TABLE "media" ADD COLUMN "asset_id" UUID;
ALTER TABLE "home_slides" ADD COLUMN "asset_id" UUID;

-- Preserve every existing object as a ready asset. Existing product thumbnails
-- are intentionally treated as photos because the old schema could not prove
-- whether they were photos or posters for a gallery video.
INSERT INTO "media_assets" (
    "id", "media_url", "media_type", "mime_type", "status", "updated_at"
)
SELECT
    gen_random_uuid(),
    "thumbnail",
    'photo'::"MediaType",
    CASE
        WHEN lower("thumbnail") ~ '\.png([?#].*)?$' THEN 'image/png'
        WHEN lower("thumbnail") ~ '\.gif([?#].*)?$' THEN 'image/gif'
        WHEN lower("thumbnail") ~ '\.svg([?#].*)?$' THEN 'image/svg+xml'
        WHEN lower("thumbnail") ~ '\.webp([?#].*)?$' THEN 'image/webp'
        ELSE 'image/jpeg'
    END,
    'ready'::"MediaAssetStatus",
    CURRENT_TIMESTAMP
FROM "products"
WHERE "thumbnail" IS NOT NULL AND btrim("thumbnail") <> ''
ON CONFLICT ("media_url") DO NOTHING;

INSERT INTO "media_assets" (
    "id", "media_url", "media_type", "mime_type", "status", "updated_at"
)
SELECT
    gen_random_uuid(),
    "file_path",
    "file_type",
    CASE
        WHEN "file_type" = 'video'::"MediaType" AND lower("file_path") ~ '\.mov([?#].*)?$' THEN 'video/quicktime'
        WHEN "file_type" = 'video'::"MediaType" AND lower("file_path") ~ '\.webm([?#].*)?$' THEN 'video/webm'
        WHEN "file_type" = 'video'::"MediaType" THEN 'video/mp4'
        WHEN lower("file_path") ~ '\.png([?#].*)?$' THEN 'image/png'
        WHEN lower("file_path") ~ '\.webp([?#].*)?$' THEN 'image/webp'
        ELSE 'image/jpeg'
    END,
    'ready'::"MediaAssetStatus",
    CURRENT_TIMESTAMP
FROM "product_gallery"
WHERE btrim("file_path") <> ''
ON CONFLICT ("media_url") DO NOTHING;

INSERT INTO "media_assets" (
    "id", "media_url", "media_type", "mime_type", "status", "updated_at"
)
SELECT
    gen_random_uuid(),
    "file_path",
    "type",
    CASE
        WHEN "type" = 'video'::"MediaType" AND lower("file_path") ~ '\.mov([?#].*)?$' THEN 'video/quicktime'
        WHEN "type" = 'video'::"MediaType" AND lower("file_path") ~ '\.webm([?#].*)?$' THEN 'video/webm'
        WHEN "type" = 'video'::"MediaType" THEN 'video/mp4'
        WHEN lower("file_path") ~ '\.png([?#].*)?$' THEN 'image/png'
        WHEN lower("file_path") ~ '\.webp([?#].*)?$' THEN 'image/webp'
        ELSE 'image/jpeg'
    END,
    'ready'::"MediaAssetStatus",
    CURRENT_TIMESTAMP
FROM "media"
WHERE btrim("file_path") <> ''
ON CONFLICT ("media_url") DO NOTHING;

INSERT INTO "media_assets" (
    "id", "media_url", "poster_url", "media_type", "mime_type", "status", "updated_at"
)
SELECT
    gen_random_uuid(),
    "media_url",
    "poster_url",
    "type",
    CASE
        WHEN "type" = 'video'::"MediaType" AND lower("media_url") ~ '\.mov([?#].*)?$' THEN 'video/quicktime'
        WHEN "type" = 'video'::"MediaType" AND lower("media_url") ~ '\.webm([?#].*)?$' THEN 'video/webm'
        WHEN "type" = 'video'::"MediaType" THEN 'video/mp4'
        WHEN lower("media_url") ~ '\.png([?#].*)?$' THEN 'image/png'
        WHEN lower("media_url") ~ '\.webp([?#].*)?$' THEN 'image/webp'
        ELSE 'image/jpeg'
    END,
    'ready'::"MediaAssetStatus",
    CURRENT_TIMESTAMP
FROM "home_slides"
WHERE btrim("media_url") <> ''
ON CONFLICT ("media_url") DO UPDATE
SET "poster_url" = COALESCE("media_assets"."poster_url", EXCLUDED."poster_url");

UPDATE "products" AS product
SET "cover_asset_id" = asset."id"
FROM "media_assets" AS asset
WHERE asset."media_url" = product."thumbnail";

UPDATE "product_gallery" AS item
SET "asset_id" = asset."id"
FROM "media_assets" AS asset
WHERE asset."media_url" = item."file_path";

UPDATE "media" AS entry
SET "asset_id" = asset."id"
FROM "media_assets" AS asset
WHERE asset."media_url" = entry."file_path";

UPDATE "home_slides" AS slide
SET "asset_id" = asset."id"
FROM "media_assets" AS asset
WHERE asset."media_url" = slide."media_url";

ALTER TABLE "product_gallery" ALTER COLUMN "asset_id" SET NOT NULL;
ALTER TABLE "media" ALTER COLUMN "asset_id" SET NOT NULL;
ALTER TABLE "home_slides" ALTER COLUMN "asset_id" SET NOT NULL;

CREATE INDEX "products_cover_asset_id_idx" ON "products"("cover_asset_id");
CREATE INDEX "product_gallery_asset_id_idx" ON "product_gallery"("asset_id");
CREATE INDEX "media_asset_id_idx" ON "media"("asset_id");
CREATE INDEX "home_slides_asset_id_idx" ON "home_slides"("asset_id");

ALTER TABLE "products"
    ADD CONSTRAINT "products_cover_asset_id_fkey"
    FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_gallery"
    ADD CONSTRAINT "product_gallery_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "media"
    ADD CONSTRAINT "media_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "home_slides"
    ADD CONSTRAINT "home_slides_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "products" DROP COLUMN "thumbnail";
ALTER TABLE "product_gallery" DROP COLUMN "file_path", DROP COLUMN "file_type";
ALTER TABLE "media" DROP COLUMN "file_path", DROP COLUMN "type";
ALTER TABLE "home_slides" DROP COLUMN "media_url", DROP COLUMN "poster_url", DROP COLUMN "type";
