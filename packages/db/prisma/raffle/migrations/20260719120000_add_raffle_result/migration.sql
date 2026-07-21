ALTER TABLE "raffles"
ADD COLUMN "winning_number" TEXT,
ADD COLUMN "result_published_at" TIMESTAMP(3);

CREATE INDEX "raffles_result_published_at_idx"
ON "raffles"("result_published_at");
