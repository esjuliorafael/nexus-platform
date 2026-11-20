ALTER TABLE "orders"
  ADD COLUMN "receiver_phone" TEXT;

ALTER TABLE "store_payment_holds"
  ADD COLUMN "receiver_phone" TEXT;
