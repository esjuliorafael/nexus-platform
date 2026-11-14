CREATE TABLE "storefront_campaigns" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "eyebrow" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "cta_label" TEXT,
  "cta_href" TEXT,
  "theme" TEXT NOT NULL DEFAULT 'BRAND',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "coupon_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "storefront_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storefront_campaigns_coupon_id_key" ON "storefront_campaigns"("coupon_id");
CREATE INDEX "storefront_campaigns_active_starts_at_ends_at_idx" ON "storefront_campaigns"("active", "starts_at", "ends_at");

ALTER TABLE "storefront_campaigns"
ADD CONSTRAINT "storefront_campaigns_coupon_id_fkey"
FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
