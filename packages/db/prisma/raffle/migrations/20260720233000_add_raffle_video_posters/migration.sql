ALTER TABLE "raffles"
  ADD COLUMN "image_type" "MediaType" NOT NULL DEFAULT 'photo',
  ADD COLUMN "image_poster" TEXT;

ALTER TABLE "raffle_gallery"
  ADD COLUMN "poster_path" TEXT;
