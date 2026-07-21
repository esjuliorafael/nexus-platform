DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "raffle_opportunities"
    GROUP BY "raffle_id", "main_ticket_number"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce raffle opportunity uniqueness: duplicate main ticket numbers exist';
  END IF;
END $$;

CREATE UNIQUE INDEX "raffle_opportunities_raffle_main_ticket_key"
ON "raffle_opportunities"("raffle_id", "main_ticket_number");
