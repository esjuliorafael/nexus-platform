ALTER TABLE "orders"
  ADD COLUMN "paid_amount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
  ADD COLUMN "coupon_snapshot" JSONB;

ALTER TABLE "store_payment_holds"
  ADD COLUMN "coupon_snapshot" JSONB;

UPDATE "orders"
SET "paid_amount" = CASE
  WHEN UPPER("payment_status") IN ('APPROVED', 'PAID')
    THEN COALESCE("mp_paid_amount", "total")
  ELSE 0.00
END;
