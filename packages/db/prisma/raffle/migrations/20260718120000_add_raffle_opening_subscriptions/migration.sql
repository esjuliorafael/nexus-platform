CREATE TYPE "RaffleOpeningSubscriptionStatus" AS ENUM (
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled'
);

CREATE TABLE "raffle_opening_subscriptions" (
  "id" TEXT NOT NULL,
  "raffle_id" INTEGER NOT NULL,
  "phone" TEXT NOT NULL,
  "status" "RaffleOpeningSubscriptionStatus" NOT NULL DEFAULT 'pending',
  "consent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "raffle_opening_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raffle_opening_subscriptions_raffle_id_phone_key"
  ON "raffle_opening_subscriptions"("raffle_id", "phone");

CREATE INDEX "raffle_opening_subscriptions_status_raffle_id_idx"
  ON "raffle_opening_subscriptions"("status", "raffle_id");

ALTER TABLE "raffle_opening_subscriptions"
  ADD CONSTRAINT "raffle_opening_subscriptions_raffle_id_fkey"
  FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
