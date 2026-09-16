ALTER TABLE "raffles"
  ADD COLUMN "shared_participation_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "shared_participation_activated_at" TIMESTAMP(3);

CREATE TYPE "RaffleParticipationMode" AS ENUM ('full', 'shared');

ALTER TABLE "ticket_sales"
  ADD COLUMN "participation_mode" "RaffleParticipationMode" NOT NULL DEFAULT 'full',
  ADD COLUMN "share_index" INTEGER,
  ADD COLUMN "share_group_id" UUID;

ALTER TABLE "raffle_payment_holds"
  ADD COLUMN "participation_mode" "RaffleParticipationMode" NOT NULL DEFAULT 'full';

ALTER TABLE "raffle_payment_hold_tickets"
  ADD COLUMN "share_index" INTEGER,
  ADD COLUMN "share_group_id" UUID;

ALTER TABLE "ticket_sales"
  ADD CONSTRAINT "ticket_sales_shared_participation_check"
  CHECK (
    ("participation_mode" = 'full' AND "share_index" IS NULL AND "share_group_id" IS NULL)
    OR
    ("participation_mode" = 'shared' AND "share_index" IN (1, 2) AND "share_group_id" IS NOT NULL)
  );

ALTER TABLE "raffle_payment_holds"
  ADD CONSTRAINT "raffle_payment_holds_participation_mode_check"
  CHECK ("participation_mode" IN ('full', 'shared'));

ALTER TABLE "raffle_payment_hold_tickets"
  ADD CONSTRAINT "raffle_payment_hold_tickets_shared_participation_check"
  CHECK (
    ("share_index" IS NULL AND "share_group_id" IS NULL)
    OR
    ("share_index" IN (1, 2) AND "share_group_id" IS NOT NULL)
  );

DROP INDEX IF EXISTS "ticket_sales_active_raffle_ticket_unique";
CREATE UNIQUE INDEX "ticket_sales_active_full_raffle_ticket_unique"
  ON "ticket_sales" ("raffle_id", "ticket_number")
  WHERE "payment_status" IN ('pending', 'paid') AND "share_index" IS NULL;
CREATE UNIQUE INDEX "ticket_sales_active_shared_raffle_ticket_share_unique"
  ON "ticket_sales" ("raffle_id", "ticket_number", "share_index")
  WHERE "payment_status" IN ('pending', 'paid') AND "share_index" IS NOT NULL;

DROP INDEX IF EXISTS "raffle_payment_hold_tickets_raffle_id_ticket_number_key";
CREATE UNIQUE INDEX "raffle_payment_hold_tickets_active_full_raffle_ticket_unique"
  ON "raffle_payment_hold_tickets" ("raffle_id", "ticket_number")
  WHERE "share_index" IS NULL;
CREATE UNIQUE INDEX "raffle_payment_hold_tickets_active_shared_raffle_ticket_share_unique"
  ON "raffle_payment_hold_tickets" ("raffle_id", "ticket_number", "share_index")
  WHERE "share_index" IS NOT NULL;
