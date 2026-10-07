CREATE TABLE "store_assisted_checkout_link_items" (
  "id" UUID NOT NULL,
  "link_id" UUID NOT NULL,
  "product_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "store_assisted_checkout_link_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_assisted_checkout_link_items_link_id_product_id_key"
  ON "store_assisted_checkout_link_items"("link_id", "product_id");

CREATE INDEX "store_assisted_checkout_link_items_product_id_idx"
  ON "store_assisted_checkout_link_items"("product_id");

ALTER TABLE "store_assisted_checkout_link_items"
  ADD CONSTRAINT "store_assisted_checkout_link_items_link_id_fkey"
  FOREIGN KEY ("link_id") REFERENCES "store_assisted_checkout_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_assisted_checkout_link_items"
  ADD CONSTRAINT "store_assisted_checkout_link_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
