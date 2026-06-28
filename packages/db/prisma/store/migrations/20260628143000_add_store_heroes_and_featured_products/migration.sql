-- CreateEnum
CREATE TYPE "StoreHeroScope" AS ENUM ('all', 'item', 'bird');

-- AlterTable
ALTER TABLE "products"
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "featured_order" INTEGER;

-- CreateTable
CREATE TABLE "store_heroes" (
    "id" SERIAL NOT NULL,
    "scope" "StoreHeroScope" NOT NULL,
    "asset_id" UUID NOT NULL,
    "desktop_object_position" TEXT NOT NULL DEFAULT '50% 50%',
    "mobile_object_position" TEXT NOT NULL DEFAULT '50% 50%',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_heroes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_heroes_scope_sort_order_key" ON "store_heroes"("scope", "sort_order");

-- CreateIndex
CREATE INDEX "store_heroes_asset_id_idx" ON "store_heroes"("asset_id");

-- CreateIndex
CREATE INDEX "store_heroes_scope_active_sort_order_idx" ON "store_heroes"("scope", "active", "sort_order");

-- CreateIndex
CREATE INDEX "products_type_featured_featured_order_idx" ON "products"("type", "featured", "featured_order");

-- AddForeignKey
ALTER TABLE "store_heroes" ADD CONSTRAINT "store_heroes_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
