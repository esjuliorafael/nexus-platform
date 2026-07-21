CREATE TYPE "RaffleCouponDiscountType" AS ENUM ('percentage', 'fixed');

CREATE TABLE "raffle_coupons" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT,
  "discount_type" "RaffleCouponDiscountType" NOT NULL,
  "discount_value" DECIMAL(12,2) NOT NULL,
  "raffle_id" INTEGER,
  "min_tickets" INTEGER,
  "max_discount" DECIMAL(12,2),
  "usage_limit" INTEGER,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "starts_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "raffle_coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raffle_coupons_code_key" ON "raffle_coupons"("code");
CREATE INDEX "raffle_coupons_raffle_id_active_idx" ON "raffle_coupons"("raffle_id", "active");

ALTER TABLE "ticket_sales" ADD COLUMN "coupon_id" INTEGER;
ALTER TABLE "ticket_sales" ADD COLUMN "coupon_code" TEXT;
ALTER TABLE "ticket_sales" ADD COLUMN "discount_total" DECIMAL(12,2) NOT NULL DEFAULT 0.00;
CREATE INDEX "ticket_sales_coupon_id_idx" ON "ticket_sales"("coupon_id");
ALTER TABLE "raffle_coupons" ADD CONSTRAINT "raffle_coupons_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_sales" ADD CONSTRAINT "ticket_sales_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "raffle_coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
