ALTER TABLE "raffle_participation_access_tokens"
ADD COLUMN "participation_id" TEXT;

UPDATE "raffle_participation_access_tokens"
SET "participation_id" = 'legacy-' || "id"::text
WHERE "participation_id" IS NULL;

ALTER TABLE "raffle_participation_access_tokens"
ALTER COLUMN "participation_id" SET NOT NULL;

CREATE INDEX "raffle_participation_access_tokens_raffle_id_participation_id_idx"
ON "raffle_participation_access_tokens"("raffle_id", "participation_id");
