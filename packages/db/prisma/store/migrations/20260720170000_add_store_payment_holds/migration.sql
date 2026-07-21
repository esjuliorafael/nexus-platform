CREATE TYPE "PaymentHoldStatus" AS ENUM ('active', 'processing', 'consumed', 'expired', 'cancelled');

CREATE TABLE "store_payment_holds" (
  "id" UUID NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT NOT NULL,
  "customer_email" TEXT,
  "receiver_name" TEXT,
  "delivery_type" "DeliveryType" NOT NULL DEFAULT 'shipping',
  "delivery_method" TEXT,
  "shipping_address" TEXT,
  "shipping_street" TEXT,
  "shipping_neighborhood" TEXT,
  "shipping_postal_code" TEXT,
  "shipping_city" TEXT,
  "shipping_state" TEXT,
  "subtotal" DECIMAL(65,30) NOT NULL,
  "discount_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "shipping_cost" DECIMAL(65,30) NOT NULL,
  "total" DECIMAL(65,30) NOT NULL,
  "coupon_id" INTEGER,
  "coupon_code" TEXT,
  "status" "PaymentHoldStatus" NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "promoted_order_id" INTEGER,
  "mp_payment_id" TEXT,
  "mp_seller_user_id" TEXT,
  "mp_payment_status" TEXT,
  "mp_payment_status_detail" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_payment_holds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_payment_hold_items" (
  "id" SERIAL NOT NULL,
  "hold_id" UUID NOT NULL,
  "product_id" INTEGER NOT NULL,
  "product_name" TEXT NOT NULL,
  "product_type" "ProductType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(65,30) NOT NULL,
  CONSTRAINT "store_payment_hold_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "order_payment_attempts" ALTER COLUMN "order_id" DROP NOT NULL;
ALTER TABLE "order_payment_attempts" ADD COLUMN "hold_id" UUID;

CREATE UNIQUE INDEX "store_payment_holds_promoted_order_id_key" ON "store_payment_holds"("promoted_order_id");
CREATE INDEX "store_payment_holds_status_expires_at_idx" ON "store_payment_holds"("status", "expires_at");
CREATE INDEX "store_payment_holds_mp_payment_id_idx" ON "store_payment_holds"("mp_payment_id");
CREATE INDEX "store_payment_hold_items_hold_id_idx" ON "store_payment_hold_items"("hold_id");
CREATE INDEX "order_payment_attempts_hold_id_created_at_idx" ON "order_payment_attempts"("hold_id", "created_at");

ALTER TABLE "store_payment_holds" ADD CONSTRAINT "store_payment_holds_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "store_payment_holds" ADD CONSTRAINT "store_payment_holds_promoted_order_id_fkey" FOREIGN KEY ("promoted_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "store_payment_hold_items" ADD CONSTRAINT "store_payment_hold_items_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "store_payment_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_payment_hold_items" ADD CONSTRAINT "store_payment_hold_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_payment_attempts" ADD CONSTRAINT "order_payment_attempts_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "store_payment_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
