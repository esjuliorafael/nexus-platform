ALTER TABLE "raffles"
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "featured_order" INTEGER;

CREATE INDEX "raffles_featured_featured_order_idx"
ON "raffles"("featured", "featured_order");
