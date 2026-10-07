CREATE TABLE "store_assisted_checkout_links" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_assisted_checkout_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_assisted_checkout_links_token_hash_key"
    ON "store_assisted_checkout_links"("token_hash");

CREATE INDEX "store_assisted_checkout_links_expires_at_used_at_idx"
    ON "store_assisted_checkout_links"("expires_at", "used_at");

ALTER TABLE "store_assisted_checkout_links"
    ADD CONSTRAINT "store_assisted_checkout_links_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
