ALTER TABLE "raffle_prizes"
  ADD COLUMN "result_source" TEXT NOT NULL DEFAULT 'MAJOR_PRIZE',
  ADD COLUMN "result_source_label" TEXT,
  ADD COLUMN "result_reference_number" TEXT,
  ADD COLUMN "winning_number" TEXT,
  ADD COLUMN "winning_ticket_number" TEXT,
  ADD COLUMN "winning_participation_id" TEXT,
  ADD COLUMN "result_resolution_status" TEXT,
  ADD COLUMN "result_published_at" TIMESTAMP(3);

UPDATE "raffle_prizes"
SET "result_source" = CASE
  WHEN "position" = 1 THEN 'MAJOR_PRIZE'
  WHEN "position" = 2 THEN 'SECOND_PRIZE'
  WHEN "position" = 3 THEN 'THIRD_PRIZE'
  ELSE 'CUSTOM'
END;

CREATE INDEX "raffle_prizes_raffle_id_result_published_at_idx"
  ON "raffle_prizes"("raffle_id", "result_published_at");
