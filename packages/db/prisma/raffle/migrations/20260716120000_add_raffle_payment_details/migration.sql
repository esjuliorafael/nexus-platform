ALTER TABLE "ticket_sales"
ADD COLUMN "mp_payment_id" TEXT,
ADD COLUMN "mp_seller_user_id" TEXT,
ADD COLUMN "mp_payment_status" TEXT,
ADD COLUMN "mp_payment_status_detail" TEXT,
ADD COLUMN "mp_payment_method_id" TEXT,
ADD COLUMN "mp_payment_type_id" TEXT,
ADD COLUMN "mp_paid_amount" DECIMAL(10, 2);

CREATE INDEX "ticket_sales_mp_payment_id_idx"
ON "ticket_sales"("mp_payment_id");
