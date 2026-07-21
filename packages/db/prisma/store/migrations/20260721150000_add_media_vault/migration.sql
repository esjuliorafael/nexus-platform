CREATE TABLE "media_vault_items" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "uploaded_by_id" INTEGER,
    "uploaded_by_name" TEXT NOT NULL,
    "download_name" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "downloaded_at" TIMESTAMP(3),
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_vault_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_vault_items_asset_id_key" ON "media_vault_items"("asset_id");
CREATE INDEX "media_vault_items_expires_at_idx" ON "media_vault_items"("expires_at");
CREATE INDEX "media_vault_items_uploaded_by_id_created_at_idx" ON "media_vault_items"("uploaded_by_id", "created_at");

ALTER TABLE "media_vault_items"
ADD CONSTRAINT "media_vault_items_asset_id_fkey"
FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "media_vault_items"
ADD CONSTRAINT "media_vault_items_uploaded_by_id_fkey"
FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
