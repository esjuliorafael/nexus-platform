CREATE TYPE "CouponDiscountType" AS ENUM ('percentage', 'fixed');
CREATE TYPE "CouponScope" AS ENUM ('all', 'item', 'bird');

CREATE TABLE "coupons" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT,
  "discount_type" "CouponDiscountType" NOT NULL,
  "discount_value" DECIMAL(65,30) NOT NULL,
  "scope" "CouponScope" NOT NULL DEFAULT 'all',
  "min_subtotal" DECIMAL(65,30),
  "max_discount" DECIMAL(65,30),
  "usage_limit" INTEGER,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "starts_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_active_starts_at_expires_at_idx" ON "coupons"("active", "starts_at", "expires_at");

ALTER TABLE "orders" ADD COLUMN "discount_total" DECIMAL(65,30) NOT NULL DEFAULT 0.00;
ALTER TABLE "orders" ADD COLUMN "coupon_id" INTEGER;
ALTER TABLE "orders" ADD COLUMN "coupon_code" TEXT;

CREATE INDEX "orders_coupon_id_idx" ON "orders"("coupon_id");

ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey"
  FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
