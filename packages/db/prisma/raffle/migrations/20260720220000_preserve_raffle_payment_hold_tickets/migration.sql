ALTER TABLE "raffle_payment_holds"
ADD COLUMN "ticket_numbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "raffle_payment_holds" AS hold
SET "ticket_numbers" = snapshot."ticket_numbers"
FROM (
  SELECT
    "hold_id",
    ARRAY_AGG("ticket_number" ORDER BY "ticket_number") AS "ticket_numbers"
  FROM "raffle_payment_hold_tickets"
  GROUP BY "hold_id"
) AS snapshot
WHERE hold."id" = snapshot."hold_id";
