CREATE TABLE "raffle_participation_events" (
  "id" SERIAL NOT NULL,
  "participation_id" TEXT NOT NULL,
  "raffle_id" INTEGER NOT NULL,
  "event_type" TEXT NOT NULL,
  "message" TEXT,
  "actor_type" TEXT NOT NULL DEFAULT 'SYSTEM',
  "actor_user_id" INTEGER,
  "actor_name" TEXT,
  "actor_role" TEXT,
  "origin" TEXT NOT NULL DEFAULT 'SYSTEM',
  "previous_state" JSONB,
  "next_state" JSONB,
  "metadata" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "request_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "raffle_participation_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "raffle_participation_events"
  ADD CONSTRAINT "raffle_participation_events_raffle_id_fkey"
  FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "raffle_participation_events_participation_id_created_at_idx"
  ON "raffle_participation_events"("participation_id", "created_at");

CREATE INDEX "raffle_participation_events_actor_user_id_created_at_idx"
  ON "raffle_participation_events"("actor_user_id", "created_at");
