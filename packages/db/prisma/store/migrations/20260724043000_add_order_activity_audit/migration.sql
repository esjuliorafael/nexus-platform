ALTER TABLE "order_events"
  ADD COLUMN "actor_type" TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "actor_user_id" INTEGER,
  ADD COLUMN "actor_name" TEXT,
  ADD COLUMN "actor_role" TEXT,
  ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "previous_state" JSONB,
  ADD COLUMN "next_state" JSONB,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "ip_address" TEXT,
  ADD COLUMN "user_agent" TEXT,
  ADD COLUMN "request_id" TEXT;

ALTER TABLE "order_events"
  ADD CONSTRAINT "order_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "order_events_actor_user_id_created_at_idx"
  ON "order_events"("actor_user_id", "created_at");
