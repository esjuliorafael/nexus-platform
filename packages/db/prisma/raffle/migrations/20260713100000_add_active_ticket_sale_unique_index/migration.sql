-- A ticket may be sold again after a cancelled reservation, but it must never
-- have more than one active reservation or payment in the same raffle.
CREATE UNIQUE INDEX "ticket_sales_active_raffle_ticket_unique"
ON "ticket_sales" ("raffle_id", "ticket_number")
WHERE "payment_status" IN ('pending', 'paid');
