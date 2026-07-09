ALTER TABLE "orders"
  ADD COLUMN "payment_method" TEXT NOT NULL DEFAULT 'TRANSFER',
  ADD COLUMN "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "payment_expires_at" TIMESTAMP(3),
  ADD COLUMN "mp_payment_id" TEXT,
  ADD COLUMN "mp_seller_user_id" TEXT,
  ADD COLUMN "mp_payment_status" TEXT,
  ADD COLUMN "mp_payment_status_detail" TEXT,
  ADD COLUMN "mp_payment_method_id" TEXT,
  ADD COLUMN "mp_payment_type_id" TEXT,
  ADD COLUMN "mp_paid_amount" DECIMAL(65,30),
  ADD COLUMN "mp_refund_id" TEXT,
  ADD COLUMN "mp_refunded_amount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
  ADD COLUMN "mp_refunded_at" TIMESTAMP(3);

CREATE INDEX "orders_payment_method_payment_status_idx"
  ON "orders"("payment_method", "payment_status");
