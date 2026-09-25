CREATE TYPE "TicketFinancialStatus" AS ENUM ('recognized', 'not_recognized');

CREATE TYPE "TicketSaleOrigin" AS ENUM ('participant', 'operational_protection');

ALTER TABLE "ticket_sales"
  ADD COLUMN "financial_status" "TicketFinancialStatus" NOT NULL DEFAULT 'recognized',
  ADD COLUMN "origin" "TicketSaleOrigin" NOT NULL DEFAULT 'participant',
  ADD COLUMN "financial_status_reason" TEXT,
  ADD COLUMN "financial_status_note" TEXT,
  ADD COLUMN "financial_status_changed_at" TIMESTAMP(3),
  ADD COLUMN "financial_status_changed_by" INTEGER;

CREATE INDEX "ticket_sales_raffle_id_financial_status_idx"
  ON "ticket_sales"("raffle_id", "financial_status");

CREATE INDEX "ticket_sales_origin_financial_status_idx"
  ON "ticket_sales"("origin", "financial_status");
