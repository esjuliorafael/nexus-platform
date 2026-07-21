ALTER TABLE "ticket_sales"
ADD COLUMN "mp_refund_id" TEXT,
ADD COLUMN "mp_refunded_amount" DECIMAL(10, 2),
ADD COLUMN "mp_refunded_at" TIMESTAMP(3);
