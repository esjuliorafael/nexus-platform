ALTER TABLE "store_assisted_checkout_links"
  ADD COLUMN "opened_at" TIMESTAMP(3),
  ADD COLUMN "revoked_at" TIMESTAMP(3),
  ADD COLUMN "created_by_user_id" INTEGER,
  ADD COLUMN "revoked_by_user_id" INTEGER,
  ADD COLUMN "claimed_hold_id" UUID;

CREATE UNIQUE INDEX "store_assisted_checkout_links_claimed_hold_id_key"
  ON "store_assisted_checkout_links"("claimed_hold_id");

CREATE INDEX "store_assisted_checkout_links_expires_at_used_at_revoked_at_idx"
  ON "store_assisted_checkout_links"("expires_at", "used_at", "revoked_at");

CREATE INDEX "store_assisted_checkout_links_product_id_expires_at_revoked_at_idx"
  ON "store_assisted_checkout_links"("product_id", "expires_at", "revoked_at");

CREATE INDEX "store_assisted_checkout_links_created_by_user_id_created_at_idx"
  ON "store_assisted_checkout_links"("created_by_user_id", "created_at");

ALTER TABLE "store_assisted_checkout_links"
  ADD CONSTRAINT "store_assisted_checkout_links_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "store_assisted_checkout_links"
  ADD CONSTRAINT "store_assisted_checkout_links_revoked_by_user_id_fkey"
  FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "store_assisted_checkout_links"
  ADD CONSTRAINT "store_assisted_checkout_links_claimed_hold_id_fkey"
  FOREIGN KEY ("claimed_hold_id") REFERENCES "store_payment_holds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
