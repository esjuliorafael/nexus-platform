ALTER TABLE "ticket_sales"
ADD COLUMN "reservation_id" TEXT;

CREATE INDEX "ticket_sales_reservation_id_idx"
ON "ticket_sales" ("reservation_id");
