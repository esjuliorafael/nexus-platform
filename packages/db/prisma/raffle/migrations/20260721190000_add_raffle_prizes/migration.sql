CREATE TABLE "raffle_prizes" (
    "id" SERIAL NOT NULL,
    "raffle_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "winner_rule" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raffle_prizes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raffle_prizes_raffle_id_position_key"
ON "raffle_prizes"("raffle_id", "position");

CREATE INDEX "raffle_prizes_raffle_id_position_idx"
ON "raffle_prizes"("raffle_id", "position");

ALTER TABLE "raffle_prizes"
ADD CONSTRAINT "raffle_prizes_raffle_id_fkey"
FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
