ALTER TABLE "raffle_draw_reminder_campaigns"
  ADD COLUMN "scheduled_for" TIMESTAMP(3);

CREATE INDEX "raffle_draw_reminder_campaigns_scheduled_for_idx"
  ON "raffle_draw_reminder_campaigns"("scheduled_for");
