CREATE TYPE "RaffleCommunicationKind" AS ENUM ('DRAW_REMINDER', 'DATE_CHANGE');

ALTER TABLE "raffle_draw_reminder_campaigns"
  ADD COLUMN "kind" "RaffleCommunicationKind" NOT NULL DEFAULT 'DRAW_REMINDER',
  ADD COLUMN "previous_draw_date" TIMESTAMP(3);

DROP INDEX IF EXISTS "raffle_draw_reminder_campaigns_raffle_id_draw_date_key";
CREATE UNIQUE INDEX "raffle_draw_reminder_campaigns_raffle_id_draw_date_kind_key"
  ON "raffle_draw_reminder_campaigns"("raffle_id", "draw_date", "kind");
