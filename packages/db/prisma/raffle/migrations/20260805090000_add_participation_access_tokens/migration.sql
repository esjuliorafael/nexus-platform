CREATE TABLE "raffle_participation_access_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "raffle_id" INTEGER NOT NULL,
  "phone_hash" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "raffle_participation_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raffle_participation_access_tokens_token_hash_key"
  ON "raffle_participation_access_tokens"("token_hash");
CREATE INDEX "raffle_participation_access_tokens_raffle_phone_idx"
  ON "raffle_participation_access_tokens"("raffle_id", "phone_hash");
CREATE INDEX "raffle_participation_access_tokens_raffle_expiry_idx"
  ON "raffle_participation_access_tokens"("raffle_id", "expires_at");

ALTER TABLE "raffle_participation_access_tokens"
  ADD CONSTRAINT "raffle_participation_access_tokens_raffle_id_fkey"
  FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
