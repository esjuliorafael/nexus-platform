-- AlterTable
ALTER TABLE "products"
ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "products_active_published_idx" ON "products"("active", "published");
