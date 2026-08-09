CREATE TABLE "raffle_participation_lookup_challenges" (
  "id" UUID NOT NULL,
  "raffle_id" INTEGER NOT NULL,
  "phone_hash" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "raffle_participation_lookup_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "raffle_participation_lookup_challenges_raffle_id_phone_hash_expires_at_idx"
  ON "raffle_participation_lookup_challenges"("raffle_id", "phone_hash", "expires_at");

CREATE INDEX "raffle_participation_lookup_challenges_expires_at_idx"
  ON "raffle_participation_lookup_challenges"("expires_at");

ALTER TABLE "raffle_participation_lookup_challenges"
  ADD CONSTRAINT "raffle_participation_lookup_challenges_raffle_id_fkey"
  FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
