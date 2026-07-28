ALTER TABLE "raffle_payment_holds"
  ADD COLUMN "recovery_token_hash" TEXT,
  ADD COLUMN "recovery_scheduled_at" TIMESTAMP(3),
  ADD COLUMN "recovery_sent_at" TIMESTAMP(3),
  ADD COLUMN "recovery_opened_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "raffle_payment_holds_recovery_token_hash_key"
  ON "raffle_payment_holds"("recovery_token_hash");
